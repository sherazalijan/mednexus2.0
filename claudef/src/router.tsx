import axios from "axios";
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// BUG (loading states that never resolve / silent errors swallowed by
// React Query): QueryClient was created with zero default options, which
// means React Query's own defaults applied everywhere:
//   - retry: 3, with exponential backoff (up to ~30s between attempts)
//   - that retry ran even for 401/403/404s, which will never succeed no
//     matter how many times they're retried
// The practical effect: a genuinely broken request (bad route, expired
// session, missing resource) would sit in `isLoading` for several extra
// seconds while it silently retried 3 times in the background before
// `isError` ever flipped true — exactly the "loading state that never
// resolves" / "hangs" symptom, and it made the already-missing `isError`
// handling on every page (see QueryError.tsx) even harder to notice.
// Fix: don't retry 4xx (those are never transient), cap retries on
// everything else, and stop refetching every window focus (which was
// re-triggering the same silent-failure loop constantly on genuinely
// broken pages).
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status !== undefined && status >= 400 && status < 500) return false;
  }
  return failureCount < 2;
}

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
