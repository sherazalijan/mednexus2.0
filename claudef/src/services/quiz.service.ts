import api from "./api";
import type { Bookmark, MCQ, QuizSubmitRequest, QuizSubmitResponse } from "@/types/mcq";

export const quizService = {
  async getRandomQuiz(count: number): Promise<MCQ[]> {
    const { data } = await api.get<MCQ[]>(`/quiz/random/${count}`);
    return data;
  },
  async getChapterQuiz(
    chapterId: number,
    mode: "sequential" | "random" = "sequential",
  ): Promise<MCQ[]> {
    const { data } = await api.get<MCQ[]>(`/quiz/chapter/${chapterId}/${mode}`);
    return data;
  },
  async submitQuiz(payload: QuizSubmitRequest): Promise<QuizSubmitResponse> {
    const { data } = await api.post<QuizSubmitResponse>("/quiz/submit", payload);
    return data;
  },
  /** Practice Mode: one, several, or every chapter, always shuffled.
   * Also used by the Random Test Builder for the "Selected Chapters" source
   * (pass `count` to cap it). */
  async getMixedQuiz(chapterIds: number[], count?: number): Promise<MCQ[]> {
    const params = new URLSearchParams({ chapter_ids: chapterIds.join(",") });
    if (count) params.set("count", String(count));
    const { data } = await api.get<MCQ[]>(`/quiz/mixed?${params.toString()}`);
    return data;
  },
  /** Random Test Builder — source = "Entire Book". */
  async getRandomBookQuiz(bookId: number, count: number): Promise<MCQ[]> {
    const { data } = await api.get<MCQ[]>(`/quiz/random/book/${bookId}/${count}`);
    return data;
  },
};

export const bookmarkService = {
  async getBookmarks(): Promise<Bookmark[]> {
    const { data } = await api.get<Bookmark[]>("/bookmarks");
    return data;
  },
  async addBookmark(mcq_id: number): Promise<{ id: number; already_bookmarked: boolean }> {
    const { data } = await api.post<{ id: number; already_bookmarked: boolean }>("/bookmarks", {
      mcq_id,
    });
    return data;
  },
  async removeBookmark(mcqId: number): Promise<void> {
    await api.delete(`/bookmarks/${mcqId}`);
  },
};
