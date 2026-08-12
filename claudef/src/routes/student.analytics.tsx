import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Target, Trophy, XCircle } from "lucide-react";
import { PageHeader } from "@/components/mednexus/PageHeader";
import { StatCard } from "@/components/mednexus/StatCard";
import { PerformanceChart } from "@/components/mednexus/PerformanceChart";
import { QueryError } from "@/components/mednexus/QueryError";
import { useAuth } from "@/hooks/useAuth";
import { userService } from "@/services/user.service";

export const Route = createFileRoute("/student/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — MedNexus" },
      { name: "description", content: "Deep performance analytics: accuracy trend and full attempt log for your MedNexus account." },
      { property: "og:title", content: "Analytics — MedNexus" },
      { property: "og:description", content: "Accuracy trends and attempt history on MedNexus." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentAnalytics,
});

function StudentAnalytics() {
  const { user } = useAuth();
  const id = user?.user_id ?? 0;
  const stats = useQuery({ queryKey: ["stats", id], queryFn: () => userService.getStats(id), enabled: !!id });
  const history = useQuery({ queryKey: ["history", id], queryFn: () => userService.getHistory(id), enabled: !!id });
  const hist = history.data ?? [];

  return (
    <div className="space-y-8">
      <PageHeader title="Analytics" subtitle="Every attempt, measured." />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard index={0} label="Quizzes taken" value={stats.data?.quizzes_taken ?? 0} icon={Trophy} />
        <StatCard index={1} label="Correct" value={stats.data?.correct_answers ?? 0} icon={CheckCircle2} accent="success" />
        <StatCard index={2} label="Incorrect" value={stats.data?.incorrect_answers ?? 0} icon={XCircle} accent="destructive" />
        <StatCard index={3} label="Average score" value={`${Math.round(stats.data?.average_score ?? 0)}%`} icon={Target} accent="accent" />
      </section>

      <section className="card-surface p-6">
        <h2 className="font-heading text-lg font-bold">Accuracy trend</h2>
        {history.isLoading ? (
          <div className="grid h-72 place-items-center"><Loader2 className="size-5 animate-spin text-primary" /></div>
        ) : history.isError ? (
          <QueryError error={history.error} onRetry={() => history.refetch()} title="Couldn't load attempt history" />
        ) : (
          <PerformanceChart history={hist} />
        )}
      </section>

      <section className="card-surface overflow-hidden">
        <div className="border-b border-border p-6">
          <h2 className="font-heading text-lg font-bold">Attempt log</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-3 font-semibold">Type</th>
                <th className="px-6 py-3 font-semibold">Chapter</th>
                <th className="px-6 py-3 font-semibold">Correct</th>
                <th className="px-6 py-3 font-semibold">Score</th>
                <th className="px-6 py-3 font-semibold">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {hist.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">No attempts yet.</td></tr>
              ) : hist.map((h) => (
                <tr key={h.id} className="hover:bg-surface">
                  <td className="px-6 py-3 font-medium capitalize">{h.quiz_type}</td>
                  <td className="px-6 py-3 text-muted-foreground">{h.chapter_id ? `#${h.chapter_id}` : "—"}</td>
                  <td className="px-6 py-3 tabular-nums">{h.correct_answers}/{h.total_questions}</td>
                  <td className="px-6 py-3 font-semibold tabular-nums">{Math.round(h.score_percentage)}%</td>
                  <td className="px-6 py-3 text-muted-foreground">{new Date(h.completed_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
