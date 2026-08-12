import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiErrorMessage } from "@/services/api";

/**
 * Renders when a React Query `useQuery` call has `isError` set.
 *
 * Before this component existed, every list/detail page in the app treated
 * "the request failed" and "the request succeeded with zero rows" as the
 * same thing — both fell through to an `EmptyState` ("No books yet", "No
 * chapters yet", etc). That meant a 401/403/500/network failure looked
 * *identical* to genuinely empty data: the user saw a normal-looking empty
 * page with no indication anything had gone wrong, and no way to retry
 * short of a manual page refresh. This is the root cause behind "clicking a
 * book shows nothing", "chapters sometimes don't load" and "some routes
 * open blank pages" — the errors were never rendered, just silently
 * swallowed by the `isLoading ? … : data.length === 0 ? <empty> : …` pattern.
 *
 * Usage: check `query.isError` *before* the empty/zero-length check.
 */
export function QueryError({
  error,
  onRetry,
  title = "Couldn't load this",
}: {
  error: unknown;
  onRetry: () => void;
  title?: string;
}) {
  return (
    <div className="card-surface flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" />
      </span>
      <h3 className="font-heading text-lg font-bold">{title}</h3>
      <p className="max-w-md text-sm text-muted-foreground">
        {apiErrorMessage(error, "Something went wrong talking to the MedNexus API.")}
      </p>
      <Button onClick={onRetry} variant="outline" size="sm" className="mt-1">
        Try again
      </Button>
    </div>
  );
}
