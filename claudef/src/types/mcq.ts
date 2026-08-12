export interface MCQ {
  id: number;
  chapter_id?: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: "A" | "B" | "C" | "D";
  explanation: string | null;
}

export interface CreateMCQRequest {
  chapter_id: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: "A" | "B" | "C" | "D";
  explanation?: string;
  page_number?: number;
}

export interface QuizAnswer {
  mcq_id: number;
  selected_answer: string;
}

export interface QuizSubmitRequest {
  answers: QuizAnswer[];
  chapter_id?: number;
  quiz_type?: string;
}

export interface QuizResultItem {
  mcq_id: number;
  question: string;
  your_answer: string;
  correct_answer: string;
  status: "correct" | "incorrect" | "unattempted";
  is_correct: boolean;
  explanation: string | null;
}

export interface QuizSubmitResponse {
  total_questions: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  score: number;
  results: QuizResultItem[];
}

export interface Bookmark {
  bookmark_id: number;
  created_at: string;
  mcq_id: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string | null;
}
