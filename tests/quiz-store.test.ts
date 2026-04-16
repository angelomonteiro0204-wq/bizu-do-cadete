import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock AsyncStorage
const store: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => store[key] || null),
    setItem: vi.fn(async (key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn(async (key: string) => {
      delete store[key];
    }),
  },
}));

import {
  saveQuiz,
  getQuizzes,
  getQuizById,
  deleteQuiz,
  saveAttempt,
  getAttempts,
  getAttemptsByQuizId,
  getStats,
} from "../lib/quiz-store";
import type { Quiz, QuizAttempt } from "../shared/quiz-types";

const mockQuiz: Quiz = {
  id: "quiz_test_001",
  title: "Direito Constitucional - Aula 1",
  fileName: "aula1.pdf",
  questions: [
    {
      id: 1,
      statement: "Qual é o fundamento da República Federativa do Brasil?",
      alternatives: [
        { letter: "A", text: "Soberania" },
        { letter: "B", text: "Cidadania" },
        { letter: "C", text: "Dignidade da pessoa humana" },
        { letter: "D", text: "Valores sociais do trabalho" },
        { letter: "E", text: "Todas as anteriores" },
      ],
      correctAnswer: "E",
      explanation: "Todos os itens listados são fundamentos da República Federativa do Brasil.",
      sourceReference: "Art. 1º da CF/88",
    },
  ],
  createdAt: new Date().toISOString(),
};

const mockAttempt: QuizAttempt = {
  id: "attempt_test_001",
  quizId: "quiz_test_001",
  quizTitle: "Direito Constitucional - Aula 1",
  answers: { 0: "E" },
  score: 1,
  totalQuestions: 1,
  completedAt: new Date().toISOString(),
  timeSpentSeconds: 120,
};

describe("Quiz Store", () => {
  beforeEach(() => {
    Object.keys(store).forEach((key) => delete store[key]);
  });

  it("should save and retrieve a quiz", async () => {
    await saveQuiz(mockQuiz);
    const quizzes = await getQuizzes();
    expect(quizzes).toHaveLength(1);
    expect(quizzes[0].id).toBe("quiz_test_001");
    expect(quizzes[0].title).toBe("Direito Constitucional - Aula 1");
  });

  it("should get quiz by id", async () => {
    await saveQuiz(mockQuiz);
    const quiz = await getQuizById("quiz_test_001");
    expect(quiz).not.toBeNull();
    expect(quiz?.id).toBe("quiz_test_001");
  });

  it("should return null for non-existent quiz", async () => {
    const quiz = await getQuizById("non_existent");
    expect(quiz).toBeNull();
  });

  it("should delete a quiz", async () => {
    await saveQuiz(mockQuiz);
    await deleteQuiz("quiz_test_001");
    const quizzes = await getQuizzes();
    expect(quizzes).toHaveLength(0);
  });

  it("should save and retrieve an attempt", async () => {
    await saveQuiz(mockQuiz);
    await saveAttempt(mockAttempt);
    const attempts = await getAttempts();
    expect(attempts).toHaveLength(1);
    expect(attempts[0].score).toBe(1);
  });

  it("should get attempts by quiz id", async () => {
    await saveQuiz(mockQuiz);
    await saveAttempt(mockAttempt);
    const attempts = await getAttemptsByQuizId("quiz_test_001");
    expect(attempts).toHaveLength(1);
    expect(attempts[0].quizId).toBe("quiz_test_001");
  });

  it("should update stats after saving attempt", async () => {
    await saveQuiz(mockQuiz);
    await saveAttempt(mockAttempt);
    const stats = await getStats();
    expect(stats.totalQuizzes).toBe(1);
    expect(stats.totalCorrect).toBe(1);
    expect(stats.totalAnswered).toBe(1);
  });

  it("should handle quiz question structure correctly", () => {
    expect(mockQuiz.questions[0].alternatives).toHaveLength(5);
    expect(mockQuiz.questions[0].correctAnswer).toBe("E");
    expect(mockQuiz.questions[0].alternatives.map((a) => a.letter)).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
    ]);
  });
});
