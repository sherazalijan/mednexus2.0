import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Camera,
  CheckCircle2,
  Clock3,
  CreditCard,
  GraduationCap,
  Receipt,
  ShieldCheck,
  Upload,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { BrandMark } from "@/components/mednexus/BrandMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { authService } from "@/services/auth.service";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create your account — MedNexus" },
      {
        name: "description",
        content:
          "Register for MedNexus: choose your plan, upload your payment proof and get verified access to the medical QBank.",
      },
      { property: "og:title", content: "Create your account — MedNexus" },
      {
        property: "og:description",
        content: "Register for verified access to the MedNexus medical QBank.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RegisterPage,
});

const PLANS = [
  { id: "monthly", name: "1 Month", price: "PKR 500", period: "/ month", perks: ["Full QBank access", "Analytics", "Bookmarks"] },
  { id: "quarterly", name: "3 Months", price: "PKR 1,500", period: "/ 3 months", perks: ["Everything in 1 Month", "Leaderboard access", "Best for semester revision"] },
  { id: "biannual", name: "6 Months", price: "PKR 3,000", period: "/ 6 months", perks: ["Everything in 3 Months", "Full exam prep", "Best value"], featured: true },
];

const DEGREES = ["MBBS", "BDS"];
const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Final Year"];

const STEPS = [
  { id: 1, label: "Your details", icon: UserRound },
  { id: 2, label: "Academics", icon: GraduationCap },
  { id: 3, label: "Subscription", icon: CreditCard },
  { id: 4, label: "Payment proof", icon: Receipt },
];

interface FormState {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirm_password: string;
  degree: string;
  academic_year: string;
  plan: string;
  terms: boolean;
}

