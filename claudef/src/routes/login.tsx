import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { BrandMark } from "@/components/mednexus/BrandMark";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DemoCountdownBanner } from "@/components/mednexus/DemoCountdownBanner";
import { authService } from "@/services/auth.service";
import { apiErrorMessage } from "@/services/api";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — MedNexus" },
      {
        name: "description",
        content: "Sign in to your MedNexus account to access your medical QBank, quizzes and analytics.",
      },
      { property: "og:title", content: "Sign in — MedNexus" },
      { property: "og:description", content: "Access your MedNexus medical QBank dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

const HIGHLIGHTS = [
  { icon: BookOpenCheck, title: "Chapter-precise practice", body: "Quiz any chapter sequentially or at random." },
  { icon: BarChart3, title: "Analytics that guide revision", body: "Accuracy trends across every attempt." },
  { icon: ShieldCheck, title: "Verified, secure access", body: "JWT sessions with device-aware sign-in." },
];

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const existing = authService.getCurrentUser();
    if (existing) {
      navigate({
        to: existing.role === "admin" ? "/admin/dashboard" : "/student/dashboard",
        replace: true,
      });
    }
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await authService.login({ email, password }, remember);
      toast.success(`Welcome back, ${data.full_name || "doctor"}`);
      navigate({
        to: data.role === "admin" ? "/admin/dashboard" : "/student/dashboard",
        replace: true,
      });
    } catch (error) {
      toast.error(apiErrorMessage(error, "Unable to sign in"));
    } finally {
      setLoading(false);
    }
  }

  const handleDemoLogin = async () => {
    try {
      await authService.login({
        email: "demo@mednexus.com",
        password: "demo123",
      }, true);

      navigate({
        to: "/student/dashboard",
        replace: true,
      });
    } catch (error) {
      toast.error(apiErrorMessage(error, "Unable to sign in with demo account"));
    }
  };


  return (
    <div className="flex flex-col min-h-screen">
      <DemoCountdownBanner />
      <div className="grid flex-1 min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden gradient-night lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 grid-noise opacity-40" />
        <div className="relative">
          <Link to="/">
            <BrandMark tone="dark" />
          </Link>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative max-w-lg"
        >
          <h2 className="font-heading text-4xl font-extrabold leading-tight text-primary-foreground">
            Your next exam is decided by <span className="text-gradient-brand">deliberate practice</span>.
          </h2>
          <p className="mt-4 text-primary-foreground/65">
            Sign in to continue where you left off — your chapters, bookmarks and performance curve
            are waiting.
          </p>
          <ul className="mt-10 space-y-5">
            {HIGHLIGHTS.map((h) => (
              <li key={h.title} className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-foreground/10 text-accent">
                  <h.icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-primary-foreground">{h.title}</p>
                  <p className="text-sm text-primary-foreground/60">{h.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </motion.div>
        <p className="relative text-xs text-primary-foreground/40">
          © {new Date().getFullYear()} MedNexus · Medical education, engineered.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-background px-4 py-12 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden">
            <Link to="/">
              <BrandMark />
            </Link>
          </div>
          <h1 className="mt-8 font-heading text-3xl font-extrabold lg:mt-0">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with the credentials issued to your MedNexus account.
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

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
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

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={remember}
                  onCheckedChange={(v) => setRemember(v === true)}
                  aria-label="Remember me"
                />
                Remember me
              </label>
              <Link
                to="/forgot-password"
                className="text-sm font-semibold text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <Button type="submit" size="lg" className="w-full gap-2" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              {loading ? "Signing in…" : "Sign in"}
              {!loading && <ArrowRight className="size-4" />}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              onClick={handleDemoLogin}
            >
              Try Demo
            </Button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            New to MedNexus?{" "}
            <Link to="/register" className="font-semibold text-primary hover:underline">
              Create an account
            </Link>
          </p>

          <div className="mt-8 rounded-xl border border-border bg-card p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-primary uppercase tracking-wider">Support & Custom AI Software</span>
              <Link to="/contact" className="font-semibold text-primary hover:underline">
                Contact Us & Complaints →
              </Link>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Need custom AI educational tools or business management software? Have a complaint or book suggestion?
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/60">
              <a href="mailto:sherazalijan5@gmail.com" className="text-primary hover:underline">
                sherazalijan5@gmail.com
              </a>
              <a href="https://wa.me/923189286959" target="_blank" rel="noreferrer" className="text-success hover:underline font-semibold">
                WhatsApp: +92 318 9286959
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  </div>
);
}