export interface Book {
  id: number;
  title: string;
  description?: string | null;
  category?: string | null;
}

export interface CreateBookRequest {
  title: string;
  description?: string;
}

export interface Chapter {
  id: number;
  chapter_name: string;
  book_id: number;
}

export interface CreateChapterRequest {
  chapter_name: string;
}

export interface Announcement {
  id: number;
  title: string;
  message: string;
  created_at: string;
  expires_at?: string | null;
}

export interface CreateAnnouncementRequest {
  title: string;
  message: string;
  expires_at?: string;
}
