import api from "./api";
import type { AdminPaymentProof, PaymentProof, ReviewPaymentProofRequest } from "@/types/payment";

export const paymentService = {
  async submitProof(payload: { planName: string; note?: string; file: File }): Promise<PaymentProof> {
    const form = new FormData();
    form.append("plan_name", payload.planName);
    form.append("note", payload.note ?? "");
    form.append("file", payload.file);
    const { data } = await api.post<PaymentProof>("/payments/proof", form);
    return data;
  },
  async getMine(): Promise<PaymentProof[]> {
    const { data } = await api.get<PaymentProof[]>("/payments/proof/mine");
    return data;
  },
  async adminList(statusFilter: "pending" | "approved" | "rejected" | "all" = "pending"): Promise<AdminPaymentProof[]> {
    const { data } = await api.get<AdminPaymentProof[]>("/admin/payment-proofs", {
      params: { status_filter: statusFilter },
    });
    return data;
  },
  /** Returns a blob URL for the screenshot — the endpoint is admin-gated, so a plain <img src> won't carry the auth header. */
  async adminGetFileUrl(proofId: number): Promise<string> {
    const { data } = await api.get(`/admin/payment-proofs/${proofId}/file`, { responseType: "blob" });
    return URL.createObjectURL(data as Blob);
  },
  async adminReview(proofId: number, payload: ReviewPaymentProofRequest): Promise<{ subscription_granted: boolean }> {
    const { data } = await api.patch(`/admin/payment-proofs/${proofId}`, payload);
    return data;
  },
};
