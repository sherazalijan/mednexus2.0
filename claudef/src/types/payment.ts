export type PaymentProofStatus = "pending" | "approved" | "rejected";

export interface PaymentProof {
  id: number;
  plan_name: string | null;
  note: string | null;
  status: PaymentProofStatus;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface AdminPaymentProof extends PaymentProof {
  user_id: number;
  full_name: string;
  email: string;
}

export interface ReviewPaymentProofRequest {
  status: "approved" | "rejected";
  admin_note?: string;
  plan_name?: string;
  duration_days?: number;
}
