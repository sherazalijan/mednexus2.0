import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, Copy, CreditCard, Loader2, Receipt, Upload } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/mednexus/PageHeader";
import { EmptyState } from "@/components/mednexus/EmptyState";
import { QueryError } from "@/components/mednexus/QueryError";
import { StatusBadge } from "@/components/mednexus/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PAYMENT_INFO } from "@/config/payment";
import { paymentService } from "@/services/payment.service";
import { userService } from "@/services/user.service";
import { apiErrorMessage } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/student/subscription")({
  head: () => ({
    meta: [
      { title: "Subscription — MedNexus" },
      { name: "description", content: "View your subscription, payment details, and submit payment proof." },
    ],
  }),
  component: SubscriptionPage,
});

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="gap-1.5"
        onClick={() => {
          navigator.clipboard.writeText(value);
          toast.success(`${label} copied`);
        }}
      >
        <Copy className="size-3.5" /> Copy
      </Button>
    </div>
  );
}

function SubscriptionPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const userId = user?.user_id ?? 0;

  const subscription = useQuery({
    queryKey: ["subscription", userId],
    queryFn: () => userService.getSubscription(userId),
    enabled: !!userId,
  });

  const proofs = useQuery({ queryKey: ["my-payment-proofs"], queryFn: paymentService.getMine });

  const [planName, setPlanName] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const submitProof = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("Choose a screenshot first");
      return paymentService.submitProof({ planName: planName || "Standard plan", note, file });
    },
    onSuccess: () => {
      toast.success("Payment proof submitted — an admin will review it shortly");
      setPlanName("");
      setNote("");
      setFile(null);
      qc.invalidateQueries({ queryKey: ["my-payment-proofs"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not submit payment proof")),
  });

  return (
    <div className="space-y-8">
      <PageHeader title="Subscription" subtitle="Your plan, payment details, and payment proof submissions." />

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <CreditCard className="size-5 text-primary" />
            <h2 className="font-heading text-lg font-bold">Current plan</h2>
          </div>
          {subscription.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : subscription.isError ? (
            <QueryError error={subscription.error} onRetry={() => subscription.refetch()} title="Couldn't load your subscription" />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-4">
              <div>
                <p className="font-semibold">{subscription.data?.plan_name ?? "No active plan"}</p>
                {subscription.data?.end_date && (
                  <p className="text-sm text-muted-foreground">Valid until {new Date(subscription.data.end_date).toLocaleDateString()}</p>
                )}
              </div>
              <StatusBadge status={subscription.data?.active ? "active" : "disabled"} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <Banknote className="size-5 text-primary" />
            <h2 className="font-heading text-lg font-bold">Payment details</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Transfer your subscription payment to the account below, then upload a screenshot of the transaction
            as proof — an admin will confirm and activate your plan.
          </p>
          <div className="space-y-2">
            <CopyRow label="Account name" value={PAYMENT_INFO.accountName} />
            <CopyRow label="Bank" value={PAYMENT_INFO.bankName} />
            <CopyRow label="Account number" value={PAYMENT_INFO.accountNumber} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <Upload className="size-5 text-primary" />
            <h2 className="font-heading text-lg font-bold">Submit payment proof</h2>
          </div>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              submitProof.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="plan">Plan you're paying for</Label>
              <Input id="plan" value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="e.g. 3-month plan" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Note (optional)</Label>
              <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything the admin should know" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="screenshot">Payment screenshot</Label>
              <Input
                id="screenshot"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="h-11"
                required
              />
              <p className="text-xs text-muted-foreground">PNG, JPG or WEBP, up to 5MB.</p>
            </div>
            <Button type="submit" className="gap-2" disabled={submitProof.isPending || !file}>
              {submitProof.isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Submit for review
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <Receipt className="size-5 text-primary" />
            <h2 className="font-heading text-lg font-bold">Your submissions</h2>
          </div>
          {proofs.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : proofs.isError ? (
            <QueryError error={proofs.error} onRetry={() => proofs.refetch()} title="Couldn't load your submissions" />
          ) : (proofs.data ?? []).length === 0 ? (
            <EmptyState icon={Receipt} title="No submissions yet" description="Upload a payment screenshot above to get started." />
          ) : (
            <div className="space-y-2">
              {proofs.data!.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4">
                  <div>
                    <p className="font-semibold">{p.plan_name ?? "Subscription"}</p>
                    <p className="text-xs text-muted-foreground">
                      Submitted {new Date(p.created_at).toLocaleDateString()}
                      {p.admin_note ? ` — ${p.admin_note}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
