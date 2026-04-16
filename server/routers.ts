import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";

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

        const systemPrompt = `Você é um especialista em elaboração de questões para concursos e provas militares, no estilo "Questionários APMBB" (Academia de Polícia Militar do Barro Branco). Sua tarefa é gerar questões de múltipla escolha com base no conteúdo fornecido.

REGRAS OBRIGATÓRIAS:
1. Gere exatamente ${questionCount} questões cobrindo TODO o conteúdo fornecido de forma abrangente.
2. Cada questão deve ter EXATAMENTE 5 alternativas: A, B, C, D e E.
3. Apenas UMA alternativa deve ser correta.
4. O enunciado deve ser claro, objetivo e no estilo de provas de concursos militares/policiais.
5. As alternativas incorretas devem ser plausíveis mas claramente erradas para quem estudou o conteúdo.
6. O gabarito comentado deve explicar POR QUE a alternativa correta está certa e POR QUE as demais estão erradas, fazendo referência ao conteúdo original.
7. Use linguagem formal e técnica adequada ao contexto militar/policial.
8. Varie os tipos de questão: conceituais, de aplicação, interpretativas e analíticas.

FORMATO DE RESPOSTA (JSON):
Retorne um array de objetos com a seguinte estrutura:
{
  "questions": [
    {
      "id": 1,
      "statement": "Enunciado da questão aqui",
      "alternatives": [
        {"letter": "A", "text": "Texto da alternativa A"},
        {"letter": "B", "text": "Texto da alternativa B"},
        {"letter": "C", "text": "Texto da alternativa C"},
        {"letter": "D", "text": "Texto da alternativa D"},
        {"letter": "E", "text": "Texto da alternativa E"}
      ],
      "correctAnswer": "B",
      "explanation": "Gabarito comentado detalhado aqui, explicando a resposta correta e por que as demais estão incorretas.",
      "sourceReference": "Referência ao trecho do conteúdo original"
    }
  ]
}`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
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

        const parsed = JSON.parse(content);
        const questions = parsed.questions || parsed;

        if (!Array.isArray(questions) || questions.length === 0) {
          throw new Error("Falha ao gerar questões: formato inválido");
        }

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

        const systemPrompt = `Você é um especialista em elaboração de questões para concursos e provas militares, no estilo "Questionários APMBB" (Academia de Polícia Militar do Barro Branco). Sua tarefa é gerar questões de múltipla escolha com base no conteúdo fornecido.

REGRAS OBRIGATÓRIAS:
1. Gere exatamente ${questionCount} questões cobrindo TODO o conteúdo fornecido de forma abrangente.
2. Cada questão deve ter EXATAMENTE 5 alternativas: A, B, C, D e E.
3. Apenas UMA alternativa deve ser correta.
4. O enunciado deve ser claro, objetivo e no estilo de provas de concursos militares/policiais.
5. As alternativas incorretas devem ser plausíveis mas claramente erradas para quem estudou o conteúdo.
6. O gabarito comentado deve explicar POR QUE a alternativa correta está certa e POR QUE as demais estão erradas, fazendo referência ao conteúdo original.
7. Use linguagem formal e técnica adequada ao contexto militar/policial.
8. Varie os tipos de questão: conceituais, de aplicação, interpretativas e analíticas.

FORMATO DE RESPOSTA (JSON):
{
  "questions": [
    {
      "id": 1,
      "statement": "Enunciado da questão aqui",
      "alternatives": [
        {"letter": "A", "text": "Texto da alternativa A"},
        {"letter": "B", "text": "Texto da alternativa B"},
        {"letter": "C", "text": "Texto da alternativa C"},
        {"letter": "D", "text": "Texto da alternativa D"},
        {"letter": "E", "text": "Texto da alternativa E"}
      ],
      "correctAnswer": "B",
      "explanation": "Gabarito comentado detalhado aqui.",
      "sourceReference": "Referência ao trecho do conteúdo original"
    }
  ]
}`;

        const quizResponse = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
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

        const parsed = JSON.parse(quizContent);
        const questions = parsed.questions || parsed;

        if (!Array.isArray(questions) || questions.length === 0) {
          throw new Error("Falha ao gerar questões: formato inválido");
        }

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
