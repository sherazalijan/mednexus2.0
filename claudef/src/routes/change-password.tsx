import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { BrandMark } from "@/components/mednexus/BrandMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PortalSkeleton } from "@/components/mednexus/PortalSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/services/auth.service";
import { apiErrorMessage } from "@/services/api";

export const Route = createFileRoute("/change-password")({
  ssr: false,
  component: ChangePasswordPage,
});

function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  if (authLoading) return <PortalSkeleton />;
  if (!user) {
    navigate({ to: "/login", replace: true });
    return <PortalSkeleton />;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await authService.changePassword({ current_password: current, new_password: next });
      toast.success("Password updated");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not change your password"));
    } finally {
      setLoading(false);
    }
  }

  const home = user.role === "admin" ? "/admin/dashboard" : "/student/dashboard";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/">
          <BrandMark />
        </Link>

        <div className="mt-10 card-surface p-8">
          <div className="flex items-center gap-2">
            <KeyRound className="size-5 text-primary" />
            <h1 className="font-heading text-2xl font-extrabold">Change password</h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Signed in as {user.full_name}. Your password is hashed on the server and never shown
            here.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cp">Current password</Label>
              <Input
                id="cp"
                type="password"
                required
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="np">New password</Label>
              <Input
                id="np"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnp">Confirm new password</Label>
              <Input
                id="cnp"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="h-11"
              />
            </div>
            <Button type="submit" size="lg" className="w-full gap-2" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              {loading ? "Updating…" : "Update password"}
            </Button>
          </form>
        </div>

        <Link
          to={home}
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="size-4" /> Back to dashboard
        </Link>
      </div>
    </div>
  );
}
