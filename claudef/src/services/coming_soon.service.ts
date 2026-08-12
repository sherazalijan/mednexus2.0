import api from "./api";

export interface ComingSoonBook {
  id?: number;
  title: string;
  category: string;
  target_audience: string;
  description: string;
  release_tag: string;
  featured: boolean;
  created_at?: string;
}

export const comingSoonService = {
  async getComingSoonBooks(): Promise<ComingSoonBook[]> {
    const { data } = await api.get<ComingSoonBook[]>("/coming-soon-books");
    return data;
  },

  async adminCreateComingSoonBook(payload: ComingSoonBook): Promise<ComingSoonBook> {
    const { data } = await api.post<ComingSoonBook>("/admin/coming-soon-books", payload);
    return data;
  },

  async adminUpdateComingSoonBook(id: number, payload: ComingSoonBook): Promise<ComingSoonBook> {
    const { data } = await api.put<ComingSoonBook>(`/admin/coming-soon-books/${id}`, payload);
    return data;
  },

  async adminDeleteComingSoonBook(id: number): Promise<void> {
    await api.delete(`/admin/coming-soon-books/${id}`);
  },
};
