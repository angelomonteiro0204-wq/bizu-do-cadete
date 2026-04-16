import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { PDFParse } from "pdf-parse";
// @ts-ignore - officeparser typing issue
import { parseOffice } from "officeparser";

/**
 * Robustly parse JSON from LLM output.
 */
function parseJsonRobust(raw: string): any {
  let text = raw.trim();
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }
  text = text.replace(/^\uFEFF/, "");

  try { return JSON.parse(text); } catch (_) {}

  text = text.replace(/,\s*([\]}])/g, "$1");
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

  try { return JSON.parse(text); } catch (_) {}

  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) {
    const cleaned = objMatch[0].replace(/,\s*([\]}])/g, "$1");
    try { return JSON.parse(cleaned); } catch (_) {}
  }

  throw new Error("Não foi possível interpretar a resposta da IA como JSON válido.");
}

/**
 * Safely extract text content from LLM response.
 */
function extractLLMContent(response: any): string {
  if (!response) throw new Error("Resposta vazia da IA.");
  const choices = response.choices;
  if (!choices || !Array.isArray(choices) || choices.length === 0) {
    console.error("[LLM] Unexpected response shape:", JSON.stringify(response).substring(0, 500));
    throw new Error("A IA retornou uma resposta inesperada. Tente novamente.");
  }
  const message = choices[0]?.message;
  if (!message) throw new Error("A IA não retornou uma mensagem válida.");
  const content = message.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const textParts = content
      .filter((part: any) => part.type === "text" && typeof part.text === "string")
      .map((part: any) => part.text);
    if (textParts.length > 0) return textParts.join("\n");
  }
  throw new Error("A IA retornou conteúdo em formato não suportado.");
}

// =============================================
// FILE TEXT EXTRACTION - Multiple format support
// =============================================

/** Supported file extensions and their categories */
const FILE_CATEGORIES = {
  pdf: [".pdf"],
  office: [".pptx", ".ppt", ".docx", ".doc", ".xlsx", ".xls", ".odt", ".odp", ".ods", ".rtf"],
  text: [".txt", ".md", ".csv", ".json", ".xml", ".html", ".htm", ".log"],
} as const;

function getFileExtension(fileName: string): string {
  return fileName.toLowerCase().substring(fileName.lastIndexOf("."));
}

function getFileCategory(fileName: string, mimeType: string): "pdf" | "office" | "text" | "unknown" {
  const ext = getFileExtension(fileName);

  if (FILE_CATEGORIES.pdf.some(e => ext === e) || mimeType === "application/pdf") return "pdf";
  if ((FILE_CATEGORIES.office as readonly string[]).some(e => ext === e) ||
      mimeType.includes("officedocument") ||
      mimeType.includes("msword") ||
      mimeType.includes("ms-powerpoint") ||
      mimeType.includes("ms-excel") ||
      mimeType.includes("opendocument") ||
      mimeType === "application/rtf" ||
      mimeType === "text/rtf") return "office";
  if ((FILE_CATEGORIES.text as readonly string[]).some(e => ext === e) ||
      mimeType.startsWith("text/")) return "text";

  return "unknown";
}

/** Get all supported extensions for display */
function getSupportedExtensions(): string[] {
  return [
    ...FILE_CATEGORIES.pdf,
    ...FILE_CATEGORIES.office,
    ...FILE_CATEGORIES.text,
  ];
}

/**
 * Extract text from PDF buffer.
 */
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const uint8 = new Uint8Array(buffer);
    const parser = new PDFParse(uint8);
    const result = await parser.getText();
    if (result && typeof result === "object") {
      if (typeof (result as any).text === "string") return (result as any).text;
      if (Array.isArray((result as any).pages)) {
        return (result as any).pages.map((p: any) => p.text || "").join("\n");
      }
    }
    return "";
  } catch (err: any) {
    console.error("[PDF] Extraction error:", err.message);
    throw new Error("Falha ao extrair texto do PDF. Verifique se o arquivo não está corrompido ou protegido por senha.");
  }
}

/**
 * Extract text from Office documents (PPTX, DOCX, XLSX, ODP, ODT, ODS, RTF, PPT, DOC).
 * officeparser returns an AST object with a .toText() method.
 */
