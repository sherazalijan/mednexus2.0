import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pause,
  RotateCcw,
  Send,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { bookmarkService, quizService } from "@/services/quiz.service";
import { apiErrorMessage } from "@/services/api";
import { saveQuizResult } from "@/lib/quiz-result-store";
import { cn } from "@/lib/utils";
import type { MCQ } from "@/types/mcq";

const LETTERS = ["A", "B", "C", "D"] as const;
type QuizMode = "study" | "exam";

export interface QuizRunnerProps {
  questions: MCQ[];
  /** Small eyebrow label above the heading, e.g. "Chapter #12" or "Full Book Revision". */
  headerLabel: string;
  /** Tag sent to /quiz/submit so attempts show up correctly in history/analytics. */
  quizType: string;
  /** Only meaningful for a single-chapter run; omit for book/mixed/random sessions. */
  chapterId?: number;
  initialIndex?: number;
  /** Keyed by mcq id (as a string, matching how the backend stores it). */
  initialAnswers?: Record<string, string>;
  defaultMode?: QuizMode;
  /** Fired after every answer/navigation change so the caller can autosave (e.g. book revision progress). Debounced internally. */
  onProgress?: (index: number, answers: Record<string, string>) => void;
  /** Renders a Pause button when provided (book revision only). */
  onPause?: (index: number, answers: Record<string, string>) => void | Promise<void>;
  /** Renders a Restart button when provided. */
  onRestart?: () => void | Promise<void>;
  /** Called after a successful score submission, before navigating to the review page — e.g. to clear a saved revision session. Only runs on success, so a failed submit never loses the resumable session. */
  onSubmitSuccess?: () => void | Promise<void>;
}

