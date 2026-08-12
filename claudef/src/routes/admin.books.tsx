import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, ChevronRight, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/mednexus/PageHeader";
import { EmptyState } from "@/components/mednexus/EmptyState";
import { QueryError } from "@/components/mednexus/QueryError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { bookService } from "@/services/content.service";
import { apiErrorMessage } from "@/services/api";

export const Route = createFileRoute("/admin/books")({
  head: () => ({
    meta: [
      { title: "Books & Chapters — MedNexus Admin" },
      { name: "description", content: "Create and manage the MedNexus book library and its chapters." },
      { property: "og:title", content: "Books & Chapters — MedNexus Admin" },
      { property: "og:description", content: "Manage the MedNexus content library." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminBooks,
});

function AdminBooks() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const books = useQuery({ queryKey: ["books"], queryFn: bookService.getBooks });

  const create = useMutation({
    mutationFn: () => bookService.createBook({ title, description }),
    onSuccess: () => { toast.success("Book created"); setTitle(""); setDescription(""); qc.invalidateQueries({ queryKey: ["books"] }); },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not create book")),
  });

  const remove = useMutation({
    mutationFn: (id: number) => bookService.deleteBook(id),
    onSuccess: () => { toast.success("Book deleted"); qc.invalidateQueries({ queryKey: ["books"] }); },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not delete book")),
  });

  return (
    <div className="space-y-8">
      <PageHeader title="Books & chapters" subtitle="The backbone of your question bank." />

      <section className="grid gap-5 xl:grid-cols-[1fr_1.6fr]">
        <form className="card-surface h-fit p-6" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <h2 className="font-heading text-lg font-bold">Add a book</h2>
          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="t">Title</Label>
              <Input id="t" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Guyton & Hall Physiology" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="d">Description</Label>
              <Textarea id="d" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short summary shown to students" />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={create.isPending}>
              {create.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Create book
            </Button>
          </div>
        </form>

        <div className="space-y-4">
          {books.isLoading ? (
            <div className="grid place-items-center py-20"><Loader2 className="size-6 animate-spin text-primary" /></div>
          ) : books.isError ? (
            <QueryError error={books.error} onRetry={() => books.refetch()} title="Couldn't load books" />
          ) : (books.data?.length ?? 0) === 0 ? (
            <EmptyState icon={BookOpen} title="No books yet" description="Create your first book to begin structuring the QBank." />
          ) : (
            books.data!.map((b) => (
              <div key={b.id} className="card-surface flex flex-wrap items-center gap-4 p-5">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl gradient-brand text-primary-foreground">
                  <BookOpen className="size-5" />
                </span>
                <div className="min-w-40 flex-1">
                  <p className="font-heading font-bold">{b.title}</p>
                  <p className="line-clamp-1 text-sm text-muted-foreground">{b.description || "No description"}</p>
                </div>
                <Button asChild size="sm" variant="outline" className="gap-1.5">
                  <Link to="/admin/books/$bookId/chapters" params={{ bookId: String(b.id) }}>
                    Chapters <ChevronRight className="size-3.5" />
                  </Link>
                </Button>
                <Button size="sm" variant="ghost" className="gap-1.5 text-destructive hover:text-destructive"
                  disabled={remove.isPending} onClick={() => remove.mutate(b.id)}>
                  <Trash2 className="size-3.5" /> Delete
                </Button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
