import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Mail, Loader2, CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/mednexus/PageHeader";
import { EmptyState } from "@/components/mednexus/EmptyState";
import { QueryError } from "@/components/mednexus/QueryError";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { contactService, type ContactSubmission } from "@/services/contact.service";
import { apiErrorMessage } from "@/services/api";

export const Route = createFileRoute("/admin/complaints")({
  head: () => ({
    meta: [{ title: "Student Complaints & Inquiries — Admin" }],
  }),
  component: AdminComplaintsPage,
});

function AdminComplaintsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");

  const complaints = useQuery({
    queryKey: ["admin-complaints"],
    queryFn: contactService.adminGetComplaints,
  });

  const updateStatus = useMutation({
    mutationFn: (vars: { id: number; status: "unread" | "read" | "in_progress" | "resolved" }) =>
      contactService.adminUpdateStatus(vars.id, vars.status),
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["admin-complaints"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not update status")),
  });

  const items = complaints.data ?? [];
  const filtered = items.filter((i) => (filter === "all" ? true : i.status === filter));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Student Complaints & Inquiries"
        subtitle="Review messages, complaints, coming soon book requests, and custom AI/software inquiries."
      />

      <div className="flex flex-wrap gap-2">
        {(["all", "unread", "in_progress", "resolved"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold capitalize transition-colors ${
              filter === f ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/40"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {complaints.isLoading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : complaints.isError ? (
        <QueryError error={complaints.error} onRetry={() => complaints.refetch()} title="Couldn't load complaints" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No submissions found" description="No student complaints match this filter." />
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <div key={item.id} className="card-surface p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading text-lg font-bold">{item.full_name}</h3>
                    <Badge variant="outline" className="capitalize text-xs">
                      {item.category.replace("_", " ")}
                    </Badge>
                  </div>
                  <a href={`mailto:${item.email}`} className="text-xs text-primary hover:underline">
                    {item.email}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
                  </span>
                  <Badge
                    className={
                      item.status === "unread"
                        ? "bg-destructive/15 text-destructive"
                        : item.status === "resolved"
                        ? "bg-success/15 text-success"
                        : "bg-primary/15 text-primary"
                    }
                  >
                    {item.status}
                  </Badge>
                </div>
              </div>

              <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.message}</p>

              <div className="flex justify-end gap-2 pt-2">
                {item.status !== "read" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus.mutate({ id: item.id!, status: "read" })}
                  >
                    Mark Read
                  </Button>
                )}
                {item.status !== "resolved" && (
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => updateStatus.mutate({ id: item.id!, status: "resolved" })}
                  >
                    <CheckCircle2 className="size-3.5" /> Resolve
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
