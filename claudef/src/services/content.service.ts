import api from "./api";
import type {
  Announcement,
  Book,
  Chapter,
  CreateAnnouncementRequest,
  CreateBookRequest,
  CreateChapterRequest,
} from "@/types/content";
import type { CreateMCQRequest, MCQ } from "@/types/mcq";

export const bookService = {
  async getBooks(): Promise<Book[]> {
    const { data } = await api.get<Book[]>("/books");
    return data;
  },
  async createBook(payload: CreateBookRequest): Promise<Book> {
    const { data } = await api.post<Book>("/books", payload);
    return data;
  },
  async deleteBook(id: number): Promise<void> {
    await api.delete(`/books/${id}`);
  },
};

export const chapterService = {
  async getChapters(bookId: number): Promise<Chapter[]> {
    const { data } = await api.get<Chapter[]>(`/books/${bookId}/chapters`);
    return data;
  },
  async createChapter(bookId: number, payload: CreateChapterRequest): Promise<Chapter> {
    const { data } = await api.post<Chapter>(`/books/${bookId}/chapters`, payload);
    return data;
  },
};

export const mcqService = {
  async createMCQ(payload: CreateMCQRequest): Promise<MCQ> {
    const { data } = await api.post<MCQ>("/mcqs", payload);
    return data;
  },
};

export const announcementService = {
  async getAnnouncements(): Promise<Announcement[]> {
    const { data } = await api.get<Announcement[]>("/announcements");
    return data;
  },
  async createAnnouncement(payload: CreateAnnouncementRequest): Promise<Announcement> {
    const { data } = await api.post<Announcement>("/admin/announcements", payload);
    return data;
  },
};
