import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, BookOpen, FilePlus2, Layers, Loader2, ListChecks, Megaphone, Percent, ShieldCheck, UserCheck, UserX, Users } from "lucide-react";
import { PageHeader } from "@/components/mednexus/PageHeader";
import { StatCard } from "@/components/mednexus/StatCard";
import { QueryError } from "@/components/mednexus/QueryError";
import { Button } from "@/components/ui/button";
import { adminService } from "@/services/admin.service";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — MedNexus" },
      { name: "description", content: "Enterprise overview of MedNexus users, content volume, attempts and platform accuracy." },
      { property: "og:title", content: "Admin Dashboard — MedNexus" },
      { property: "og:description", content: "Platform-wide metrics and controls for MedNexus administrators." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const dash = useQuery({ queryKey: ["admin-dashboard"], queryFn: adminService.getDashboard });
  const users = useQuery({ queryKey: ["admin-users"], queryFn: adminService.getUsers });
  const d = dash.data;

  const pending = (users.data ?? []).filter((u) => u.account_status === "pending");
  const suspended = (users.data ?? []).filter((u) => u.account_status === "suspended");

  const contentData = [
    { name: "Books", value: d?.total_books ?? 0 },
    { name: "Chapters", value: d?.total_chapters ?? 0 },
    { name: "MCQs", value: d?.total_mcqs ?? 0 },
    { name: "Attempts", value: d?.total_attempts ?? 0 },
  ];
  const userSplit = [
    { name: "Active", value: d?.active_users ?? 0, fill: "var(--color-success)" },
    { name: "Disabled", value: d?.disabled_users ?? 0, fill: "var(--color-destructive)" },
    { name: "Other", value: Math.max(0, (d?.total_users ?? 0) - (d?.active_users ?? 0) - (d?.disabled_users ?? 0)), fill: "var(--color-warning)" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin console"
        subtitle="Platform-wide health, content volume and account controls."
        actions={
          <>
            <Button asChild variant="outline" className="gap-2"><Link to="/admin/users"><Users className="size-4" /> Manage users</Link></Button>
            <Button asChild className="gap-2"><Link to="/admin/mcq-upload"><FilePlus2 className="size-4" /> Upload MCQ</Link></Button>
          </>
        }
      />

      {dash.isLoading ? (
        <div className="grid place-items-center py-20"><Loader2 className="size-6 animate-spin text-primary" /></div>
      ) : dash.isError ? (
        <QueryError error={dash.error} onRetry={() => dash.refetch()} title="Couldn't load the dashboard" />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard index={0} label="Total users" value={d?.total_users ?? 0} icon={Users} />
            <StatCard index={1} label="Active users" value={d?.active_users ?? 0} icon={UserCheck} accent="success" />
            <StatCard index={2} label="Disabled users" value={d?.disabled_users ?? 0} icon={UserX} accent="destructive" />
            <StatCard index={3} label="Average score" value={`${Math.round(d?.average_score ?? 0)}%`} icon={Percent} accent="accent" />
            <StatCard index={4} label="Books" value={d?.total_books ?? 0} icon={BookOpen} />
            <StatCard index={5} label="Chapters" value={d?.total_chapters ?? 0} icon={Layers} accent="accent" />
            <StatCard index={6} label="MCQs" value={d?.total_mcqs ?? 0} icon={ListChecks} />
            <StatCard index={7} label="Total attempts" value={d?.total_attempts ?? 0} icon={Activity} accent="warning" />
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
            <div className="card-surface p-6">
              <h2 className="font-heading text-lg font-bold">Content & engagement volume</h2>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={contentData} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-card)", fontSize: 12 }} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="var(--color-primary)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card-surface p-6">
              <h2 className="font-heading text-lg font-bold">Account distribution</h2>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={userSplit} dataKey="value" nameKey="name" innerRadius={54} outerRadius={80} paddingAngle={3}>
                      {userSplit.map((s) => <Cell key={s.name} fill={s.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-card)", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-2 text-sm">
                {userSplit.map((s) => (
                  <li key={s.name} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: s.fill }} />{s.name}</span>
                    <span className="font-semibold tabular-nums">{s.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <div className="card-surface p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-heading text-lg font-bold">Approval centre</h2>
                <Button asChild variant="ghost" size="sm"><Link to="/admin/users">Open</Link></Button>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {pending.length} account{pending.length === 1 ? "" : "s"} awaiting approval · {suspended.length} suspended
              </p>
              <ul className="mt-4 space-y-2">
                {pending.slice(0, 4).map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning/8 px-4 py-3 text-sm">
                    <span className="min-w-0 truncate font-medium">{u.full_name} · {u.email}</span>
                    <span className="shrink-0 text-xs font-semibold uppercase text-warning">pending</span>
                  </li>
                ))}
                {pending.length === 0 && <li className="text-sm text-muted-foreground">No pending approvals.</li>}
              </ul>
            </div>

            <div className="card-surface p-6">
              <h2 className="font-heading text-lg font-bold">Quick actions</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  { to: "/admin/users" as const, label: "Manage users", icon: Users },
                  { to: "/admin/books" as const, label: "Books & chapters", icon: BookOpen },
                  { to: "/admin/mcq-upload" as const, label: "Upload MCQ", icon: FilePlus2 },
                  { to: "/admin/announcements" as const, label: "Announcement", icon: Megaphone },
                ].map((a) => (
                  <Link key={a.label} to={a.to} className="flex items-center gap-3 rounded-xl border border-border p-4 transition-colors hover:border-primary/50 hover:bg-primary/5">
                    <a.icon className="size-5 shrink-0 text-primary" />
                    <span className="text-sm font-semibold">{a.label}</span>
                  </Link>
                ))}
              </div>
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-surface p-4 text-xs text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" />
                Status changes are written through PATCH /admin/users/&#123;id&#125;/status.
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