async function extractTextFromOffice(buffer: Buffer, fileName: string): Promise<string> {
  try {
    const result = await parseOffice(buffer);
    // officeparser v5+ returns an AST object with toText() method
    if (result && typeof result === "object" && typeof result.toText === "function") {
      return result.toText();
    }
    // Fallback for older versions that return string directly
    if (typeof result === "string") return result;
    // Last resort: stringify
    return String(result ?? "");
  } catch (err: any) {
    console.error(`[Office] Extraction error for "${fileName}":`, err.message);
    const ext = getFileExtension(fileName);
    throw new Error(
      `Falha ao extrair texto do arquivo ${ext.toUpperCase()}. Verifique se o arquivo não está corrompido. ` +
      `Formatos suportados: ${getSupportedExtensions().join(", ")}`
    );
  }
}

/**
 * Extract text from plain text files (TXT, MD, CSV, etc.).
 */
function extractTextFromPlainText(buffer: Buffer): string {
  return buffer.toString("utf-8");
}

/**
 * Master extraction function - routes to the correct extractor based on file type.
 */
async function extractText(buffer: Buffer, fileName: string, mimeType: string): Promise<string> {
  const category = getFileCategory(fileName, mimeType);

  switch (category) {
    case "pdf":
      return await extractTextFromPdf(buffer);
    case "office":
      return await extractTextFromOffice(buffer, fileName);
    case "text":
      return extractTextFromPlainText(buffer);
    case "unknown":
      // Try officeparser as a last resort
      try {
        const result = await parseOffice(buffer);
        if (result && typeof result === "object" && typeof result.toText === "function") {
          return result.toText();
        }
        if (typeof result === "string") return result;
        return String(result ?? "");
      } catch {
        throw new Error(
          `Formato de arquivo não suportado: "${getFileExtension(fileName)}". ` +
          `Formatos aceitos: ${getSupportedExtensions().join(", ")}`
        );
      }
  }
}

// =============================================
// QUIZ GENERATION
// =============================================

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

DIVERSIFICAÇÃO OBRIGATÓRIA:
- Cada questionário gerado DEVE conter questões DIFERENTES, mesmo que o conteúdo de origem seja o mesmo.
- Varie os enunciados, a ordem dos tópicos abordados, a perspectiva de cada questão e a posição da alternativa correta (distribua entre A, B, C, D e E de forma equilibrada).
- Aborde o conteúdo de ângulos diferentes: ora pergunte sobre definições, ora sobre exceções, ora sobre aplicações práticas, ora sobre comparações entre conceitos, ora sobre consequências ou implicações.
- Utilize diferentes formatos de enunciado: afirmações para julgar, perguntas diretas, completar lacunas, "assinale a alternativa INCORRETA", análise de situações hipotéticas, entre outros.
- Nunca repita a mesma estrutura de questão ou o mesmo trecho do conteúdo em mais de uma questão do mesmo questionário.
- Use um número aleatório como seed para garantir variação: SEED=${Date.now()}.

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

async function generateQuizFromText(text: string, fileName: string, title: string | undefined, questionCount: number) {
  const response = await invokeLLM({
    messages: [
      { role: "system", content: QUIZ_SYSTEM_PROMPT(questionCount) },
      {
        role: "user",
        content: `Com base no seguinte conteúdo extraído do arquivo "${fileName}", gere ${questionCount} questões no estilo Questionários APMBB. Aborde o conteúdo inteiramente, criando questões que cubram todos os tópicos apresentados:\n\n${text.substring(0, 30000)}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = extractLLMContent(response);
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
}

// =============================================
// ROUTES
// =============================================

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
    /** Get list of supported file extensions */
    supportedFormats: publicProcedure.query(() => {
      return {
        extensions: getSupportedExtensions(),
        categories: {
          pdf: [...FILE_CATEGORIES.pdf],
          office: [...FILE_CATEGORIES.office],
          text: [...FILE_CATEGORIES.text],
        },
      };
    }),

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
        return generateQuizFromText(input.text, input.fileName, input.title, input.questionCount);
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

        // Decode base64 to buffer
        const buffer = Buffer.from(fileBase64, "base64");
        console.log(`[Quiz] Processing file "${fileName}" (${mimeType}, ${buffer.length} bytes)`);

        // Extract text using the master extraction function
        const extractedText = await extractText(buffer, fileName, mimeType);

        if (!extractedText || extractedText.trim().length < 30) {
          throw new Error(
            "Não foi possível extrair texto suficiente do arquivo. " +
            "Verifique se o arquivo contém texto legível (não apenas imagens). " +
            `Formatos aceitos: ${getSupportedExtensions().join(", ")}`
          );
        }

        console.log(`[Quiz] Extracted ${extractedText.length} chars from "${fileName}"`);

        return generateQuizFromText(extractedText, fileName, title, questionCount);
      }),
  }),
});

export type AppRouter = typeof appRouter;
