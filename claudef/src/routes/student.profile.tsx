import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Award, CalendarDays, CreditCard, KeyRound, Loader2, Mail, ShieldCheck, Trophy } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/mednexus/PageHeader";
import { StatusBadge } from "@/components/mednexus/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { userService } from "@/services/user.service";
import { authService } from "@/services/auth.service";
import { apiErrorMessage } from "@/services/api";

export const Route = createFileRoute("/student/profile")({
  head: () => ({
    meta: [
      { title: "Profile — MedNexus" },
      { name: "description", content: "Manage your MedNexus profile, password, subscription details and quiz history." },
      { property: "og:title", content: "Profile — MedNexus" },
      { property: "og:description", content: "Account, subscription and achievements on MedNexus." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { user } = useAuth();
  const id = user?.user_id ?? 0;
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");

  const profile = useQuery({ queryKey: ["profile", id], queryFn: () => userService.getProfile(id), enabled: !!id });
  const subscription = useQuery({ queryKey: ["subscription", id], queryFn: () => userService.getSubscription(id), enabled: !!id });
  const history = useQuery({ queryKey: ["history", id], queryFn: () => userService.getHistory(id), enabled: !!id });
  const stats = useQuery({ queryKey: ["stats", id], queryFn: () => userService.getStats(id), enabled: !!id });

  const changePassword = useMutation({
    mutationFn: () => authService.changePassword({ current_password: current, new_password: next }),
    onSuccess: () => { toast.success("Password updated"); setCurrent(""); setNext(""); },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not change password")),
  });

  const initials = (profile.data?.full_name || user?.full_name || "MN")
    .split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

  const hist = history.data ?? [];
  const best = hist.reduce((m, h) => Math.max(m, h.score_percentage), 0);

  const achievements = [
    { icon: Trophy, label: "First attempt", unlocked: hist.length >= 1 },
    { icon: Award, label: "10 quizzes", unlocked: hist.length >= 10 },
    { icon: ShieldCheck, label: "80%+ score", unlocked: best >= 80 },
    { icon: CalendarDays, label: "Active subscription", unlocked: !!subscription.data?.active },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Profile" subtitle="Account, security and subscription." />

      <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="card-surface overflow-hidden">
          <div className="gradient-night p-8">
            <div className="flex flex-wrap items-center gap-5">
              <span className="grid size-20 shrink-0 place-items-center rounded-2xl bg-primary-foreground/10 font-heading text-2xl font-extrabold text-primary-foreground">
                {initials}
              </span>
              <div className="min-w-0">
                <h2 className="truncate font-heading text-2xl font-extrabold text-primary-foreground">
                  {profile.data?.full_name || user?.full_name}
                </h2>
                <p className="mt-1 flex items-center gap-2 text-sm text-primary-foreground/65">
                  <Mail className="size-4" /> {profile.data?.email ?? "—"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-primary-foreground/10 px-2.5 py-1 text-xs font-semibold capitalize text-primary-foreground">
                    {profile.data?.role ?? user?.role}
                  </span>
                  {profile.data && <StatusBadge status={profile.data.account_status} />}
                </div>
              </div>
            </div>
          </div>
          <div className="grid gap-4 p-6 sm:grid-cols-3">
            <Metric label="Quizzes" value={stats.data?.quizzes_taken ?? 0} />
            <Metric label="Average score" value={`${Math.round(stats.data?.average_score ?? 0)}%`} />
            <Metric label="Best score" value={`${Math.round(best)}%`} />
          </div>
        </div>

        <div className="card-surface p-6">
          <div className="flex items-center gap-2">
            <CreditCard className="size-5 text-primary" />
            <h2 className="font-heading text-lg font-bold">Subscription</h2>
          </div>
          {subscription.isLoading ? (
            <Loader2 className="mt-6 size-5 animate-spin text-primary" />
          ) : (
            <dl className="mt-5 space-y-3 text-sm">
              <Row k="Plan" v={subscription.data?.plan_name ?? "—"} />
              <Row k="Status" v={subscription.data?.active ? "Active" : "Inactive"} />
              <Row k="Started" v={subscription.data?.start_date ? new Date(subscription.data.start_date).toLocaleDateString() : "—"} />
              <Row k="Expires" v={subscription.data?.end_date ? new Date(subscription.data.end_date).toLocaleDateString() : "—"} />
            </dl>
          )}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1.4fr]">
        <div className="card-surface p-6">
          <div className="flex items-center gap-2">
            <KeyRound className="size-5 text-primary" />
            <h2 className="font-heading text-lg font-bold">Change password</h2>
          </div>
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => { e.preventDefault(); changePassword.mutate(); }}
          >
            <div className="space-y-2">
              <Label htmlFor="cp">Current password</Label>
              <Input id="cp" type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="np">New password</Label>
              <Input id="np" type="password" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} className="h-11" />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={changePassword.isPending}>
              {changePassword.isPending && <Loader2 className="size-4 animate-spin" />} Update password
            </Button>
          </form>
        </div>

        <div className="card-surface p-6">
          <h2 className="font-heading text-lg font-bold">Achievements</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {achievements.map((a) => (
              <div key={a.label} className={`flex items-center gap-3 rounded-xl border p-4 ${a.unlocked ? "border-accent/40 bg-accent/8" : "border-border opacity-60"}`}>
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${a.unlocked ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"}`}>
                  <a.icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{a.label}</p>
                  <p className="text-xs text-muted-foreground">{a.unlocked ? "Unlocked" : "Locked"}</p>
                </div>
              </div>
            ))}
          </div>

          <h3 className="mt-8 font-heading text-base font-bold">Quiz history</h3>
          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {hist.length === 0 ? (
              <li className="text-sm text-muted-foreground">No attempts yet.</li>
            ) : hist.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-2.5 text-sm">
                <span className="truncate capitalize">{h.quiz_type}{h.chapter_id ? ` · #${h.chapter_id}` : ""}</span>
                <span className="shrink-0 font-semibold tabular-nums">{Math.round(h.score_percentage)}%</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="font-heading text-2xl font-extrabold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-semibold">{v}</dd>
    </div>
  );
}
