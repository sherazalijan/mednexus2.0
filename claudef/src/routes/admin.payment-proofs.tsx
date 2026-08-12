import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Receipt, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/mednexus/PageHeader";
import { EmptyState } from "@/components/mednexus/EmptyState";
import { QueryError } from "@/components/mednexus/QueryError";
import { StatusBadge } from "@/components/mednexus/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { paymentService } from "@/services/payment.service";
import { apiErrorMessage } from "@/services/api";
import type { AdminPaymentProof } from "@/types/payment";

export const Route = createFileRoute("/admin/payment-proofs")({
  head: () => ({
    meta: [
      { title: "Payment Proofs — MedNexus Admin" },
      { name: "description", content: "Review, approve, and reject student payment proof submissions." },
    ],
  }),
  component: AdminPaymentProofs,
});

const FILTERS = ["pending", "approved", "rejected", "all"] as const;

function ProofScreenshot({ proofId }: { proofId: number }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let revoke: string | null = null;
    paymentService
      .adminGetFileUrl(proofId)
      .then((u) => {
        revoke = u;
        setUrl(u);
      })
      .catch(() => setError(true));
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [proofId]);

  if (error) return <p className="text-sm text-destructive">Couldn't load the screenshot.</p>;
  if (!url) return <div className="grid h-48 place-items-center"><Loader2 className="size-5 animate-spin text-primary" /></div>;
  return <img src={url} alt="Payment screenshot" className="max-h-96 w-full rounded-lg border border-border object-contain" />;
}

function AdminPaymentProofs() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("pending");
  const [active, setActive] = useState<AdminPaymentProof | null>(null);
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [planName, setPlanName] = useState("");
  const [durationDays, setDurationDays] = useState("30");

  const proofs = useQuery({
    queryKey: ["admin-payment-proofs", filter],
    queryFn: () => paymentService.adminList(filter),
  });

  const review = useMutation({
    mutationFn: (vars: { status: "approved" | "rejected" }) => {
      if (!active) throw new Error("Nothing selected");
      const req: Parameters<typeof paymentService.adminReview>[1] = {
        status: vars.status,
      };
      if (adminNote) {
        req.admin_note = adminNote;
      }
      if (vars.status === "approved" && planName) {
        req.plan_name = planName;
        req.duration_days = Number(durationDays);
      }
      return paymentService.adminReview(active.id, req);
    },
    onSuccess: (result, vars) => {
      toast.success(
        vars.status === "approved"
          ? result.subscription_granted
            ? "Approved and subscription granted"
            : "Approved"
          : "Rejected",
      );
      qc.invalidateQueries({ queryKey: ["admin-payment-proofs"] });
      setActive(null);
      setDecision(null);
      setAdminNote("");
      setPlanName("");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not save review")),
  });

  return (
    <div className="space-y-8">
      <PageHeader title="Payment proofs" subtitle="Review student payment screenshots, approve or reject them." />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full border px-4 py-2 text-sm font-medium capitalize transition-colors ${
              filter === f ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {proofs.isLoading ? (
        <div className="grid place-items-center py-20"><Loader2 className="size-6 animate-spin text-primary" /></div>
      ) : proofs.isError ? (
        <QueryError error={proofs.error} onRetry={() => proofs.refetch()} title="Couldn't load payment proofs" />
      ) : (proofs.data ?? []).length === 0 ? (
        <EmptyState icon={Receipt} title="Nothing here" description="No payment proofs match this filter." />
      ) : (
        <div className="card-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-surface text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Student</th>
                  <th className="px-6 py-3.5 font-semibold">Plan</th>
                  <th className="px-6 py-3.5 font-semibold">Submitted</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                  <th className="px-6 py-3.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {proofs.data!.map((p) => (
                  <tr key={p.id} className="hover:bg-surface">
                    <td className="px-6 py-4">
                      <p className="font-semibold">{p.full_name}</p>
                      <p className="text-xs text-muted-foreground">{p.email}</p>
                    </td>
                    <td className="px-6 py-4">{p.plan_name ?? "—"}</td>
                    <td className="px-6 py-4 text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setActive(p); setDecision(null); setAdminNote(p.admin_note ?? ""); }}>
                          Review
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={!!active} onOpenChange={(v) => { if (!v) { setActive(null); setDecision(null); } }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{active?.full_name}'s payment proof</DialogTitle>
            <DialogDescription>{active?.email} · {active?.plan_name ?? "Subscription"}</DialogDescription>
          </DialogHeader>
          {active && (
            <div className="space-y-4">
              <ProofScreenshot proofId={active.id} />
              {active.note && <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">"{active.note}"</p>}

              <div className="space-y-2">
                <Label htmlFor="admin-note">Admin note</Label>
                <Textarea id="admin-note" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Optional note visible to the student" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="gap-2 text-destructive hover:text-destructive"
                  disabled={review.isPending}
                  onClick={() => review.mutate({ status: "rejected" })}
                >
                  {review.isPending && review.variables?.status === "rejected" ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
                  Reject
                </Button>
                <Button
                  className="gap-2"
                  disabled={review.isPending}
                  onClick={() => setDecision("approved")}
                >
                  <Check className="size-4" /> Approve
                </Button>
              </div>

              {decision === "approved" && (
                <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-sm font-medium">Optionally grant a subscription in the same step:</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="grant-plan">Plan name</Label>
                      <Input id="grant-plan" value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="e.g. 3-month plan" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="grant-days">Duration (days)</Label>
                      <Input id="grant-days" type="number" min={1} value={durationDays} onChange={(e) => setDurationDays(e.target.value)} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Leave the plan name blank to approve without granting a subscription.</p>
                  <Button className="w-full gap-2" disabled={review.isPending} onClick={() => review.mutate({ status: "approved" })}>
                    {review.isPending && review.variables?.status === "approved" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    Confirm approval
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
