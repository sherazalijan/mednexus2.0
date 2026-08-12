/**
 * Feature 5 — Payment information shown on the Subscription page and used
 * when a student submits a payment proof. Static by design: this is
 * display-only account info, not something that needs its own backend
 * endpoint (rule: don't add API surface that isn't necessary).
 *
 * To change the payout account, edit this file only — it's the single
 * source of truth, referenced from student.subscription.tsx.
 */
export const PAYMENT_INFO = {
  accountName: "Sheraz Ali Jan",
  bankName: "NayaPay",
  accountNumber: "03420599886",
} as const;
