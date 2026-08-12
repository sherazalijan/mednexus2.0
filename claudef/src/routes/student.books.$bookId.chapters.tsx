import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpenCheck, Layers, Loader2, Play, PlayCircle, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/mednexus/PageHeader";
import { EmptyState } from "@/components/mednexus/EmptyState";
import { QueryError } from "@/components/mednexus/QueryError";
import { Button } from "@/components/ui/button";
import { chapterService } from "@/services/content.service";
import { revisionService } from "@/services/revision.service";

export const Route = createFileRoute("/student/books/$bookId/chapters")({
  head: () => ({
    meta: [
      { title: "Chapters — MedNexus" },
      { name: "description", content: "Chapters available for this MedNexus book, each with a launchable quiz." },
      { property: "og:title", content: "Chapters — MedNexus" },
      { property: "og:description", content: "Launch chapter-wise quizzes from the MedNexus QBank." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentChapters,
});

function FullBookRevisionBanner({ bookId }: { bookId: number }) {
  const status = useQuery({
    queryKey: ["revision-status", bookId],
    queryFn: () => revisionService.getStatus(bookId),
  });

  if (status.isLoading) return null;

  const resumable = status.data?.has_session && (status.data.status === "in_progress" || status.data.status === "paused");

  return (
    <div className="card-surface flex flex-col gap-4 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <BookOpenCheck className="size-5" />
        </span>
        <div>
          <p className="font-heading font-bold">Full Book Revision</p>
          <p className="text-sm text-muted-foreground">
            {resumable
              ? `${status.data?.answered_count ?? 0} of ${status.data?.total_questions ?? 0} questions answered — pick up where you left off.`
              : "Work through every chapter in this book, in order, with progress saved automatically."}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {resumable ? (
          <>
            <Button asChild className="gap-2">
              <Link to="/student/quiz-session" search={{ mode: "book", bookId }}>
                <Play className="size-4" /> Continue Revision
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/student/quiz-session" search={{ mode: "book", bookId, restart: true }}>
                <RotateCcw className="size-4" /> Restart
              </Link>
            </Button>
          </>
        ) : (
          <Button asChild className="gap-2">
            <Link to="/student/quiz-session" search={{ mode: "book", bookId }}>
              <Play className="size-4" /> Start Full Book Revision
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function StudentChapters() {
  const { bookId } = Route.useParams();
  const chapters = useQuery({
    queryKey: ["chapters", bookId],
    queryFn: () => chapterService.getChapters(Number(bookId)),
  });

  return (
    <div className="space-y-8">
      <Button asChild variant="ghost" size="sm" className="gap-2 -ml-2">
        <Link to="/student/books"><ArrowLeft className="size-4" /> Back to library</Link>
      </Button>
      <PageHeader title="Chapters" subtitle="Select a chapter to launch a sequential quiz." />

      <FullBookRevisionBanner bookId={Number(bookId)} />

      {chapters.isLoading ? (
        <div className="grid place-items-center py-20"><Loader2 className="size-6 animate-spin text-primary" /></div>
      ) : chapters.isError ? (
        <QueryError error={chapters.error} onRetry={() => chapters.refetch()} title="Couldn't load chapters" />
      ) : (chapters.data?.length ?? 0) === 0 ? (
        <EmptyState icon={Layers} title="No chapters yet" description="This book has no chapters published." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {chapters.data!.map((c) => (
            <div key={c.id} className="card-surface flex items-center gap-4 p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
                <Layers className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-heading font-bold">{c.chapter_name}</p>
                <p className="text-xs text-muted-foreground">Chapter #{c.id}</p>
              </div>
              <Button asChild size="sm" className="shrink-0 gap-1.5">
                <Link to="/student/quiz/$chapterId" params={{ chapterId: String(c.id) }}>
                  <PlayCircle className="size-4" /> Start
                </Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
