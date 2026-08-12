import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Mail, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { BrandMark } from "@/components/mednexus/BrandMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/auth.service";
import { apiErrorMessage } from "@/services/api";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot password — MedNexus" },
      {
        name: "description",
        content: "Request a secure password reset link for your MedNexus account.",
      },
      { property: "og:title", content: "Forgot password — MedNexus" },
      { property: "og:description", content: "Reset access to your MedNexus QBank account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.forgotPassword({ email });
      setSent(true);
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not send the reset link"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/">
          <BrandMark />
        </Link>

        {sent ? (
          <div className="mt-10 card-surface p-8 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent/15 text-accent">
              <MailCheck className="size-6" />
            </span>
            <h1 className="mt-5 font-heading text-2xl font-extrabold">Check your inbox</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              If an account exists for <span className="font-semibold">{email}</span>, we've sent a
              password reset link. It expires shortly for your security.
            </p>
            <Button asChild variant="outline" className="mt-6 w-full">
              <Link to="/login">Back to sign in</Link>
            </Button>
          </div>
        ) : (
          <>
            <h1 className="mt-10 font-heading text-3xl font-extrabold">Forgot your password?</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter the email on your MedNexus account and we'll send a reset link.
            </p>
            <form onSubmit={onSubmit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@medschool.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 pl-9"
                  />
                </div>
              </div>
              <Button type="submit" size="lg" className="w-full gap-2" disabled={loading}>
                {loading && <Loader2 className="size-4 animate-spin" />}
                {loading ? "Sending…" : "Send reset link"}
              </Button>
            </form>
            <Link
              to="/login"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              <ArrowLeft className="size-4" /> Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
