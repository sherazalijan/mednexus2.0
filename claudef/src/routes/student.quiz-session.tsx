import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/mednexus/EmptyState";
import { QueryError } from "@/components/mednexus/QueryError";
import { QuizRunner } from "@/components/mednexus/QuizRunner";
import { quizService } from "@/services/quiz.service";
import { revisionService } from "@/services/revision.service";
import { apiErrorMessage } from "@/services/api";
import type { MCQ } from "@/types/mcq";

// TanStack Router's default parseSearch already JSON-parses each query
// param (so `?restart=true` arrives as the boolean `true`, not the string
// "true"), which is what reaches this schema — so plain z.number()/
// z.boolean() are correct here. z.coerce.boolean() in particular would be
// a footgun on top of that (Boolean("false") is true).
const searchSchema = z.object({
  mode: z.enum(["book", "mixed", "random"]),
  bookId: z.number().optional(),
  chapterIds: z.string().optional(), // comma-separated
  count: z.number().min(1).max(200).optional(),
  source: z.enum(["chapters", "book", "database"]).optional(),
  restart: z.boolean().optional(),
  shuffle: z.boolean().optional(),
  title: z.string().optional(),
});

export const Route = createFileRoute("/student/quiz-session")({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Quiz Session — MedNexus" },
      { name: "description", content: "Full book revision, mixed-chapter practice, and random test sessions." },
    ],
  }),
  component: QuizSessionPage,
});

function QuizSessionPage() {
  const search = Route.useSearch();
  const { mode } = search;

  // ---------------------------------------------------------------------
  // FEATURE 1 — Full Book Revision (resumable session)
  // ---------------------------------------------------------------------
  if (mode === "book") {
    if (!search.bookId) {
      return <EmptyState icon={Send} title="Missing book" description="No book was selected for this revision session." />;
    }
    const bookProps = {
      bookId: search.bookId,
      restart: search.restart ?? false,
      shuffle: search.shuffle ?? false,
      ...(search.title ? { title: search.title } : {}),
    };
    return <BookRevisionSession {...bookProps} />;
  }

  // ---------------------------------------------------------------------
  // FEATURE 3 — Practice mode (mixed chapters) & FEATURE 4 — Random Test
  // Builder with source = "Selected Chapters"
  // ---------------------------------------------------------------------
  if (mode === "mixed") {
    if (!search.chapterIds) {
      return <EmptyState icon={Send} title="No chapters selected" description="Pick at least one chapter to start practicing." />;
    }
    const ids = search.chapterIds.split(",").map(Number).filter((n) => !Number.isNaN(n));
    return <FetchedSession
      queryKey={["mixed-quiz", search.chapterIds, search.count]}
      queryFn={() => quizService.getMixedQuiz(ids, search.count)}
      headerLabel={search.title ?? (search.count ? "Random Test" : "Practice")}
      quizType={search.count ? "random_test" : "mixed_practice"}
    />;
  }

  // ---------------------------------------------------------------------
  // FEATURE 4 — Random Test Builder, source = "Entire Book" / "Entire Database"
  // ---------------------------------------------------------------------
  if (mode === "random") {
    const count = search.count ?? 20;
    if (search.source === "book") {
      if (!search.bookId) {
        return <EmptyState icon={Send} title="Missing book" description="No book was selected for this random test." />;
      }
      return <FetchedSession
        queryKey={["random-book-quiz", search.bookId, count]}
        queryFn={() => quizService.getRandomBookQuiz(search.bookId!, count)}
        headerLabel={search.title ?? "Random Test"}
        quizType="random_test"
      />;
    }
    // default source = "database"
    return <FetchedSession
      queryKey={["random-quiz", count]}
      queryFn={() => quizService.getRandomQuiz(count)}
      headerLabel={search.title ?? "Random Test"}
      quizType="random_test"
    />;
  }

  return <EmptyState icon={Send} title="Unknown session type" description="Head back and start a new session." />;
}

// ---------------------------------------------------------------------------
// Simple fetch-once-and-run session (Practice + Random Test) — no resume
// support needed per the brief, only Full Book Revision requires that.
// ---------------------------------------------------------------------------
function FetchedSession({
  queryKey,
  queryFn,
  headerLabel,
  quizType,
}: {
  queryKey: unknown[];
  queryFn: () => Promise<MCQ[]>;
  headerLabel: string;
  quizType: string;
}) {
  const quiz = useQuery({ queryKey, queryFn });

  if (quiz.isLoading) {
    return <div className="grid place-items-center py-24"><Loader2 className="size-6 animate-spin text-primary" /></div>;
  }
  if (quiz.isError) {
    return <QueryError error={quiz.error} onRetry={() => quiz.refetch()} title="Couldn't load this quiz" />;
  }
  const questions = quiz.data ?? [];
  if (questions.length === 0) {
    return <EmptyState icon={Send} title="No questions found" description="Try a different selection." />;
  }
  return <QuizRunner questions={questions} headerLabel={headerLabel} quizType={quizType} />;
}

// ---------------------------------------------------------------------------
// Full Book Revision session — resumable, pausable, restartable.
// ---------------------------------------------------------------------------
function BookRevisionSession({
  bookId,
  restart,
  shuffle,
  title,
}: {
  bookId: number;
  restart: boolean;
  shuffle: boolean;
  title?: string;
}) {
  const session = useQuery({
    queryKey: ["revision-session", bookId, restart, shuffle],
    queryFn: () => revisionService.start(bookId, { restart, shuffle }),
  });

  if (session.isLoading) {
    return <div className="grid place-items-center py-24"><Loader2 className="size-6 animate-spin text-primary" /></div>;
  }
  if (session.isError) {
    return <QueryError error={session.error} onRetry={() => session.refetch()} title="Couldn't load this revision session" />;
  }

  const data = session.data;
  if (!data || data.questions.length === 0) {
    return (
      <EmptyState
        icon={Send}
        title="Nothing to revise yet"
        description="This book has no published questions yet."
        action={<Button asChild variant="outline"><Link to="/student/books">Back to books</Link></Button>}
      />
    );
  }

  return (
    <QuizRunner
      questions={data.questions}
      headerLabel={title ?? "Full Book Revision"}
      quizType="book_revision"
      initialIndex={data.current_index}
      initialAnswers={data.answered}
      onProgress={(index, answered) => {
        revisionService
          .saveProgress(bookId, { current_index: index, answered, status: "in_progress" })
          .catch((e) => toast.error(apiErrorMessage(e, "Could not save your progress")));
      }}
      onPause={async (index, answered) => {
        try {
          await revisionService.saveProgress(bookId, { current_index: index, answered, status: "paused" });
          toast.success("Revision paused — pick up where you left off any time");
        } catch (e) {
          toast.error(apiErrorMessage(e, "Could not pause"));
        }
      }}
      onRestart={async () => {
        await revisionService.start(bookId, { restart: true, shuffle });
        session.refetch();
      }}
      onSubmitSuccess={async () => {
        await revisionService.clear(bookId).catch(() => undefined);
      }}
    />
  );
}
