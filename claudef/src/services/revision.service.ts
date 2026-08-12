import api from "./api";
import type {
  ActiveRevisionSession,
  RevisionSession,
  RevisionStatus,
  RevisionStatusSummary,
} from "@/types/revision";

export const revisionService = {
  /** Lightweight check: does this book have an in-progress/paused session? */
  async getStatus(bookId: number): Promise<RevisionStatusSummary> {
    const { data } = await api.get<RevisionStatusSummary>(`/revision/book/${bookId}`);
    return data;
  },
  /** Feature 11 (Last Revision Resume): most recently touched session across all books. */
  async getActiveSession(): Promise<ActiveRevisionSession> {
    const { data } = await api.get<ActiveRevisionSession>("/revision/active");
    return data;
  },
  /** Start a brand-new session, or continue the existing one if restart=false. */
  async start(bookId: number, opts: { restart?: boolean; shuffle?: boolean } = {}): Promise<RevisionSession> {
    const { data } = await api.post<RevisionSession>(`/revision/book/${bookId}/start`, {
      restart: opts.restart ?? false,
      shuffle: opts.shuffle ?? false,
    });
    return data;
  },
  /** Autosave — called after every answer, and by the Pause button (status="paused"). */
  async saveProgress(
    bookId: number,
    payload: { current_index: number; answered: Record<string, string>; status: RevisionStatus },
  ): Promise<void> {
    await api.put(`/revision/book/${bookId}/progress`, payload);
  },
  /** Clear a session outright (used after a book revision is submitted). */
  async clear(bookId: number): Promise<void> {
    await api.delete(`/revision/book/${bookId}`);
  },
};
