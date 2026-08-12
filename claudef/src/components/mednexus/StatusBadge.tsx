import { cn } from "@/lib/utils";

const MAP: Record<string, string> = {
  active: "bg-success/12 text-success border-success/25",
  pending: "bg-warning/15 text-warning border-warning/30",
  suspended: "bg-destructive/10 text-destructive border-destructive/25",
  disabled: "bg-muted text-muted-foreground border-border",
  approved: "bg-success/12 text-success border-success/25",
  rejected: "bg-destructive/10 text-destructive border-destructive/25",
};

export function StatusBadge({ status, className }: { status: string; className?: string | undefined }) {
  const key = (status || "").toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize",
        MAP[key] ?? MAP["disabled"],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status || "unknown"}
    </span>
  );
}
