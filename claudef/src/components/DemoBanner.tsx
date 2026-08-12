import { DEMO_MODE } from "@/config/demo";

export function DemoBanner() {
  if (!DEMO_MODE) return null;

  return (
    <div className="rounded-lg border p-4 mb-4">
      Demo Mode Active — All premium features are currently free.
    </div>
  );
}