import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Dices, Play, RotateCcw, Shuffle } from "lucide-react";
import { PageHeader } from "@/components/mednexus/PageHeader";
import { EmptyState } from "@/components/mednexus/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { bookService, chapterService } from "@/services/content.service";
import { revisionService } from "@/services/revision.service";

export const Route = createFileRoute("/student/practice")({
  head: () => ({
    meta: [
      { title: "Practice Center — MedNexus" },
      { name: "description", content: "Full book revision, custom chapter practice, and random test building." },
    ],
  }),
  component: PracticeCenterPage,
});

const TEST_SIZES = [20, 30, 40, 50, 60, 70, 80, 90, 100];

function PracticeCenterPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Practice Center"
        subtitle="Full book revision, custom chapter practice, and randomly generated tests."
      />
      <Tabs defaultValue="revision" className="w-full">
        <TabsList>
          <TabsTrigger value="revision" className="gap-2"><BookOpen className="size-4" /> Full Book Revision</TabsTrigger>
          <TabsTrigger value="practice" className="gap-2"><Shuffle className="size-4" /> Custom Practice</TabsTrigger>
          <TabsTrigger value="random" className="gap-2"><Dices className="size-4" /> Random Test</TabsTrigger>
        </TabsList>
        <TabsContent value="revision" className="mt-6">
          <FullBookRevisionTab />
        </TabsContent>
        <TabsContent value="practice" className="mt-6">
          <CustomPracticeTab />
        </TabsContent>
        <TabsContent value="random" className="mt-6">
          <RandomTestTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function useBooks() {
  return useQuery({ queryKey: ["books"], queryFn: bookService.getBooks });
}

function useChapters(bookId: number | undefined) {
  return useQuery({
    queryKey: ["chapters", bookId],
    queryFn: () => chapterService.getChapters(bookId!),
    enabled: !!bookId,
  });
}

