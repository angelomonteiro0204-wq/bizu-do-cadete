import { describe, it, expect } from "vitest";

// Inline the parseJsonRobust function for testing since it's in server code
function parseJsonRobust(raw: string): any {
  let text = raw.trim();
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }
  text = text.replace(/^\uFEFF/, "");

  try {
    return JSON.parse(text);
  } catch (_) {}

  text = text.replace(/,\s*([\]}])/g, "$1");
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

  try {
    return JSON.parse(text);
  } catch (_) {}

  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) {
    const cleaned = objMatch[0].replace(/,\s*([\]}])/g, "$1");
    try {
      return JSON.parse(cleaned);
    } catch (_) {}
  }

  throw new Error("Não foi possível interpretar a resposta da IA como JSON válido.");
}

describe("parseJsonRobust", () => {
  it("parses valid JSON directly", () => {
    const result = parseJsonRobust('{"questions": [{"id": 1}]}');
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].id).toBe(1);
  });

  it("handles trailing commas", () => {
    const input = '{"questions": [{"id": 1, "text": "hello",},]}';
    const result = parseJsonRobust(input);
    expect(result.questions).toHaveLength(1);
  });

  it("handles markdown code fences", () => {
    const input = '```json\n{"questions": [{"id": 1}]}\n```';
    const result = parseJsonRobust(input);
    expect(result.questions).toHaveLength(1);
  });

  it("handles text before/after JSON", () => {
    const input = 'Here is the result:\n{"questions": [{"id": 1}]}\nDone!';
    const result = parseJsonRobust(input);
    expect(result.questions).toHaveLength(1);
  });

  it("handles BOM character", () => {
    const input = '\uFEFF{"questions": [{"id": 1}]}';
    const result = parseJsonRobust(input);
    expect(result.questions).toHaveLength(1);
  });

  it("handles complex trailing commas in nested structures", () => {
    const input = `{
      "questions": [
        {
          "id": 1,
          "alternatives": [
            {"letter": "A", "text": "Option A"},
            {"letter": "B", "text": "Option B"},
          ],
          "correctAnswer": "A",
        },
      ]
    }`;
    const result = parseJsonRobust(input);
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].alternatives).toHaveLength(2);
  });

  it("throws on completely invalid input", () => {
    expect(() => parseJsonRobust("not json at all")).toThrow();
  });
});
