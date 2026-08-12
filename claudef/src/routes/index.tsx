import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Building2,
  CheckCircle2,
  Mail,
  PhoneCall,
  Play,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { BrandMark } from "@/components/mednexus/BrandMark";
import { Button } from "@/components/ui/button";
import { ComingSoonBooks } from "@/components/mednexus/ComingSoonBooks";
import { DemoCountdownBanner } from "@/components/mednexus/DemoCountdownBanner";
import { VisitorLeadModal } from "@/components/mednexus/VisitorLeadModal";
import { authService } from "@/services/auth.service";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MedNexus — Medical QBank, MBBS & FCPS Education" },
      {
        name: "description",
        content: "MedNexus is a medical QBank for chapter-wise practice, full book revision, FCPS Part 1 prep, and custom AI & business management software.",
      },
      { property: "og:title", content: "MedNexus — Medical QBank & AI Solutions" },
      { property: "og:description", content: "Medical education, engineered." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const HIGHLIGHTS = [
  { icon: BookOpenCheck, title: "Chapter-precise practice", body: "Quiz any chapter sequentially, mixed, or at random with instant explanations." },
  { icon: Sparkles, title: "Full book revision", body: "Work through an entire book with your progress saved automatically." },
  { icon: BarChart3, title: "Analytics that guide revision", body: "Accuracy trends, time per question, and weak area tracking." },
  { icon: Building2, title: "Custom AI & Business Software", body: "Tailored AI learning tools and practice management software." },
];

function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const existing = authService.getCurrentUser();
    if (existing) {
      navigate({
        to: existing.role === "admin" ? "/admin/dashboard" : "/student/dashboard",
        replace: true,
      });
    }
  }, [navigate]);

  const handleTryDemo = async () => {
    try {
      await authService.login({ email: "demo@mednexus.com", password: "demo123" }, true);
      navigate({ to: "/student/dashboard", replace: true });
    } catch {
      navigate({ to: "/login" });
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <DemoCountdownBanner />
      <VisitorLeadModal />
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/">
            <BrandMark />
          </Link>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTryDemo}
              className="gap-2 border-primary/40 text-primary hover:bg-primary/10"
            >
              <Play className="size-3.5 fill-current" /> Try Demo Mode
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/contact">Contact Us</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/register">Create Account</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section — Expanded & Bigger */}
      <section className="relative overflow-hidden py-20 lg:py-28 gradient-night">
        <div className="absolute inset-0 grid-noise opacity-40" />
        <div className="relative mx-auto max-w-6xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-accent">
              <Sparkles className="size-4" /> Next-Gen Medical QBank & AI Solutions
            </div>

            <h1 className="font-heading text-4xl font-black leading-tight text-primary-foreground sm:text-6xl lg:text-7xl">
              Your next medical exam is decided by{" "}
              <span className="text-gradient-brand">deliberate practice</span>.
            </h1>

            <p className="mx-auto max-w-3xl text-lg text-primary-foreground/75 leading-relaxed sm:text-xl">
              Chapter-wise MCQs, full book revision, FCPS Part 1 & MBBS QBanks across all years, and custom AI & business management software — all in one platform.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Button size="lg" onClick={handleTryDemo} className="gap-2 text-base h-13 px-8 shadow-lg gradient-brand">
                <Play className="size-5 fill-current" /> Try Demo Mode
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/20 bg-transparent text-base h-13 px-8 text-primary-foreground hover:bg-primary-foreground/10">
                <Link to="/register">
                  Get Started <ArrowRight className="size-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="text-primary-foreground/80 hover:text-primary-foreground text-base h-13">
                <Link to="/contact">Contact & Complaints</Link>
              </Button>
            </div>
          </motion.div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {HIGHLIGHTS.map((h) => (
              <div key={h.title} className="rounded-2xl border border-primary-foreground/10 bg-primary-foreground/5 p-6 text-left backdrop-blur-sm">
                <span className="grid size-11 place-items-center rounded-xl bg-primary-foreground/10 text-accent mb-4">
                  <h.icon className="size-6" />
                </span>
                <h3 className="font-semibold text-base text-primary-foreground">{h.title}</h3>
                <p className="mt-1 text-xs text-primary-foreground/60 leading-relaxed">{h.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Coming Soon Books Showcase Section */}
      <section className="py-20 bg-surface">
        <div className="mx-auto max-w-7xl px-6">
          <ComingSoonBooks />
        </div>
      </section>

      {/* Contact & Custom Software Banner */}
      <section className="py-16 bg-background border-t border-border">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-3xl border border-border bg-card p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-lg">
            <div className="space-y-3 max-w-xl">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Custom AI & Business Software</span>
              <h2 className="font-heading text-2xl font-extrabold sm:text-3xl">Need Custom AI or Business Management Software?</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We develop medical educational tools, custom clinic management systems, pharmacy software, and AI workflow automation. Have a complaint or suggestion? Contact us directly.
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold pt-2">
                <a href="mailto:sherazalijan5@gmail.com" className="flex items-center gap-1.5 text-primary hover:underline">
                  <Mail className="size-4" /> sherazalijan5@gmail.com
                </a>
                <a href="https://wa.me/923189286959" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-success hover:underline">
                  <PhoneCall className="size-4" /> +92 318 9286959
                </a>
              </div>
            </div>

            <div className="flex flex-col gap-3 w-full md:w-auto">
              <Button asChild size="lg" className="gap-2">
                <Link to="/contact">
                  Open Complaint & Contact Box <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" onClick={handleTryDemo}>
                Try Demo Mode
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-10 text-xs text-muted-foreground">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <BrandMark />
          <p>© {new Date().getFullYear()} MedNexus · Email: sherazalijan5@gmail.com · WhatsApp: +92 318 9286959</p>
        </div>
      </footer>
    </div>
  );
}