function BookPicker({ value, onChange }: { value: number | undefined; onChange: (id: number) => void }) {
  const books = useBooks();
  if (books.isLoading) return <p className="text-sm text-muted-foreground">Loading books…</p>;
  if (!books.data || books.data.length === 0) {
    return <EmptyState icon={BookOpen} title="No books yet" description="Ask an admin to add a book first." />;
  }
  const selectProps = value ? { value: String(value) } : {};
  return (
    <Select {...selectProps} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className="w-full sm:w-80">
        <SelectValue placeholder="Choose a book" />
      </SelectTrigger>
      <SelectContent>
        {books.data.map((b) => (
          <SelectItem key={b.id} value={String(b.id)}>{b.title}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ---------------------------------------------------------------------------
// FEATURE 1 — Full Book Revision
// ---------------------------------------------------------------------------
function FullBookRevisionTab() {
  const navigate = useNavigate();
  const [bookId, setBookId] = useState<number | undefined>();

  const status = useQuery({
    queryKey: ["revision-status", bookId],
    queryFn: () => revisionService.getStatus(bookId!),
    enabled: !!bookId,
  });

  const resumable = status.data?.has_session && (status.data.status === "in_progress" || status.data.status === "paused");

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-4 p-6">
          <div>
            <Label className="mb-2 block">Book</Label>
            <BookPicker value={bookId} onChange={setBookId} />
          </div>

          {bookId && status.isLoading && <p className="text-sm text-muted-foreground">Checking for saved progress…</p>}

          {bookId && !status.isLoading && (
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
              {resumable ? (
                <div>
                  <p className="text-sm font-semibold">
                    {status.data?.status === "paused" ? "Revision paused" : "Revision in progress"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {status.data?.answered_count ?? 0} of {status.data?.total_questions ?? 0} questions answered
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Loads every MCQ across all chapters of this book, in order, with your progress saved automatically.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {resumable ? (
                  <>
                    <Button
                      className="gap-2"
                      onClick={() => navigate({ to: "/student/quiz-session", search: { mode: "book", bookId } })}
                    >
                      <Play className="size-4" /> Continue Revision
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => navigate({ to: "/student/quiz-session", search: { mode: "book", bookId, restart: true } })}
                    >
                      <RotateCcw className="size-4" /> Restart
                    </Button>
                  </>
                ) : (
                  <Button
                    className="gap-2"
                    onClick={() => navigate({ to: "/student/quiz-session", search: { mode: "book", bookId } })}
                  >
                    <Play className="size-4" /> Start Full Book Revision
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FEATURE 3 — Practice Mode (one / multiple / all chapters, always shuffled)
// ---------------------------------------------------------------------------
function CustomPracticeTab() {
  const navigate = useNavigate();
  const [bookId, setBookId] = useState<number | undefined>();
  const [scope, setScope] = useState<"one" | "multiple" | "all">("one");
  const [selected, setSelected] = useState<number[]>([]);

  const chapters = useChapters(bookId);

  function toggle(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  const chapterIds = useMemo(() => {
    if (scope === "all") return (chapters.data ?? []).map((c) => c.id);
    return selected;
  }, [scope, selected, chapters.data]);

  const canStart = chapterIds.length > 0;

  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div>
          <Label className="mb-2 block">Book</Label>
          <BookPicker value={bookId} onChange={(id) => { setBookId(id); setSelected([]); }} />
        </div>

        {bookId && (
          <>
            <div>
              <Label className="mb-2 block">Scope</Label>
              <RadioGroup value={scope} onValueChange={(v) => setScope(v as typeof scope)} className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="one" id="scope-one" />
                  <Label htmlFor="scope-one" className="font-normal">One chapter</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="multiple" id="scope-multiple" />
                  <Label htmlFor="scope-multiple" className="font-normal">Multiple chapters</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="all" id="scope-all" />
                  <Label htmlFor="scope-all" className="font-normal">All chapters</Label>
                </div>
              </RadioGroup>
            </div>

            {chapters.isLoading && <p className="text-sm text-muted-foreground">Loading chapters…</p>}

            {chapters.data && chapters.data.length === 0 && (
              <EmptyState icon={BookOpen} title="No chapters yet" description="This book has no chapters yet." />
            )}

            {chapters.data && chapters.data.length > 0 && scope === "one" && (
              <Select
                {...(selected[0] ? { value: String(selected[0]) } : {})}
                onValueChange={(v) => setSelected([Number(v)])}
              >
                <SelectTrigger className="w-full sm:w-80">
                  <SelectValue placeholder="Choose a chapter" />
                </SelectTrigger>
                <SelectContent>
                  {chapters.data.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.chapter_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {chapters.data && chapters.data.length > 0 && scope === "multiple" && (
              <div className="grid gap-2 sm:grid-cols-2">
                {chapters.data.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
                    <Checkbox checked={selected.includes(c.id)} onCheckedChange={() => toggle(c.id)} />
                    {c.chapter_name}
                  </label>
                ))}
              </div>
            )}

            {chapters.data && chapters.data.length > 0 && scope === "all" && (
              <p className="text-sm text-muted-foreground">{chapters.data.length} chapters will be mixed together and shuffled.</p>
            )}

            <Button
              className="gap-2"
              disabled={!canStart}
              onClick={() =>
                navigate({
                  to: "/student/quiz-session",
                  search: { mode: "mixed", chapterIds: chapterIds.join(","), title: "Practice" },
                })
              }
            >
              <Shuffle className="size-4" /> Start Practice
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// FEATURE 4 — Random Test Builder
// ---------------------------------------------------------------------------
function RandomTestTab() {
  const navigate = useNavigate();
  const [count, setCount] = useState(50);
  const [source, setSource] = useState<"chapters" | "book" | "database">("database");
  const [bookId, setBookId] = useState<number | undefined>();
  const [selected, setSelected] = useState<number[]>([]);

  const chapters = useChapters(source === "chapters" ? bookId : undefined);

  function toggle(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  const canStart =
    source === "database" ||
    (source === "book" && !!bookId) ||
    (source === "chapters" && selected.length > 0);

  function start() {
    if (source === "database") {
      navigate({ to: "/student/quiz-session", search: { mode: "random", source: "database", count } });
    } else if (source === "book" && bookId) {
      navigate({ to: "/student/quiz-session", search: { mode: "random", source: "book", bookId, count } });
    } else if (source === "chapters" && selected.length > 0) {
      navigate({
        to: "/student/quiz-session",
        search: { mode: "mixed", chapterIds: selected.join(","), count, title: "Random Test" },
      });
    }
  }

  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div>
          <Label className="mb-2 block">Question count</Label>
          <Select value={String(count)} onValueChange={(v) => setCount(Number(v))}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEST_SIZES.map((n) => (
                <SelectItem key={n} value={String(n)}>{n} questions</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-2 block">Source</Label>
          <RadioGroup value={source} onValueChange={(v) => { setSource(v as typeof source); setSelected([]); }} className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="chapters" id="src-chapters" />
              <Label htmlFor="src-chapters" className="font-normal">Selected chapters</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="book" id="src-book" />
              <Label htmlFor="src-book" className="font-normal">Entire book</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="database" id="src-database" />
              <Label htmlFor="src-database" className="font-normal">Entire database</Label>
            </div>
          </RadioGroup>
        </div>

        {(source === "book" || source === "chapters") && (
          <div>
            <Label className="mb-2 block">Book</Label>
            <BookPicker value={bookId} onChange={(id) => { setBookId(id); setSelected([]); }} />
          </div>
        )}

        {source === "chapters" && bookId && (
          <div>
            {chapters.isLoading && <p className="text-sm text-muted-foreground">Loading chapters…</p>}
            {chapters.data && chapters.data.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {chapters.data.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
                    <Checkbox checked={selected.includes(c.id)} onCheckedChange={() => toggle(c.id)} />
                    {c.chapter_name}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <Button className="gap-2" disabled={!canStart} onClick={start}>
          <Dices className="size-4" /> Generate Random Test
        </Button>
      </CardContent>
    </Card>
  );
}
