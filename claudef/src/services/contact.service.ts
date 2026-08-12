import api from "./api";

export interface ContactSubmission {
  id?: number;
  full_name: string;
  email: string;
  category: "complaint" | "inquiry" | "ai_software" | "book_request";
  message: string;
  status?: "unread" | "read" | "in_progress" | "resolved";
  created_at?: string;
}

export const contactService = {
  async submitForm(payload: { full_name: string; email: string; category: string; message: string }) {
    const { data } = await api.post<{ success: boolean; message: string }>("/contact/submit", payload);
    return data;
  },

  async adminGetComplaints() {
    const { data } = await api.get<ContactSubmission[]>("/admin/complaints");
    return data;
  },

  async adminUpdateStatus(id: number, status: "unread" | "read" | "in_progress" | "resolved") {
    const { data } = await api.patch<ContactSubmission>(`/admin/complaints/${id}`, { status });
    return data;
  },
};
