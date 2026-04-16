export const SUBJECT_OPTIONS = [
  "Direito Constitucional",
  "Direito Penal",
  "Direito Administrativo",
  "Direito Processual Penal",
  "Legislação Especial",
  "Direitos Humanos",
  "Criminologia",
  "Medicina Legal",
  "História da PM",
  "Ordem Unida",
  "Policiamento Ostensivo",
  "Administração Pública",
  "Português",
  "Matemática",
  "Informática",
  "Outros",
] as const;

export type SubjectName = (typeof SUBJECT_OPTIONS)[number];

export interface QuizQuestion {
  id: number;
  statement: string;
  alternatives: {
    letter: "A" | "B" | "C" | "D" | "E";
    text: string;
  }[];
  correctAnswer: "A" | "B" | "C" | "D" | "E";
  explanation: string;
  sourceReference: string;
}

export interface Quiz {
  id: string;
  title: string;
  fileName: string;
  subject?: SubjectName | string;
  questions: QuizQuestion[];
  createdAt: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  quizTitle: string;
  subject?: SubjectName | string;
  answers: Record<number, "A" | "B" | "C" | "D" | "E">;
  score: number;
  totalQuestions: number;
  completedAt: string;
  timeSpentSeconds: number;
  isSimulated?: boolean;
  timeLimitSeconds?: number;
}

export interface QuizState {
  currentQuestionIndex: number;
  answers: Record<number, "A" | "B" | "C" | "D" | "E">;
  revealed: Record<number, boolean>;
  startTime: number;
}