export function QuizRunner({
  questions,
  headerLabel,
  quizType,
  chapterId,
  initialIndex = 0,
  initialAnswers = {},
  defaultMode = "exam",
  onProgress,
  onPause,
  onRestart,
  onSubmitSuccess,
}: QuizRunnerProps) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [index, setIndex] = useState(Math.min(initialIndex, Math.max(questions.length - 1, 0)));
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [mode, setMode] = useState<QuizMode>(defaultMode);
  const [restarting, setRestarting] = useState(false);
  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced autosave: fires ~500ms after the last change, and once more
  // immediately on unmount so a fast "answer -> navigate away" never loses
  // the last answer.
  useEffect(() => {
    if (!onProgress) return;
    if (progressTimer.current) clearTimeout(progressTimer.current);
    progressTimer.current = setTimeout(() => onProgress(index, answers), 500);
    return () => {
      if (progressTimer.current) clearTimeout(progressTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, answers]);

  const bookmark = useMutation({
    mutationFn: (mcqId: number) => bookmarkService.addBookmark(mcqId),
    onSuccess: (r) => {
      toast.success(r.already_bookmarked ? "Already bookmarked" : "Bookmarked");
      qc.invalidateQueries({ queryKey: ["bookmarks"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not bookmark")),
  });

  const submit = useMutation({
    mutationFn: () => {
      const payload: Parameters<typeof quizService.submitQuiz>[0] = {
        answers: Object.entries(answers).map(([mcq_id, selected_answer]) => ({
          mcq_id: Number(mcq_id),
          selected_answer,
        })),
        quiz_type: quizType,
      };
      if (chapterId !== undefined) {
        payload.chapter_id = chapterId;
      }
      return quizService.submitQuiz(payload);
    },
    onSuccess: async (data) => {
      const resultPayload = {
        ...data,
        quiz_type: quizType,
      } as Parameters<typeof saveQuizResult>[0];
      if (chapterId !== undefined) {
        resultPayload.chapter_id = chapterId;
      }
      saveQuizResult(resultPayload);
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["history"] });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
      qc.invalidateQueries({ queryKey: ["revision-status"] });
      qc.invalidateQueries({ queryKey: ["revision-active"] });
      await onSubmitSuccess?.();
      navigate({ to: "/student/quiz-review" });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not submit quiz")),
  });

  const q = questions[Math.min(index, questions.length - 1)]!;
  const answeredCount = Object.keys(answers).length;
  const progress = Math.round((answeredCount / questions.length) * 100);
  const revealed = mode === "study" && Boolean(answers[String(q.id)]);
  const selectedLetter = answers[String(q.id)];

  function selectOption(letter: string) {
    if (mode === "study" && answers[String(q.id)]) return; // already revealed, don't let them change their mind silently
    setAnswers((a) => ({ ...a, [String(q.id)]: letter }));
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">{headerLabel}</p>
          <h1 className="font-heading text-2xl font-extrabold">Question {index + 1} of {questions.length}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
            {answeredCount}/{questions.length} answered
          </span>
          <div className="flex items-center rounded-full border border-border bg-card p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode("study")}
              className={cn("rounded-full px-3 py-1 transition-colors", mode === "study" ? "gradient-brand text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              Study
            </button>
            <button
              type="button"
              onClick={() => setMode("exam")}
              className={cn("rounded-full px-3 py-1 transition-colors", mode === "exam" ? "gradient-brand text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              Exam
            </button>
          </div>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full gradient-brand transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      <div className="card-surface p-6 sm:p-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <p className="text-base font-medium leading-relaxed">{q.question}</p>
          <button
            type="button"
            onClick={() => bookmark.mutate(q.id)}
            className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
            aria-label="Bookmark question"
          >
            <Bookmark className="size-4" />
          </button>
        </div>

        <div className="space-y-3">
          {LETTERS.map((letter) => {
            const text = q[`option_${letter.toLowerCase()}` as "option_a"];
            const selected = selectedLetter === letter;
            const isCorrectLetter = q.correct_answer === letter;
            let variant: "default" | "selected" | "correct" | "incorrect" = "default";
            if (revealed) {
              if (isCorrectLetter) variant = "correct";
              else if (selected) variant = "incorrect";
            } else if (selected) {
              variant = "selected";
            }
            return (
              <button
                key={letter}
                type="button"
                onClick={() => selectOption(letter)}
                disabled={revealed}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border p-4 text-left text-sm transition-all",
                  variant === "selected" && "border-primary bg-primary/8 ring-2 ring-primary/25",
                  variant === "correct" && "border-success bg-success/10 ring-2 ring-success/25",
                  variant === "incorrect" && "border-destructive bg-destructive/10 ring-2 ring-destructive/25",
                  variant === "default" && "border-border hover:border-primary/40",
                  revealed && "cursor-default",
                )}
              >
                <span className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-lg text-xs font-bold",
                  variant === "selected" && "gradient-brand text-primary-foreground",
                  variant === "correct" && "bg-success text-success-foreground",
                  variant === "incorrect" && "bg-destructive text-destructive-foreground",
                  variant === "default" && "bg-muted text-muted-foreground",
                )}>
                  {letter}
                </span>
                <span className="min-w-0 flex-1">{text}</span>
                {revealed && isCorrectLetter && <CheckCircle2 className="size-4 shrink-0 text-success" />}
                {revealed && selected && !isCorrectLetter && <XCircle className="size-4 shrink-0 text-destructive" />}
              </button>
            );
          })}
        </div>

        {revealed && (
          <div className={cn(
            "rounded-xl border p-4 text-sm",
            selectedLetter === q.correct_answer ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5",
          )}>
            <p className="mb-1 font-semibold">
              {selectedLetter === q.correct_answer ? "Correct!" : `Incorrect — correct answer is ${q.correct_answer}`}
            </p>
            {q.explanation && <p className="text-muted-foreground">{q.explanation}</p>}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="gap-2" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
            <ChevronLeft className="size-4" /> Previous
          </Button>
          {onPause && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => onPause(index, answers)}
            >
              <Pause className="size-4" /> Pause
            </Button>
          )}
          {onRestart && (
            <Button
              variant="outline"
              className="gap-2 text-muted-foreground"
              disabled={restarting}
              onClick={async () => {
                setRestarting(true);
                try {
                  await onRestart();
                } finally {
                  setRestarting(false);
                }
              }}
            >
              {restarting ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
              Restart
            </Button>
          )}
        </div>
        {index < questions.length - 1 ? (
          <Button className="gap-2" onClick={() => setIndex((i) => i + 1)}>
            Next <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button size="lg" className="gap-2" disabled={submit.isPending} onClick={() => submit.mutate()}>
            {submit.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Submit quiz
          </Button>
        )}
      </div>
    </div>
  );
}
