import { Loader2 } from "lucide-react";
import { BrandMark } from "./BrandMark";

export function PortalSkeleton() {
  return (
    <div className="grid min-h-screen place-items-center bg-surface">
      <div className="flex flex-col items-center gap-4">
        <BrandMark />
        <Loader2 className="size-5 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Preparing your workspace…</p>
      </div>
    </div>
  );
}
