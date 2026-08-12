import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Loader2, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/mednexus/PageHeader";
import { EmptyState } from "@/components/mednexus/EmptyState";
import { QueryError } from "@/components/mednexus/QueryError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { announcementService } from "@/services/content.service";
import { apiErrorMessage } from "@/services/api";

export const Route = createFileRoute("/admin/announcements")({
  head: () => ({
    meta: [
      { title: "Announcements — MedNexus Admin" },
      { name: "description", content: "Publish platform announcements to every MedNexus student." },
      { property: "og:title", content: "Announcements — MedNexus Admin" },
      { property: "og:description", content: "Broadcast updates to MedNexus students." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminAnnouncements,
});

function AdminAnnouncements() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [expires, setExpires] = useState("");

  const list = useQuery({ queryKey: ["announcements"], queryFn: announcementService.getAnnouncements });
  const create = useMutation({
    mutationFn: () =>
      announcementService.createAnnouncement(
        expires ? { title, message, expires_at: new Date(expires).toISOString() } : { title, message },
      ),
    onSuccess: () => {
      toast.success("Announcement published");
      setTitle(""); setMessage(""); setExpires("");
      qc.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not publish announcement")),
  });

  return (
    <div className="space-y-8">
      <PageHeader title="Announcements" subtitle="Broadcast to every student instantly." />
      <section className="grid gap-5 xl:grid-cols-[1fr_1.4fr]">
        <form className="card-surface h-fit p-6" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <h2 className="font-heading text-lg font-bold">New announcement</h2>
          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="at">Title</Label>
              <Input id="at" required value={title} onChange={(e) => setTitle(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="am">Message</Label>
              <Textarea id="am" rows={5} required value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ae">Expires at</Label>
              <Input id="ae" type="datetime-local" value={expires} onChange={(e) => setExpires(e.target.value)} className="h-11" />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={create.isPending}>
              {create.isPending ? <Loader2 className="size-4 animate-spin" /> : <Megaphone className="size-4" />} Publish
            </Button>
          </div>
        </form>

        <div className="space-y-4">
          {list.isLoading ? (
            <div className="grid place-items-center py-20"><Loader2 className="size-6 animate-spin text-primary" /></div>
          ) : list.isError ? (
            <QueryError error={list.error} onRetry={() => list.refetch()} title="Couldn't load announcements" />
          ) : (list.data?.length ?? 0) === 0 ? (
            <EmptyState icon={Bell} title="No active announcements" description="Publish one to reach every student." />
          ) : (
            list.data!.map((a) => (
              <article key={a.id} className="card-surface p-6">
                <h3 className="font-heading text-lg font-bold">{a.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a.message}</p>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
