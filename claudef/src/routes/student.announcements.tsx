import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/mednexus/PageHeader";
import { EmptyState } from "@/components/mednexus/EmptyState";
import { QueryError } from "@/components/mednexus/QueryError";
import { announcementService } from "@/services/content.service";

export const Route = createFileRoute("/student/announcements")({
  head: () => ({
    meta: [
      { title: "Announcements — MedNexus" },
      { name: "description", content: "Platform announcements and updates from the MedNexus team." },
      { property: "og:title", content: "Announcements — MedNexus" },
      { property: "og:description", content: "Latest updates from the MedNexus team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentAnnouncements,
});

function StudentAnnouncements() {
  const list = useQuery({ queryKey: ["announcements"], queryFn: announcementService.getAnnouncements });

  return (
    <div className="space-y-8">
      <PageHeader title="Announcements" subtitle="Updates from the MedNexus team." />
      {list.isLoading ? (
        <div className="grid place-items-center py-20"><Loader2 className="size-6 animate-spin text-primary" /></div>
      ) : list.isError ? (
        <QueryError error={list.error} onRetry={() => list.refetch()} title="Couldn't load announcements" />
      ) : (list.data?.length ?? 0) === 0 ? (
        <EmptyState icon={Bell} title="Nothing new" description="There are no active announcements right now." />
      ) : (
        <div className="space-y-4">
          {list.data!.map((a) => (
            <article key={a.id} className="card-surface flex gap-4 p-6">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Bell className="size-5" />
              </span>
              <div className="min-w-0">
                <h2 className="font-heading text-lg font-bold">{a.title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a.message}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
