import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";

/**
 * Robustly parse JSON from LLM output.
 * Handles: markdown code blocks, trailing commas, BOM, control chars.
 */
function parseJsonRobust(raw: string): any {
  // Strip markdown code fences
  let text = raw.trim();
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  // Remove BOM
  text = text.replace(/^\uFEFF/, "");

  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch (_) {
    // continue to cleanup
  }

  // Remove trailing commas before ] or }
  text = text.replace(/,\s*([\]}])/g, "$1");

  // Remove control characters except \n \r \t
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

  try {
    return JSON.parse(text);
  } catch (_) {
    // continue
  }

  // Last resort: find the first { ... } or [ ... ] block
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) {
    const cleaned = objMatch[0].replace(/,\s*([\]}])/g, "$1");
    try {
      return JSON.parse(cleaned);
    } catch (_) {
      // fall through
    }
  }

  throw new Error("Não foi possível interpretar a resposta da IA como JSON válido.");
}

const QUIZ_SYSTEM_PROMPT = (questionCount: number) => `Você é um especialista em elaboração de questões para concursos e provas militares, no estilo "Questionários APMBB" (Academia de Polícia Militar do Barro Branco). Sua tarefa é gerar questões de múltipla escolha com base no conteúdo fornecido.

REGRAS OBRIGATÓRIAS:
1. Gere exatamente ${questionCount} questões cobrindo TODO o conteúdo fornecido de forma abrangente.
2. Cada questão deve ter EXATAMENTE 5 alternativas: A, B, C, D e E.
3. Apenas UMA alternativa deve ser correta.
4. O enunciado deve ser claro, objetivo e no estilo de provas de concursos militares/policiais.
5. As alternativas incorretas devem ser plausíveis mas claramente erradas para quem estudou o conteúdo.
6. O gabarito comentado deve explicar POR QUE a alternativa correta está certa e POR QUE as demais estão erradas, fazendo referência ao conteúdo original.
7. Use linguagem formal e técnica adequada ao contexto militar/policial.
8. Varie os tipos de questão: conceituais, de aplicação, interpretativas e analíticas.

IMPORTANTE: Retorne APENAS JSON válido, sem comentários, sem trailing commas, sem texto antes ou depois.

FORMATO DE RESPOSTA (JSON estrito):
{"questions":[{"id":1,"statement":"Enunciado da questão","alternatives":[{"letter":"A","text":"Alternativa A"},{"letter":"B","text":"Alternativa B"},{"letter":"C","text":"Alternativa C"},{"letter":"D","text":"Alternativa D"},{"letter":"E","text":"Alternativa E"}],"correctAnswer":"B","explanation":"Gabarito comentado detalhado.","sourceReference":"Referência ao conteúdo"}]}`;

