import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, ChevronRight, HelpCircle, RotateCcw, XCircle, Trophy, BarChart3, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/mednexus/PageHeader";
import { EmptyState } from "@/components/mednexus/EmptyState";
import { readQuizResult } from "@/lib/quiz-result-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/student/quiz-review")({
  head: () => ({
    meta: [
      { title: "Quiz Review — MedNexus" },
      { name: "description", content: "Detailed review of your quiz performance, explanations, and answer breakdown." },
      { property: "og:title", content: "Quiz Review — MedNexus" },
    ],
  }),
  component: QuizReviewPage,
});

type FilterOption = "all" | "correct" | "incorrect" | "unattempted";

function QuizReviewPage() {
  const result = readQuizResult();
  const [filter, setFilter] = useState<FilterOption>("all");

  if (!result) {
    return (
      <div className="space-y-6">
        <PageHeader title="Quiz Review" subtitle="Review past test performance and question details." />
        <EmptyState
          icon={AlertCircle}
          title="No recent quiz result found"
          description="Complete a practice session or chapter quiz to view detailed score breakdown and explanations."
          action={
            <Button asChild>
              <Link to="/student/practice">Start Practice</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const { score, correct, incorrect, unattempted, total_questions, results = [] } = result;

  const filteredResults = results.filter((item) => {
    if (filter === "correct") return item.status === "correct";
    if (filter === "incorrect") return item.status === "incorrect";
    if (filter === "unattempted") return item.status === "unattempted";
    return true;
  });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      <PageHeader
        title="Quiz Review"
        subtitle="Detailed analysis of your answers, performance metrics, and explanations."
      />

      {/* Score Summary Card */}
      <div className="card-surface p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Trophy className="size-8" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Overall Score</p>
              <h2 className="font-heading text-3xl font-extrabold">{score}%</h2>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center w-full sm:w-auto">
            <div className="rounded-xl bg-success/10 p-3">
              <p className="text-xl font-bold text-success">{correct}</p>
              <p className="text-xs font-medium text-muted-foreground">Correct</p>
            </div>
            <div className="rounded-xl bg-destructive/10 p-3">
              <p className="text-xl font-bold text-destructive">{incorrect}</p>
              <p className="text-xs font-medium text-muted-foreground">Incorrect</p>
            </div>
            <div className="rounded-xl bg-muted p-3">
              <p className="text-xl font-bold text-muted-foreground">{unattempted}</p>
              <p className="text-xs font-medium text-muted-foreground">Unattempted</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">Total Questions: {total_questions}</p>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/student/dashboard">Dashboard</Link>
            </Button>
            <Button asChild className="gap-2">
              <Link to="/student/practice">
                <RotateCcw className="size-4" /> Practice More
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
        <h3 className="font-heading text-lg font-bold flex items-center gap-2">
          <BarChart3 className="size-5 text-primary" /> Question Review
        </h3>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 text-xs font-semibold">
          {(["all", "correct", "incorrect", "unattempted"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-md px-3 py-1 capitalize transition-colors",
                filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Question Results List */}
      {filteredResults.length === 0 ? (
        <EmptyState
          icon={HelpCircle}
          title="No questions in this filter"
          description="Try switching the filter tab above to view other questions."
        />
      ) : (
        <div className="space-y-6">
          {filteredResults.map((item, idx) => {
            const isCorrect = item.status === "correct";
            const isUnattempted = item.status === "unattempted";

            return (
              <div key={item.mcq_id} className="card-surface p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="grid size-7 place-items-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">
                      #{idx + 1}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        isCorrect && "bg-success/15 text-success",
                        !isCorrect && !isUnattempted && "bg-destructive/15 text-destructive",
                        isUnattempted && "bg-muted text-muted-foreground"
                      )}
                    >
                      {isCorrect && <CheckCircle2 className="size-3.5" />}
                      {!isCorrect && !isUnattempted && <XCircle className="size-3.5" />}
                      {isCorrect ? "Correct" : isUnattempted ? "Unattempted" : "Incorrect"}
                    </span>
                  </div>
                </div>

                <p className="text-base font-medium leading-relaxed">{item.question}</p>

                <div className="grid gap-2 text-sm">
                  <div
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-3",
                      isCorrect ? "border-success/30 bg-success/5" : isUnattempted ? "border-border" : "border-destructive/30 bg-destructive/5"
                    )}
                  >
                    <span>Your Answer: <strong>{item.your_answer || "None"}</strong></span>
                    {isCorrect ? (
                      <CheckCircle2 className="size-4 text-success" />
                    ) : isUnattempted ? null : (
                      <XCircle className="size-4 text-destructive" />
                    )}
                  </div>

                  {!isCorrect && (
                    <div className="flex items-center justify-between rounded-lg border border-success/30 bg-success/5 p-3">
                      <span>Correct Answer: <strong>{item.correct_answer}</strong></span>
                      <CheckCircle2 className="size-4 text-success" />
                    </div>
                  )}
                </div>

                {item.explanation && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm space-y-1">
                    <p className="font-semibold text-primary">Explanation</p>
                    <p className="text-muted-foreground leading-relaxed">{item.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button asChild variant="outline">
          <Link to="/student/dashboard">Back to Dashboard</Link>
        </Button>
        <Button asChild className="gap-2">
          <Link to="/student/practice">
            Next Session <ChevronRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
