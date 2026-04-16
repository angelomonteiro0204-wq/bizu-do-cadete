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
  questions: QuizQuestion[];
  createdAt: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  quizTitle: string;
  answers: Record<number, "A" | "B" | "C" | "D" | "E">;
  score: number;
  totalQuestions: number;
  completedAt: string;
  timeSpentSeconds: number;
}

export interface QuizState {
  currentQuestionIndex: number;
  answers: Record<number, "A" | "B" | "C" | "D" | "E">;
  revealed: Record<number, boolean>;
  startTime: number;
}
