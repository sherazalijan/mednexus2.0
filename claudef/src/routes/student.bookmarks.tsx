import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/mednexus/PageHeader";
import { EmptyState } from "@/components/mednexus/EmptyState";
import { QueryError } from "@/components/mednexus/QueryError";
import { Button } from "@/components/ui/button";
import { bookmarkService } from "@/services/quiz.service";
import { apiErrorMessage } from "@/services/api";

export const Route = createFileRoute("/student/bookmarks")({
  head: () => ({
    meta: [
      { title: "Bookmarks — MedNexus" },
      { name: "description", content: "Your saved MedNexus MCQs, with correct answers and explanations for fast revision." },
      { property: "og:title", content: "Bookmarks — MedNexus" },
      { property: "og:description", content: "Saved questions for revision on MedNexus." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Bookmarks,
});

function Bookmarks() {
  const qc = useQueryClient();
  const bookmarks = useQuery({ queryKey: ["bookmarks"], queryFn: bookmarkService.getBookmarks });
  const remove = useMutation({
    mutationFn: (mcqId: number) => bookmarkService.removeBookmark(mcqId),
    onSuccess: () => {
      toast.success("Bookmark removed");
      qc.invalidateQueries({ queryKey: ["bookmarks"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not remove bookmark")),
  });

  return (
    <div className="space-y-8">
      <PageHeader title="Bookmarks" subtitle="Your personal revision deck." />
      {bookmarks.isLoading ? (
        <div className="grid place-items-center py-20"><Loader2 className="size-6 animate-spin text-primary" /></div>
      ) : bookmarks.isError ? (
        <QueryError error={bookmarks.error} onRetry={() => bookmarks.refetch()} title="Couldn't load bookmarks" />
      ) : (bookmarks.data?.length ?? 0) === 0 ? (
        <EmptyState icon={Bookmark} title="No bookmarks yet" description="Bookmark questions during a quiz to revisit them here." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {bookmarks.data!.map((b) => (
            <article key={b.bookmark_id} className="card-surface p-6">
              <p className="text-base font-medium leading-relaxed">{b.question}</p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {(["A", "B", "C", "D"] as const).map((l) => (
                  <li key={l} className={`flex gap-2 rounded-lg border p-2.5 text-sm ${b.correct_answer === l ? "border-accent/50 bg-accent/10" : "border-border"}`}>
                    <span className="font-bold">{l}.</span>
                    <span className="min-w-0 flex-1">{b[`option_${l.toLowerCase()}` as "option_a"]}</span>
                  </li>
                ))}
              </ul>
              {b.explanation && (
                <p className="mt-4 rounded-xl bg-muted p-3 text-sm text-muted-foreground">{b.explanation}</p>
              )}
              <Button variant="ghost" size="sm" className="mt-4 gap-2 text-destructive hover:text-destructive"
                disabled={remove.isPending} onClick={() => remove.mutate(b.mcq_id)}>
                <Trash2 className="size-4" /> Remove bookmark
              </Button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
