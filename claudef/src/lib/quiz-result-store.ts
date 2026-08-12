const KEY = "mednexus:last_quiz_result";

import type { QuizSubmitResponse } from "@/types/mcq";

export interface StoredQuizResult extends QuizSubmitResponse {
  chapter_id?: number;
  quiz_type?: string;
}

export function saveQuizResult(result: StoredQuizResult) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, JSON.stringify(result));
}

export function readQuizResult(): StoredQuizResult | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredQuizResult;
  } catch {
    return null;
  }
}
