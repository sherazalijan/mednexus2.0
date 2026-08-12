import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Edit, Trash2, Loader2, Sparkles, GraduationCap, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/mednexus/PageHeader";
import { EmptyState } from "@/components/mednexus/EmptyState";
import { QueryError } from "@/components/mednexus/QueryError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { comingSoonService, type ComingSoonBook } from "@/services/coming_soon.service";
import { apiErrorMessage } from "@/services/api";

export const Route = createFileRoute("/admin/coming-soon")({
  head: () => ({
    meta: [{ title: "Manage Coming Soon Books — Admin" }],
  }),
  component: AdminComingSoonPage,
});

function AdminComingSoonPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<ComingSoonBook | null>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("MBBS 2nd Year");
  const [targetAudience, setTargetAudience] = useState("2nd Year MBBS Students");
  const [description, setDescription] = useState("");
  const [releaseTag, setReleaseTag] = useState("Coming Soon Online");
  const [featured, setFeatured] = useState(false);

  const query = useQuery({
    queryKey: ["admin-coming-soon"],
    queryFn: comingSoonService.getComingSoonBooks,
  });

  const createMutation = useMutation({
    mutationFn: (payload: ComingSoonBook) => comingSoonService.adminCreateComingSoonBook(payload),
    onSuccess: () => {
      toast.success("Coming Soon book added successfully!");
      qc.invalidateQueries({ queryKey: ["coming-soon-books"] });
      qc.invalidateQueries({ queryKey: ["admin-coming-soon"] });
      handleCloseModal();
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Failed to add book")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ComingSoonBook }) =>
      comingSoonService.adminUpdateComingSoonBook(id, payload),
    onSuccess: () => {
      toast.success("Coming Soon book updated!");
      qc.invalidateQueries({ queryKey: ["coming-soon-books"] });
      qc.invalidateQueries({ queryKey: ["admin-coming-soon"] });
      handleCloseModal();
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Failed to update book")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => comingSoonService.adminDeleteComingSoonBook(id),
    onSuccess: () => {
      toast.success("Book removed from Coming Soon slot!");
      qc.invalidateQueries({ queryKey: ["coming-soon-books"] });
      qc.invalidateQueries({ queryKey: ["admin-coming-soon"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Failed to delete book")),
  });

  const handleOpenAdd = () => {
    setEditingBook(null);
    setTitle("");
    setCategory("MBBS 2nd Year");
    setTargetAudience("2nd Year MBBS Students");
    setDescription("");
    setReleaseTag("Coming Soon Online");
    setFeatured(false);
    setModalOpen(true);
  };

  const handleOpenEdit = (b: ComingSoonBook) => {
    setEditingBook(b);
    setTitle(b.title);
    setCategory(b.category);
    setTargetAudience(b.target_audience);
    setDescription(b.description);
    setReleaseTag(b.release_tag);
    setFeatured(b.featured);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingBook(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error("Title and description are required.");
      return;
    }
    const payload: ComingSoonBook = {
      title,
      category,
      target_audience: targetAudience,
      description,
      release_tag: releaseTag,
      featured,
    };
    if (editingBook?.id) {
      updateMutation.mutate({ id: editingBook.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const books = query.data ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Manage Coming Soon Books"
        subtitle="Add, edit, or remove upcoming books featured in the 'Coming Soon Online' showcase for prospective students."
        actions={
          <Button onClick={handleOpenAdd} className="gap-2 shrink-0">
            <Plus className="size-4" /> Add Coming Soon Book
          </Button>
        }
      />

      {query.isLoading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : query.isError ? (
        <QueryError error={query.error} onRetry={() => query.refetch()} title="Could not load books" />
      ) : books.length === 0 ? (
        <EmptyState icon={BookOpen} title="No Coming Soon books listed" description="Click 'Add Coming Soon Book' above to feature new books." />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {books.map((b) => (
            <Card
              key={b.id || b.title}
              className={`relative overflow-hidden p-6 space-y-4 flex flex-col justify-between ${
                b.featured ? "border-primary/40 bg-primary/5 shadow-md" : "card-surface"
              }`}
            >
              {b.featured && (
                <div className="absolute right-0 top-0 rounded-bl-xl bg-gradient-to-r from-primary to-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                  High Demand
                </div>
              )}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <GraduationCap className="size-4" /> {b.category}
                </div>

                <div className="space-y-1">
                  <h3 className="font-heading text-lg font-bold">{b.title}</h3>
                  <p className="text-xs font-medium text-muted-foreground">{b.target_audience}</p>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">{b.description}</p>

                <div className="flex items-center gap-2 text-xs text-accent font-semibold">
                  <Clock className="size-3.5" /> {b.release_tag}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/50">
                <Button size="sm" variant="outline" onClick={() => handleOpenEdit(b)} className="h-8 gap-1 text-xs">
                  <Edit className="size-3.5" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (b.id && confirm(`Remove "${b.title}" from Coming Soon slot?`)) {
                      deleteMutation.mutate(b.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="h-8 gap-1 text-xs"
                >
                  <Trash2 className="size-3.5" /> Remove
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-lg card-surface p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold">
              {editingBook ? "Edit Coming Soon Book" : "Add New Coming Soon Book"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure the details and showcase banner for this upcoming book.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="book-title" className="text-xs">Book Title *</Label>
              <Input
                id="book-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. SK24 (Super 24 FCPS Part 1) or TMM Super 6"
                className="h-10 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="book-category" className="text-xs">Category / Degree *</Label>
                <Input
                  id="book-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. MBBS 2nd Year / FCPS Part 1"
                  className="h-10 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="book-release" className="text-xs">Release Tag *</Label>
                <Input
                  id="book-release"
                  value={releaseTag}
                  onChange={(e) => setReleaseTag(e.target.value)}
                  placeholder="e.g. Coming Soon Online"
                  className="h-10 text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="book-audience" className="text-xs">Target Audience *</Label>
              <Input
                id="book-audience"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g. 2nd Year MBBS Students & Aspirants"
                className="h-10 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="book-desc" className="text-xs">Description *</Label>
              <Textarea
                id="book-desc"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="High-yield chapter-wise MCQs and rapid revision notes..."
                className="text-xs leading-relaxed"
                required
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border p-3.5">
              <div>
                <p className="text-xs font-semibold">Feature as High Demand</p>
                <p className="text-[11px] text-muted-foreground">Highlights card with primary gradient badge</p>
              </div>
              <Switch checked={featured} onCheckedChange={setFeatured} />
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="w-full gap-2 text-xs font-bold"
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              {editingBook ? "Save Changes" : "Add to Coming Soon Slot"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
