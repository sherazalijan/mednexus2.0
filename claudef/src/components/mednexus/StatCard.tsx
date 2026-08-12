import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  accent = "primary",
  index = 0,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string | undefined;
  accent?: "primary" | "accent" | "success" | "warning" | "destructive";
  index?: number;
}) {
  const accents: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/15 text-accent",
    success: "bg-success/12 text-success",
    warning: "bg-warning/15 text-warning",
    destructive: "bg-destructive/10 text-destructive",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className="card-surface group relative overflow-hidden p-5 transition-shadow hover:shadow-elevated"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 font-heading text-3xl font-extrabold tabular-nums">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", accents[accent])}>
          <Icon className="size-5" />
        </span>
      </div>
      <span className="pointer-events-none absolute -bottom-16 -right-10 size-32 rounded-full bg-primary/5 blur-2xl transition-opacity group-hover:opacity-100" />
    </motion.div>
  );
}
