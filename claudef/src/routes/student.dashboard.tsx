import { createFileRoute, Link } from "@tanstack/react-router";
import { DemoBanner } from "@/components/DemoBanner";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Bookmark,
  CheckCircle2,
  CreditCard,
  Dices,
  Flame,
  History,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  Target,
  TrendingDown,
  Trophy,
} from "lucide-react";
import { StatCard } from "@/components/mednexus/StatCard";
import { PerformanceChart } from "@/components/mednexus/PerformanceChart";
import { EmptyState } from "@/components/mednexus/EmptyState";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { userService } from "@/services/user.service";
import { bookmarkService } from "@/services/quiz.service";
import { bookService } from "@/services/content.service";
import { announcementService } from "@/services/content.service";
import { revisionService } from "@/services/revision.service";
import type { QuizHistory } from "@/types/user";

export const Route = createFileRoute("/student/dashboard")({
  head: () => ({
    meta: [
      { title: "Student Dashboard — MedNexus" },
      { name: "description", content: "Your MedNexus performance overview, recent attempts and revision shortcuts." },
      { property: "og:title", content: "Student Dashboard — MedNexus" },
      { property: "og:description", content: "Track your medical QBank progress and continue learning." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentDashboard,
});

function weakestChapters(history: QuizHistory[]) {
  const map = new Map<number, { total: number; sum: number }>();
  history.forEach((h) => {
    if (h.chapter_id == null) return;
    const cur = map.get(h.chapter_id) ?? { total: 0, sum: 0 };
    cur.total += 1;
    cur.sum += h.score_percentage;
    map.set(h.chapter_id, cur);
  });
  return [...map.entries()]
    .map(([chapter_id, v]) => ({ chapter_id, attempts: v.total, avg: v.sum / v.total }))
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 4);
}

// ---------------------------------------------------------------------------
// FEATURE 11 (safe, low-risk extras) — all computed client-side from data the
// dashboard already fetches (quiz history), no new backend endpoints needed.
// ---------------------------------------------------------------------------
function computeStudyStreak(history: QuizHistory[]): number {
  const days = new Set(history.map((h) => new Date(h.completed_at).toDateString()));
  let streak = 0;
  const cursor = new Date();
  while (days.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function computeTodayMcqCount(history: QuizHistory[]): number {
  const today = new Date().toDateString();
  return history
    .filter((h) => new Date(h.completed_at).toDateString() === today)
    .reduce((sum, h) => sum + h.total_questions, 0);
}

function recentlyAttemptedChapters(history: QuizHistory[], limit = 5): number[] {
  const seen = new Set<number>();
  const result: number[] = [];
  const sorted = [...history].sort(
    (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime(),
  );
  for (const h of sorted) {
    if (h.chapter_id == null || seen.has(h.chapter_id)) continue;
    seen.add(h.chapter_id);
    result.push(h.chapter_id);
    if (result.length >= limit) break;
  }
  return result;
}

const DAILY_GOAL_STORAGE_KEY = "mednexus_daily_mcq_goal";

function readDailyGoal(): number {
  if (typeof window === "undefined") return 20;
  const raw = window.localStorage.getItem(DAILY_GOAL_STORAGE_KEY);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 20;
}

function StudentDashboard() {
  const { user } = useAuth();
  const userId = user?.user_id ?? 0;
  const enabled = !!userId;

  const stats = useQuery({ queryKey: ["stats", userId], queryFn: () => userService.getStats(userId), enabled });
  const history = useQuery({ queryKey: ["history", userId], queryFn: () => userService.getHistory(userId), enabled });
  const subscription = useQuery({
    queryKey: ["subscription", userId],
    queryFn: () => userService.getSubscription(userId),
    enabled,
  });
  const bookmarks = useQuery({ queryKey: ["bookmarks"], queryFn: bookmarkService.getBookmarks, enabled });
  const books = useQuery({ queryKey: ["books"], queryFn: bookService.getBooks, enabled });
  const announcements = useQuery({
    queryKey: ["announcements"],
    queryFn: announcementService.getAnnouncements,
    enabled,
  });
  // FEATURE 11 — Last Revision Resume: most recently touched book revision session, if any.
  const revisionActive = useQuery({
    queryKey: ["revision-active"],
    queryFn: revisionService.getActiveSession,
    enabled,
  });

  const [dailyGoal, setDailyGoal] = useState(readDailyGoal);
  function adjustGoal(delta: number) {
    setDailyGoal((g) => {
      const next = Math.max(5, g + delta);
      if (typeof window !== "undefined") window.localStorage.setItem(DAILY_GOAL_STORAGE_KEY, String(next));
      return next;
    });
  }

  const hist = history.data ?? [];
  const recent = [...hist]
    .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
    .slice(0, 6);
  const weak = weakestChapters(hist);
  const lastAttempt = recent[0];
  const streakDays = computeStudyStreak(hist);
  const todayCount = computeTodayMcqCount(hist);
  const recentChapters = recentlyAttemptedChapters(hist);

  return (
    <div className="space-y-8">
      <DemoBanner />
      {/* Welcome hero */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl gradient-night p-7 sm:p-10"
      >
        <div className="absolute inset-0 grid-noise opacity-30" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Student workspace
            </p>
            <h1 className="mt-2 font-heading text-3xl font-extrabold text-primary-foreground sm:text-4xl">
              Welcome back, Dr. {user?.full_name || "Student"}
            </h1>
            <p className="mt-3 max-w-xl text-sm text-primary-foreground/65">
              {hist.length > 0
                ? `You've completed ${hist.length} attempt${hist.length === 1 ? "" : "s"}. Keep the streak alive — consistency beats cramming.`
                : "Start your first chapter quiz to unlock your performance analytics."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="lg" className="gap-2">
              <Link to="/student/books">
                Start a quiz <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/25 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Link to="/student/analytics">View analytics</Link>
            </Button>
          </div>
        </div>
      </motion.section>

      {/* Program / Track Quick Shortcuts */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          to="/student/books"
          className="card-surface p-5 hover:border-primary/50 transition-all flex items-center justify-between group"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <BookOpen className="size-4" />
              </span>
              <h3 className="font-heading font-bold text-sm">MBBS Track</h3>
            </div>
            <p className="text-xs text-muted-foreground">1st, 2nd, 3rd, 4th & Final Year QBanks</p>
          </div>
          <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
        </Link>

        <Link
          to="/student/books"
          className="card-surface p-5 hover:border-primary/50 transition-all flex items-center justify-between group"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-success/10 text-success">
                <Trophy className="size-4" />
              </span>
              <h3 className="font-heading font-bold text-sm">BDS Dentistry</h3>
            </div>
            <p className="text-xs text-muted-foreground">Dental Anatomy & Surgery QBanks</p>
          </div>
          <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-success" />
        </Link>

        <Link
          to="/student/books"
          className="card-surface p-5 border-accent/40 bg-accent/5 hover:border-accent transition-all flex items-center justify-between group"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-accent/20 text-accent font-bold text-xs">
                SK
              </span>
              <h3 className="font-heading font-bold text-sm">FCPS Part 1 (SK23, SK24)</h3>
            </div>
            <p className="text-xs text-muted-foreground">High Yield Past Papers & Revision</p>
          </div>
          <ArrowRight className="size-4 text-accent transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      {/* Stat cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          index={0}
          label="Quizzes completed"
          value={stats.isLoading ? "—" : (stats.data?.quizzes_taken ?? 0)}
          icon={Trophy}
          hint="Total attempts submitted"
        />
        <StatCard
          index={1}
          label="Correct answers"
          value={stats.isLoading ? "—" : (stats.data?.correct_answers ?? 0)}
          icon={CheckCircle2}
          accent="success"
          hint={`${stats.data?.incorrect_answers ?? 0} incorrect`}
        />
        <StatCard
          index={2}
          label="Average accuracy"
          value={stats.isLoading ? "—" : `${Math.round(stats.data?.average_score ?? 0)}%`}
          icon={Target}
          accent="accent"
          hint="Across all attempts"
        />
        <StatCard
          index={3}
          label="Subscription"
          value={
            subscription.isLoading ? "—" : subscription.data?.active ? "Active" : "Inactive"
          }
          icon={CreditCard}
          accent={subscription.data?.active ? "success" : "warning"}
          hint={subscription.data?.plan_name ?? "No plan on record"}
        />
      </section>

      {/* FEATURE 11 — Study streak, daily MCQ goal, recently attempted chapters */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="card-surface p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Flame className="size-4 text-orange-500" /> Study streak
          </div>
          <p className="mt-2 font-heading text-2xl font-extrabold tabular-nums">
            {streakDays} day{streakDays === 1 ? "" : "s"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {streakDays > 0 ? "Keep it going — attempt a quiz today." : "Attempt a quiz today to start a streak."}
          </p>
        </div>

        <div className="card-surface p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Target className="size-4 text-primary" /> Daily MCQ goal
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => adjustGoal(-5)}
                className="grid size-6 place-items-center rounded-md border border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
                aria-label="Decrease daily goal"
              >
                <Minus className="size-3" />
              </button>
              <button
                type="button"
                onClick={() => adjustGoal(5)}
                className="grid size-6 place-items-center rounded-md border border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
                aria-label="Increase daily goal"
              >
                <Plus className="size-3" />
              </button>
            </div>
          </div>
          <p className="mt-2 font-heading text-2xl font-extrabold tabular-nums">
            {todayCount}/{dailyGoal}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full gradient-brand transition-all"
              style={{ width: `${Math.min(100, Math.round((todayCount / dailyGoal) * 100))}%` }}
            />
          </div>
        </div>

        <div className="card-surface p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <History className="size-4 text-accent" /> Recently attempted
          </div>
          {recentChapters.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">No chapters attempted yet.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {recentChapters.map((c) => (
                <li key={c}>
                  <Link
                    to="/student/quiz/$chapterId"
                    params={{ chapterId: String(c) }}
                    className="text-sm hover:text-primary hover:underline"
                  >
                    Chapter #{c}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Chart + continue learning */}
      <section className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div className="card-surface p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-bold">Performance trend</h2>
              <p className="text-sm text-muted-foreground">Score percentage per attempt</p>
            </div>
            <BarChart3 className="size-5 text-muted-foreground" />
          </div>
          <div className="mt-4">
            {history.isLoading ? (
              <div className="grid h-72 place-items-center">
                <Loader2 className="size-5 animate-spin text-primary" />
              </div>
            ) : (
              <PerformanceChart history={hist} />
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="card-surface p-6">
            <h2 className="font-heading text-lg font-bold">Continue learning</h2>
            {revisionActive.data?.has_session ? (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  Continue "{revisionActive.data.book_title}" — {revisionActive.data.current_index}/
                  {revisionActive.data.total_questions} questions in.
                </p>
                <Button asChild className="mt-4 w-full gap-2">
                  <Link to="/student/quiz-session" search={{ mode: "book", bookId: revisionActive.data.book_id! }}>
                    Resume revision <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </>
            ) : lastAttempt?.chapter_id ? (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pick up where you left off — Chapter #{lastAttempt.chapter_id}, last scored{" "}
                  {Math.round(lastAttempt.score_percentage)}%.
                </p>
                <Button asChild className="mt-4 w-full gap-2">
                  <Link to="/student/quiz/$chapterId" params={{ chapterId: String(lastAttempt.chapter_id) }}>
                    Resume chapter quiz <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  {books.data?.length
                    ? `${books.data.length} book${books.data.length === 1 ? "" : "s"} available in your library.`
                    : "Browse the library to begin your first chapter quiz."}
                </p>
                <Button asChild className="mt-4 w-full gap-2">
                  <Link to="/student/books">
                    Browse library <BookOpen className="size-4" />
                  </Link>
                </Button>
              </>
            )}
          </div>

          <div className="card-surface p-6">
            <h2 className="font-heading text-lg font-bold">Quick actions</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { to: "/student/practice" as const, label: "Practice", icon: Dices },
                { to: "/student/books" as const, label: "Chapters", icon: BookOpen },
                { to: "/student/bookmarks" as const, label: "Bookmarks", icon: Bookmark },
                { to: "/student/analytics" as const, label: "Analytics", icon: BarChart3 },
                { to: "/student/announcements" as const, label: "News", icon: Bell },
              ].map((a) => (
                <Link
                  key={a.label}
                  to={a.to}
                  className="flex flex-col gap-2 rounded-xl border border-border p-4 transition-colors hover:border-primary/50 hover:bg-primary/5"
                >
                  <a.icon className="size-5 text-primary" />
                  <span className="text-sm font-semibold">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Recent activity + weak topics */}
      <section className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div className="card-surface overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border p-6">
            <div>
              <h2 className="font-heading text-lg font-bold">Recent activity</h2>
              <p className="text-sm text-muted-foreground">Your latest submitted attempts</p>
            </div>
            <History className="size-5 text-muted-foreground" />
          </div>
          {recent.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No attempts recorded yet.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((h) => (
                <li key={h.id} className="flex items-center gap-4 p-4 sm:px-6">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Flame className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold capitalize">
                      {h.quiz_type} quiz
                      {h.chapter_id ? ` · Chapter #${h.chapter_id}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {h.correct_answers}/{h.total_questions} correct ·{" "}
                      {new Date(h.completed_at).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold tabular-nums ${
                      h.score_percentage >= 70
                        ? "bg-success/12 text-success"
                        : h.score_percentage >= 50
                          ? "bg-warning/15 text-warning"
                          : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {Math.round(h.score_percentage)}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card-surface p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-bold">Weak topics</h2>
              <p className="text-sm text-muted-foreground">Lowest average chapters</p>
            </div>
            <TrendingDown className="size-5 text-destructive" />
          </div>
          {weak.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              Attempt a few chapter quizzes and MedNexus will surface your weakest areas here.
            </p>
          ) : (
            <ul className="mt-5 space-y-4">
              {weak.map((w) => (
                <li key={w.chapter_id}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <Link
                      to="/student/quiz/$chapterId"
                      params={{ chapterId: String(w.chapter_id) }}
                      className="truncate font-semibold hover:text-primary hover:underline"
                    >
                      Chapter #{w.chapter_id}
                    </Link>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {Math.round(w.avg)}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-destructive/70"
                      style={{ width: `${Math.max(4, Math.round(w.avg))}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {w.attempts} attempt{w.attempts === 1 ? "" : "s"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Bookmarks + revision centre */}
      <section className="grid gap-5 xl:grid-cols-2">
        <div className="card-surface p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-lg font-bold">Bookmarks preview</h2>
            <Button asChild variant="ghost" size="sm" className="gap-1">
              <Link to="/student/bookmarks">
                View all <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
          {(bookmarks.data?.length ?? 0) === 0 ? (
            <p className="mt-5 text-sm text-muted-foreground">
              No bookmarks yet — flag tricky questions during a quiz to build your revision deck.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {bookmarks.data!.slice(0, 3).map((b) => (
                <li key={b.bookmark_id} className="rounded-xl border border-border p-4">
                  <p className="line-clamp-2 text-sm font-medium">{b.question}</p>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Correct answer: <span className="font-semibold text-accent">{b.correct_answer}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card-surface p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-lg font-bold">Revision centre</h2>
            <RotateCcw className="size-5 text-accent" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border p-4">
              <p className="font-heading text-2xl font-extrabold tabular-nums">
                {bookmarks.data?.length ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Saved questions</p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="font-heading text-2xl font-extrabold tabular-nums">
                {stats.data?.incorrect_answers ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Incorrect to review</p>
            </div>
          </div>
          {(announcements.data?.length ?? 0) > 0 && (
            <div className="mt-4 rounded-xl border border-primary/25 bg-primary/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Latest announcement
              </p>
              <p className="mt-1 truncate text-sm font-semibold">{announcements.data![0]!.title}</p>
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {announcements.data![0]!.message}
              </p>
            </div>
          )}
        </div>
      </section>

      {hist.length === 0 && !history.isLoading && (
        <EmptyState
          icon={BookOpen}
          title="Your analytics are waiting"
          description="Complete your first chapter quiz to populate performance trends, weak topics and revision suggestions."
          action={
            <Button asChild className="mt-2">
              <Link to="/student/books">Browse chapters</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
