import type { MCQ } from "./mcq";

export type RevisionStatus = "in_progress" | "paused" | "completed";

export interface RevisionStatusSummary {
  has_session: boolean;
  status?: RevisionStatus;
  current_index?: number;
  total_questions?: number;
  answered_count?: number;
  started_at?: string;
  updated_at?: string;
}

export interface RevisionSession {
  book_id: number;
  status: RevisionStatus;
  current_index: number;
  total_questions: number;
  answered: Record<string, string>;
  questions: MCQ[];
}

export interface ActiveRevisionSession {
  has_session: boolean;
  book_id?: number;
  book_title?: string;
  current_index?: number;
  total_questions?: number;
  status?: RevisionStatus;
  updated_at?: string;
}
