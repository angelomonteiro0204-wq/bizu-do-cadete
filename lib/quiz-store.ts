import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Quiz, QuizAttempt } from "@/shared/quiz-types";

const QUIZZES_KEY = "@bizu_quizzes";
const ATTEMPTS_KEY = "@bizu_attempts";
const STATS_KEY = "@bizu_stats";

export interface AppStats {
  totalQuizzes: number;
  totalQuestions: number;
  totalCorrect: number;
  totalAnswered: number;
}

// ---- Quizzes ----

export async function saveQuiz(quiz: Quiz): Promise<void> {
  const quizzes = await getQuizzes();
  const idx = quizzes.findIndex((q) => q.id === quiz.id);
  if (idx >= 0) {
    quizzes[idx] = quiz;
  } else {
    quizzes.unshift(quiz);
  }
  await AsyncStorage.setItem(QUIZZES_KEY, JSON.stringify(quizzes));
}

export async function getQuizzes(): Promise<Quiz[]> {
  const data = await AsyncStorage.getItem(QUIZZES_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data) as Quiz[];
  } catch {
    return [];
  }
}

export async function getQuizById(id: string): Promise<Quiz | null> {
  const quizzes = await getQuizzes();
  return quizzes.find((q) => q.id === id) || null;
}

export async function deleteQuiz(id: string): Promise<void> {
  const quizzes = await getQuizzes();
  const filtered = quizzes.filter((q) => q.id !== id);
  await AsyncStorage.setItem(QUIZZES_KEY, JSON.stringify(filtered));
  // Also delete related attempts
  const attempts = await getAttempts();
  const filteredAttempts = attempts.filter((a) => a.quizId !== id);
  await AsyncStorage.setItem(ATTEMPTS_KEY, JSON.stringify(filteredAttempts));
}

// ---- Attempts ----

export async function saveAttempt(attempt: QuizAttempt): Promise<void> {
  const attempts = await getAttempts();
  attempts.unshift(attempt);
  await AsyncStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
  // Update stats
  await updateStats(attempt);
}

export async function getAttempts(): Promise<QuizAttempt[]> {
  const data = await AsyncStorage.getItem(ATTEMPTS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data) as QuizAttempt[];
  } catch {
    return [];
  }
}

export async function getAttemptsByQuizId(quizId: string): Promise<QuizAttempt[]> {
  const attempts = await getAttempts();
  return attempts.filter((a) => a.quizId === quizId);
}

// ---- Stats ----

export async function getStats(): Promise<AppStats> {
  const data = await AsyncStorage.getItem(STATS_KEY);
  if (!data) return { totalQuizzes: 0, totalQuestions: 0, totalCorrect: 0, totalAnswered: 0 };
  try {
    return JSON.parse(data) as AppStats;
  } catch {
    return { totalQuizzes: 0, totalQuestions: 0, totalCorrect: 0, totalAnswered: 0 };
  }
}

async function updateStats(attempt: QuizAttempt): Promise<void> {
  const stats = await getStats();
  const quizzes = await getQuizzes();
  stats.totalQuizzes = quizzes.length;
  stats.totalAnswered += attempt.totalQuestions;
  stats.totalCorrect += attempt.score;
  stats.totalQuestions += attempt.totalQuestions;
  await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export async function recalculateStats(): Promise<AppStats> {
  const quizzes = await getQuizzes();
  const attempts = await getAttempts();
  const stats: AppStats = {
    totalQuizzes: quizzes.length,
    totalQuestions: attempts.reduce((sum, a) => sum + a.totalQuestions, 0),
    totalCorrect: attempts.reduce((sum, a) => sum + a.score, 0),
    totalAnswered: attempts.reduce((sum, a) => sum + a.totalQuestions, 0),
  };
  await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
  return stats;
}
