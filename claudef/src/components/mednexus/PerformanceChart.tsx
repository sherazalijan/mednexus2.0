import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { QuizHistory } from "@/types/user";

export function PerformanceChart({ history }: { history: QuizHistory[] }) {
  const data = [...history]
    .sort((a, b) => new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime())
    .map((h) => ({
      date: new Date(h.completed_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      score: Math.round(h.score_percentage),
    }));

  if (data.length === 0) {
    return (
      <div className="grid h-72 place-items-center text-sm text-muted-foreground">
        No attempts yet — your performance curve appears here after your first quiz.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="mnScore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
          />
          <YAxis
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid var(--color-border)",
              background: "var(--color-card)",
              color: "var(--color-card-foreground)",
              fontSize: 12,
            }}
            formatter={(v: number | string) => [`${v}%`, "Score"]}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="var(--color-primary)"
            strokeWidth={2.5}
            fill="url(#mnScore)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
