import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FilePlus2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/mednexus/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { bookService, chapterService, mcqService } from "@/services/content.service";
import { apiErrorMessage } from "@/services/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/mcq-upload")({
  head: () => ({
    meta: [
      { title: "MCQ Upload — MedNexus Admin" },
      { name: "description", content: "Add new multiple-choice questions with options, correct answer and explanation." },
      { property: "og:title", content: "MCQ Upload — MedNexus Admin" },
      { property: "og:description", content: "Publish new questions to the MedNexus QBank." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: McqUpload,
});

const LETTERS = ["A", "B", "C", "D"] as const;

function McqUpload() {
  const [bookId, setBookId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState({ a: "", b: "", c: "", d: "" });
  const [correct, setCorrect] = useState<(typeof LETTERS)[number]>("A");
  const [explanation, setExplanation] = useState("");

  const books = useQuery({ queryKey: ["books"], queryFn: bookService.getBooks });
  const chapters = useQuery({
    queryKey: ["chapters", bookId],
    queryFn: () => chapterService.getChapters(Number(bookId)),
    enabled: !!bookId,
  });

  const create = useMutation({
    mutationFn: () =>
      mcqService.createMCQ({
        chapter_id: Number(chapterId),
        question,
        option_a: options.a,
        option_b: options.b,
        option_c: options.c,
        option_d: options.d,
        correct_answer: correct,
        explanation,
      }),
    onSuccess: () => {
      toast.success("Question published");
      setQuestion(""); setOptions({ a: "", b: "", c: "", d: "" }); setExplanation(""); setCorrect("A");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not create question")),
  });

  return (
    <div className="space-y-8">
      <PageHeader title="MCQ upload" subtitle="Publish a new question into a chapter." />
      <form
        className="card-surface mx-auto w-full max-w-4xl p-6 sm:p-8"
        onSubmit={(e) => {
          e.preventDefault();
          if (!chapterId) { toast.error("Select a chapter"); return; }
          create.mutate();
        }}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="book">Book</Label>
            <select id="book" value={bookId} onChange={(e) => { setBookId(e.target.value); setChapterId(""); }}
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm">
              <option value="">Select a book</option>
              {books.data?.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="chapter">Chapter</Label>
            <select id="chapter" value={chapterId} onChange={(e) => setChapterId(e.target.value)} disabled={!bookId}
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm disabled:opacity-50">
              <option value="">{bookId ? "Select a chapter" : "Choose a book first"}</option>
              {chapters.data?.map((c) => <option key={c.id} value={c.id}>{c.chapter_name}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <Label htmlFor="q">Question</Label>
          <Textarea id="q" rows={3} required value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Clinical stem…" />
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {LETTERS.map((l) => {
            const key = l.toLowerCase() as "a";
            return (
              <div key={l} className="space-y-2">
                <Label htmlFor={`opt-${l}`}>Option {l}</Label>
                <Input id={`opt-${l}`} required value={options[key]}
                  onChange={(e) => setOptions((o) => ({ ...o, [key]: e.target.value }))} className="h-11" />
              </div>
            );
          })}
        </div>

        <div className="mt-5 space-y-2">
          <Label>Correct answer</Label>
          <div className="flex gap-2">
            {LETTERS.map((l) => (
              <button key={l} type="button" onClick={() => setCorrect(l)}
                className={cn("size-11 rounded-xl border font-bold transition-colors",
                  correct === l ? "border-accent bg-accent text-accent-foreground" : "border-border hover:border-accent/50")}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <Label htmlFor="ex">Explanation</Label>
          <Textarea id="ex" rows={3} value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="Why the correct option is correct" />
        </div>

        <Button type="submit" size="lg" className="mt-6 w-full gap-2" disabled={create.isPending}>
          {create.isPending ? <Loader2 className="size-4 animate-spin" /> : <FilePlus2 className="size-4" />} Publish question
        </Button>
      </form>
    </div>
  );
}