function validateQuestions(questions: any[]): any[] {
  return questions.map((q, i) => {
    const id = q.id ?? i + 1;
    const statement = q.statement || q.enunciado || q.question || "";
    const alternatives = Array.isArray(q.alternatives)
      ? q.alternatives.map((alt: any, j: number) => ({
          letter: alt.letter || String.fromCharCode(65 + j),
          text: alt.text || alt.texto || "",
        }))
      : [];
    const correctAnswer = q.correctAnswer || q.correct_answer || q.gabarito || "A";
    const explanation = q.explanation || q.explicacao || q.comentario || "Sem comentário disponível.";
    const sourceReference = q.sourceReference || q.source_reference || q.referencia || "";

    if (!statement) throw new Error(`Questão ${id} sem enunciado.`);
    if (alternatives.length < 2) throw new Error(`Questão ${id} com menos de 2 alternativas.`);

    return { id, statement, alternatives, correctAnswer, explanation, sourceReference };
  });
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  quiz: router({
    generateFromText: publicProcedure
      .input(
        z.object({
          text: z.string().min(10),
          fileName: z.string(),
          title: z.string().optional(),
          questionCount: z.number().min(5).max(30).default(10),
        })
      )
      .mutation(async ({ input }) => {
        const { text, fileName, title, questionCount } = input;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: QUIZ_SYSTEM_PROMPT(questionCount) },
            {
              role: "user",
              content: `Com base no seguinte conteúdo extraído do arquivo "${fileName}", gere ${questionCount} questões no estilo Questionários APMBB:\n\n${text.substring(0, 30000)}`,
            },
          ],
          response_format: { type: "json_object" },
        });

        const content = response.choices[0]?.message?.content;
        if (!content || typeof content !== "string") {
          throw new Error("Falha ao gerar questões: resposta vazia da IA");
        }

        const parsed = parseJsonRobust(content);
        const rawQuestions = parsed.questions || parsed;

        if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
          throw new Error("Falha ao gerar questões: formato inválido");
        }

        const questions = validateQuestions(rawQuestions);
        const quizId = `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        return {
          id: quizId,
          title: title || `Questionário - ${fileName}`,
          fileName,
          questions,
          createdAt: new Date().toISOString(),
        };
      }),

    uploadAndGenerate: publicProcedure
      .input(
        z.object({
          fileBase64: z.string(),
          fileName: z.string(),
          mimeType: z.string(),
          title: z.string().optional(),
          questionCount: z.number().min(5).max(30).default(10),
        })
      )
      .mutation(async ({ input }) => {
        const { fileBase64, fileName, mimeType, title, questionCount } = input;

        const buffer = Buffer.from(fileBase64, "base64");
        const fileKey = `uploads/${Date.now()}_${fileName}`;
        const { url: fileUrl } = await storagePut(fileKey, buffer, mimeType);

        const isPdf = mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
        const isPptx =
          mimeType ===
            "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
          mimeType === "application/vnd.ms-powerpoint" ||
          fileName.toLowerCase().endsWith(".pptx") ||
          fileName.toLowerCase().endsWith(".ppt");

        let extractionPrompt = "";
        if (isPdf) {
          extractionPrompt =
            "Extraia TODO o conteúdo textual deste arquivo PDF. Organize o texto de forma clara, mantendo a estrutura de tópicos, títulos e parágrafos. Retorne apenas o texto extraído, sem comentários adicionais.";
        } else if (isPptx) {
          extractionPrompt =
            "Extraia TODO o conteúdo textual desta apresentação PowerPoint. Para cada slide, identifique o título e o conteúdo. Organize de forma clara, indicando 'Slide X:' antes de cada slide. Retorne apenas o texto extraído, sem comentários adicionais.";
        } else {
          extractionPrompt =
            "Extraia TODO o conteúdo textual deste documento. Organize de forma clara e estruturada. Retorne apenas o texto extraído.";
        }

        const extractionResponse = await invokeLLM({
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: extractionPrompt },
                {
                  type: "file_url",
                  file_url: {
                    url: fileUrl,
                    mime_type: isPdf ? "application/pdf" : undefined,
                  },
                },
              ],
            },
          ],
        });

        const extractedText =
          typeof extractionResponse.choices[0]?.message?.content === "string"
            ? extractionResponse.choices[0].message.content
            : "";

        if (!extractedText || extractedText.length < 50) {
          throw new Error(
            "Não foi possível extrair texto suficiente do arquivo. Verifique se o arquivo contém texto legível."
          );
        }

        const quizResponse = await invokeLLM({
          messages: [
            { role: "system", content: QUIZ_SYSTEM_PROMPT(questionCount) },
            {
              role: "user",
              content: `Com base no seguinte conteúdo extraído do arquivo "${fileName}", gere ${questionCount} questões no estilo Questionários APMBB:\n\n${extractedText.substring(0, 30000)}`,
            },
          ],
          response_format: { type: "json_object" },
        });

        const quizContent = quizResponse.choices[0]?.message?.content;
        if (!quizContent || typeof quizContent !== "string") {
          throw new Error("Falha ao gerar questões: resposta vazia da IA");
        }

        const parsed = parseJsonRobust(quizContent);
        const rawQuestions = parsed.questions || parsed;

        if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
          throw new Error("Falha ao gerar questões: formato inválido");
        }

        const questions = validateQuestions(rawQuestions);
        const quizId = `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        return {
          id: quizId,
          title: title || `Questionário - ${fileName}`,
          fileName,
          questions,
          createdAt: new Date().toISOString(),
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
