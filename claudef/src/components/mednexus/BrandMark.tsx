import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  tone = "light",
  showWordmark = true,
}: {
  className?: string | undefined;
  tone?: "light" | "dark";
  showWordmark?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="grid size-9 shrink-0 place-items-center rounded-xl gradient-brand shadow-glow">
        <Activity className="size-5 text-primary-foreground" strokeWidth={2.5} />
      </span>
      {showWordmark && (
        <span
          className={cn(
            "font-heading text-lg font-extrabold tracking-tight",
            tone === "dark" ? "text-sidebar-foreground" : "text-foreground",
          )}
        >
          Med<span className="text-primary">Nexus</span>
        </span>
      )}
    </div>
  );
}
