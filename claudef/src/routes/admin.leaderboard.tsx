import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Trophy } from "lucide-react";
import { PageHeader } from "@/components/mednexus/PageHeader";
import { EmptyState } from "@/components/mednexus/EmptyState";
import { QueryError } from "@/components/mednexus/QueryError";
import { adminService, type LeaderboardScope } from "@/services/admin.service";

export const Route = createFileRoute("/admin/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — MedNexus Admin" },
      { name: "description", content: "Global, weekly and monthly student rankings across the MedNexus platform." },
      { property: "og:title", content: "Leaderboard — MedNexus Admin" },
      { property: "og:description", content: "Student rankings across MedNexus." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Leaderboard,
});

const SCOPES: LeaderboardScope[] = ["global", "weekly", "monthly"];

function Leaderboard() {
  const [scope, setScope] = useState<LeaderboardScope>("global");
  const board = useQuery({ queryKey: ["leaderboard", scope], queryFn: () => adminService.getLeaderboard(scope) });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Leaderboard"
        subtitle="Who is putting in the reps."
        actions={
          <div className="flex gap-2">
            {SCOPES.map((s) => (
              <button key={s} type="button" onClick={() => setScope(s)}
                className={`rounded-full border px-4 py-2 text-sm font-medium capitalize transition-colors ${scope === s ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"}`}>
                {s}
              </button>
            ))}
          </div>
        }
      />

      {board.isLoading ? (
        <div className="grid place-items-center py-20"><Loader2 className="size-6 animate-spin text-primary" /></div>
      ) : board.isError ? (
        <QueryError error={board.error} onRetry={() => board.refetch()} title="Couldn't load the leaderboard" />
      ) : (board.data?.length ?? 0) === 0 ? (
        <EmptyState icon={Trophy} title="No rankings yet" description="Rankings appear once students submit attempts." />
      ) : (
        <div className="card-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-surface text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Rank</th>
                  <th className="px-6 py-3.5 font-semibold">Student</th>
                  <th className="px-6 py-3.5 font-semibold">Attempts</th>
                  <th className="px-6 py-3.5 font-semibold">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {board.data!.map((e) => (
                  <tr key={e.user_id} className="hover:bg-surface">
                    <td className="px-6 py-4">
                      <span className={`grid size-8 place-items-center rounded-lg font-bold ${e.rank <= 3 ? "gradient-brand text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        {e.rank}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold">{e.full_name}</td>
                    <td className="px-6 py-4 tabular-nums text-muted-foreground">{e.total_attempts}</td>
                    <td className="px-6 py-4 font-bold tabular-nums">{Math.round(e.score_percentage)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
