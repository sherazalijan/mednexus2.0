import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { BrandMark } from "@/components/mednexus/BrandMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/auth.service";
import { apiErrorMessage } from "@/services/api";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset password — MedNexus" },
      {
        name: "description",
        content: "Set a new password for your MedNexus account using your secure reset link.",
      },
      { property: "og:title", content: "Reset password — MedNexus" },
      { property: "og:description", content: "Choose a new MedNexus account password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    setToken(params.get("token") ?? hash.get("token") ?? "");
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword({ token, new_password: password });
      toast.success("Password updated — please sign in");
      navigate({ to: "/login", replace: true });
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not reset your password"));
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
        <h1 className="mt-10 font-heading text-3xl font-extrabold">Set a new password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose a strong password of at least 8 characters.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          {!token && (
            <div className="space-y-2">
              <Label htmlFor="token">Reset token</Label>
              <Input
                id="token"
                required
                placeholder="Paste the token from your email"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="h-11"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="np">New password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="np"
                type={show ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 pl-9 pr-10"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
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
            {loading && <Loader2 className="size-4 animate-spin" />}
            {loading ? "Updating…" : "Update password"}
          </Button>
        </form>

        <p className="mt-6 text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