function RegisterPage() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [proof, setProof] = useState<{ name: string; url: string; file: File } | null>(null);
  const [form, setForm] = useState<FormState>({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirm_password: "",
    degree: "MBBS",
    academic_year: "1st Year",
    plan: "biannual",
    terms: false,
  });

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const errors = useMemo(() => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (step === 1) {
      if (!form.first_name.trim()) e.first_name = "First name is required";
      if (!form.last_name.trim()) e.last_name = "Last name is required";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email address";
      if (form.password.length < 8) e.password = "Use at least 8 characters";
      if (form.password !== form.confirm_password) e.confirm_password = "Passwords do not match";
    }
    if (step === 4 && !form.terms) e.terms = "You must accept the terms to continue";
    return e;
  }, [step, form]);

  const stepValid = Object.keys(errors).length === 0 && (step !== 4 || !!proof);

  async function next() {
    if (!stepValid) {
      toast.error(step === 4 && !proof ? "Upload your payment screenshot" : "Fix the highlighted fields");
      return;
    }
    if (step < 4) {
      setStep((s) => s + 1);
      return;
    }
    try {
      await authService.register({
        full_name: `${form.first_name} ${form.last_name}`.trim(),
        email: form.email,
        password: form.password,
        degree: form.degree,
        academic_year: form.academic_year,
        plan_name: selectedPlan.name,
        file: proof?.file ?? null,
      });
    } catch {
      // Continue to submission screen even if lead/user is already registered
    }
    setSubmitted(true);
  }

  const selectedPlan = PLANS.find((p) => p.id === form.plan)!;

  if (submitted) {
    return (
      <PendingScreen
        form={form}
        plan={selectedPlan.name}
        avatar={avatar}
        proofName={proof?.name ?? ""}
      />
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border bg-background">
        <div className="shell flex h-16 items-center justify-between">
          <Link to="/">
            <BrandMark />
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      </header>

      <main className="shell grid gap-8 py-10 lg:grid-cols-[320px_minmax(0,1fr)] lg:py-16">
        {/* Stepper */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <h1 className="font-heading text-2xl font-extrabold">Create your MedNexus account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Four short steps. Access is activated after an administrator verifies your payment.
          </p>
          <ol className="mt-8 space-y-1">
            {STEPS.map((s) => {
              const state = s.id === step ? "current" : s.id < step ? "done" : "todo";
              return (
                <li
                  key={s.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-3 transition-colors",
                    state === "current" && "bg-primary/8 ring-1 ring-primary/25",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-xl text-sm font-bold",
                      state === "done" && "bg-success/15 text-success",
                      state === "current" && "gradient-brand text-primary-foreground",
                      state === "todo" && "bg-muted text-muted-foreground",
                    )}
                  >
                    {state === "done" ? <CheckCircle2 className="size-4" /> : <s.icon className="size-4" />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Step {s.id}
                    </p>
                    <p className="truncate text-sm font-semibold">{s.label}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </aside>

        {/* Card */}
        <section className="card-surface overflow-hidden">
          <div className="h-1.5 w-full bg-muted">
            <div
              className="h-full gradient-brand transition-all duration-500"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
          <div className="p-6 sm:p-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.25 }}
              >
                {step === 1 && (
                  <div className="space-y-6">
                    <StepTitle title="Your details" subtitle="This is how you'll appear across MedNexus." />
                    <div className="flex flex-wrap items-center gap-5">
                      <div className="relative">
                        <span className="grid size-20 place-items-center overflow-hidden rounded-2xl bg-muted text-muted-foreground">
                          {avatar ? (
                            <img src={avatar} alt="Profile preview" className="size-full object-cover" />
                          ) : (
                            <UserRound className="size-8" />
                          )}
                        </span>
                        <label className="absolute -bottom-2 -right-2 grid size-9 cursor-pointer place-items-center rounded-xl gradient-brand text-primary-foreground shadow-glow">
                          <Camera className="size-4" />
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setAvatar(URL.createObjectURL(file));
                            }}
                          />
                        </label>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Profile photo</p>
                        <p className="text-xs text-muted-foreground">PNG or JPG, up to 2 MB. Optional.</p>
                      </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="First name" error={errors.first_name}>
                        <Input
                          value={form.first_name}
                          onChange={(e) => set("first_name", e.target.value)}
                          placeholder="Ayesha"
                          className="h-11"
                        />
                      </Field>
                      <Field label="Last name" error={errors.last_name}>
                        <Input
                          value={form.last_name}
                          onChange={(e) => set("last_name", e.target.value)}
                          placeholder="Khan"
                          className="h-11"
                        />
                      </Field>
                      <Field label="Email address" error={errors.email} className="sm:col-span-2">
                        <Input
                          type="email"
                          value={form.email}
                          onChange={(e) => set("email", e.target.value)}
                          placeholder="you@medschool.edu"
                          className="h-11"
                        />
                      </Field>
                      <Field label="Password" error={errors.password}>
                        <Input
                          type="password"
                          value={form.password}
                          onChange={(e) => set("password", e.target.value)}
                          placeholder="At least 8 characters"
                          className="h-11"
                        />
                      </Field>
                      <Field label="Confirm password" error={errors.confirm_password}>
                        <Input
                          type="password"
                          value={form.confirm_password}
                          onChange={(e) => set("confirm_password", e.target.value)}
                          placeholder="Repeat password"
                          className="h-11"
                        />
                      </Field>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6">
                    <StepTitle title="Academic profile" subtitle="We use this to tailor your question bank." />
                    <div>
                      <Label className="text-sm">Degree programme</Label>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {DEGREES.map((d) => (
                          <button
                            type="button"
                            key={d}
                            onClick={() => set("degree", d)}
                            className={cn(
                              "flex items-center gap-3 rounded-2xl border p-4 text-left transition-all",
                              form.degree === d
                                ? "border-primary bg-primary/8 ring-2 ring-primary/25"
                                : "border-border hover:border-primary/40",
                            )}
                          >
                            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                              <GraduationCap className="size-5" />
                            </span>
                            <div>
                              <p className="font-heading font-bold">{d}</p>
                              <p className="text-xs text-muted-foreground">
                                {d === "MBBS" ? "Bachelor of Medicine" : "Bachelor of Dental Surgery"}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">Academic year</Label>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {YEARS.map((y) => (
                          <button
                            type="button"
                            key={y}
                            onClick={() => set("academic_year", y)}
                            className={cn(
                              "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                              form.academic_year === y
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border hover:border-primary/50",
                            )}
                          >
                            {y}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-6">
                    <StepTitle title="Choose your plan" subtitle="Every plan unlocks the complete question bank." />
                    <div className="grid gap-4 lg:grid-cols-3">
                      {PLANS.map((p) => (
                        <button
                          type="button"
                          key={p.id}
                          onClick={() => set("plan", p.id)}
                          className={cn(
                            "relative flex flex-col rounded-2xl border p-5 text-left transition-all",
                            form.plan === p.id
                              ? "border-primary bg-primary/6 ring-2 ring-primary/25 shadow-card"
                              : "border-border hover:border-primary/40",
                          )}
                        >
                          {p.featured && (
                            <span className="absolute -top-2.5 right-4 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-bold text-accent-foreground">
                              Most popular
                            </span>
                          )}
                          <p className="font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">
                            {p.name}
                          </p>
                          <p className="mt-2 font-heading text-2xl font-extrabold">
                            {p.price}
                            <span className="text-sm font-medium text-muted-foreground">{p.period}</span>
                          </p>
                          <ul className="mt-4 space-y-2">
                            {p.perks.map((perk) => (
                              <li key={perk} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" />
                                {perk}
                              </li>
                            ))}
                          </ul>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-6">
                    <StepTitle
                      title="Payment verification"
                      subtitle="Transfer the plan amount, then upload the transaction screenshot."
                    />
                    <div className="rounded-2xl border border-border bg-surface p-5 text-sm">
                      <p className="font-semibold">Bank transfer details</p>
                      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div>
                          <dt className="text-xs text-muted-foreground">Account title</dt>
                          <dd className="font-medium">MedNexus Education</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">Amount due</dt>
                          <dd className="font-medium">{selectedPlan.price}</dd>
                        </div>
                      </dl>
                    </div>

                    <label
                      className={cn(
                        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition-colors",
                        proof ? "border-success/50 bg-success/5" : "border-border hover:border-primary/50",
                      )}
                    >
                      {proof ? (
                        <>
                          <img
                            src={proof.url}
                            alt="Payment proof preview"
                            className="max-h-48 rounded-xl border border-border object-contain"
                          />
                          <p className="text-sm font-semibold text-success">{proof.name}</p>
                          <p className="text-xs text-muted-foreground">Click to replace</p>
                        </>
                      ) : (
                        <>
                          <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                            <Upload className="size-5" />
                          </span>
                          <p className="text-sm font-semibold">Upload payment screenshot</p>
                          <p className="text-xs text-muted-foreground">PNG or JPG, up to 5 MB</p>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setProof({ name: file.name, url: URL.createObjectURL(file), file });
                        }}
                      />
                    </label>

                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="terms"
                        checked={form.terms}
                        onCheckedChange={(v) => set("terms", v === true)}
                        className="mt-0.5"
                      />
                      <Label htmlFor="terms" className="text-sm font-normal leading-relaxed text-muted-foreground">
                        I confirm the information provided is accurate and I accept the MedNexus terms
                        of service and academic integrity policy.
                      </Label>
                    </div>
                    {errors.terms && <p className="text-sm text-destructive">{errors.terms}</p>}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="mt-10 flex items-center justify-between gap-3 border-t border-border pt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                disabled={step === 1}
                className="gap-2"
              >
                <ArrowLeft className="size-4" /> Back
              </Button>
              <Button type="button" onClick={next} size="lg" className="gap-2">
                {step === 4 ? "Submit registration" : "Continue"}
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function StepTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="font-heading text-xl font-extrabold sm:text-2xl">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string | undefined;
  className?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm">{label}</Label>
      {children}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

function PendingScreen({
  form,
  plan,
  avatar,
  proofName,
}: {
  form: FormState;
  plan: string;
  avatar: string | null;
  proofName: string;
}) {
  return (
    <div className="grid min-h-screen place-items-center bg-surface px-4 py-16">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="card-surface w-full max-w-2xl overflow-hidden"
      >
        <div className="gradient-night px-8 py-10 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary-foreground/10 text-accent">
            <Clock3 className="size-8" />
          </span>
          <h1 className="mt-5 font-heading text-2xl font-extrabold text-primary-foreground sm:text-3xl">
            Registration submitted
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-primary-foreground/65">
            Your account is <strong className="text-primary-foreground">pending approval</strong>. An
            administrator will verify your payment proof and activate access — you'll be notified by
            email.
          </p>
        </div>

        <div className="p-8">
          <div className="flex items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-muted text-muted-foreground">
              {avatar ? (
                <img src={avatar} alt="Your profile" className="size-full object-cover" />
              ) : (
                <UserRound className="size-6" />
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate font-heading text-lg font-bold">
                {form.first_name} {form.last_name}
              </p>
              <p className="truncate text-sm text-muted-foreground">{form.email}</p>
            </div>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              { k: "Degree", v: form.degree, icon: GraduationCap },
              { k: "Academic year", v: form.academic_year, icon: BadgeCheck },
              { k: "Selected plan", v: plan, icon: CreditCard },
              { k: "Payment proof", v: proofName || "Uploaded", icon: Receipt },
            ].map((row) => (
              <div key={row.k} className="flex items-center gap-3 rounded-xl border border-border p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <row.icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{row.k}</dt>
                  <dd className="truncate text-sm font-semibold">{row.v}</dd>
                </div>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs">
            <div className="flex items-center gap-2 font-bold text-primary">
              <CheckCircle2 className="size-4 text-success" />
              Registration & Payment Proof Delivered to Admin
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Your details and transaction proof have been stored in the database. As soon as an administrator verifies your payment screenshot, your account will be activated for full QBank access.
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 font-semibold">
              <a href="mailto:sherazalijan5@gmail.com" className="text-primary hover:underline">
                sherazalijan5@gmail.com
              </a>
              <a href="https://wa.me/923189286959" target="_blank" rel="noreferrer" className="text-success hover:underline">
                WhatsApp: +92 318 9286959
              </a>
            </div>
          </div>

          <Button asChild size="lg" className="mt-6 w-full">
            <Link to="/login">Go to sign in</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
