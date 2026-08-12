import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Layers, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/mednexus/PageHeader";
import { EmptyState } from "@/components/mednexus/EmptyState";
import { QueryError } from "@/components/mednexus/QueryError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { chapterService } from "@/services/content.service";
import { apiErrorMessage } from "@/services/api";

export const Route = createFileRoute("/admin/books/$bookId/chapters")({
  head: () => ({
    meta: [
      { title: "Manage Chapters — MedNexus Admin" },
      { name: "description", content: "Create and review the chapters that structure a MedNexus book." },
      { property: "og:title", content: "Manage Chapters — MedNexus Admin" },
      { property: "og:description", content: "Chapter management for the MedNexus QBank." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminChapters,
});

function AdminChapters() {
  const { bookId } = Route.useParams();
  const qc = useQueryClient();
  const [name, setName] = useState("");

  const chapters = useQuery({ queryKey: ["chapters", bookId], queryFn: () => chapterService.getChapters(Number(bookId)) });
  const create = useMutation({
    mutationFn: () => chapterService.createChapter(Number(bookId), { chapter_name: name }),
    onSuccess: () => { toast.success("Chapter created"); setName(""); qc.invalidateQueries({ queryKey: ["chapters", bookId] }); },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not create chapter")),
  });

  return (
    <div className="space-y-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2 gap-2">
        <Link to="/admin/books"><ArrowLeft className="size-4" /> Back to books</Link>
      </Button>
      <PageHeader title="Chapters" subtitle={`Book #${bookId}`} />

      <section className="grid gap-5 xl:grid-cols-[1fr_1.6fr]">
        <form className="card-surface h-fit p-6" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <h2 className="font-heading text-lg font-bold">Add a chapter</h2>
          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cn">Chapter name</Label>
              <Input id="cn" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Cardiac cycle" className="h-11" />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={create.isPending}>
              {create.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Create chapter
            </Button>
          </div>
        </form>

        <div className="space-y-3">
          {chapters.isLoading ? (
            <div className="grid place-items-center py-20"><Loader2 className="size-6 animate-spin text-primary" /></div>
          ) : chapters.isError ? (
            <QueryError error={chapters.error} onRetry={() => chapters.refetch()} title="Couldn't load chapters" />
          ) : (chapters.data?.length ?? 0) === 0 ? (
            <EmptyState icon={Layers} title="No chapters yet" description="Add the first chapter to this book." />
          ) : (
            chapters.data!.map((c) => (
              <div key={c.id} className="card-surface flex items-center gap-4 p-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
                  <Layers className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.chapter_name}</p>
                  <p className="text-xs text-muted-foreground">Chapter #{c.id}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
