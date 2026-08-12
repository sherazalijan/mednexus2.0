import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Copy, Loader2, Power, Search, ShieldOff, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/mednexus/PageHeader";
import { StatusBadge } from "@/components/mednexus/StatusBadge";
import { EmptyState } from "@/components/mednexus/EmptyState";
import { QueryError } from "@/components/mednexus/QueryError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { adminService, type UpdatableStatus } from "@/services/admin.service";
import { apiErrorMessage } from "@/services/api";
import type { CreateUserResponse } from "@/types/user";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "User Management — MedNexus" },
      { name: "description", content: "Approve, suspend, disable and create MedNexus accounts from a single console." },
      { property: "og:title", content: "User Management — MedNexus" },
      { property: "og:description", content: "Account approvals and controls for MedNexus administrators." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminUsers,
});

const FILTERS = ["all", "active", "pending", "suspended", "disabled"] as const;

function AdminUsers() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<CreateUserResponse | null>(null);
  const [form, setForm] = useState({ full_name: "", email: "", role: "student" as "student" | "admin" });

  const users = useQuery({ queryKey: ["admin-users"], queryFn: adminService.getUsers });

  const updateStatus = useMutation({
    mutationFn: (v: { id: number; status: UpdatableStatus }) => adminService.updateUserStatus(v.id, v.status),
    onSuccess: (_data, v) => {
      toast.success(`Account ${v.status === "active" ? "activated" : v.status}`);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Status update failed")),
  });

  const createUser = useMutation({
    mutationFn: () => adminService.createUser(form),
    onSuccess: (data) => {
      setCreated(data);
      setForm({ full_name: "", email: "", role: "student" });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User created");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not create user")),
  });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (users.data ?? []).filter((u) => {
      const matchQ = !q || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchF = filter === "all" || u.account_status === filter;
      return matchQ && matchF;
    });
  }, [users.data, query, filter]);

  const busyId = updateStatus.isPending ? updateStatus.variables?.id : undefined;

  return (
    <div className="space-y-8">
      <PageHeader
        title="User management"
        subtitle="Approve registrations, suspend abuse, restore access."
        actions={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setCreated(null); }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><UserPlus className="size-4" /> Create user</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a user</DialogTitle>
                <DialogDescription>The backend generates a temporary password for the account.</DialogDescription>
              </DialogHeader>
              {created ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-success/40 bg-success/8 p-4 text-sm">
                    <p className="font-semibold">{created.full_name}</p>
                    <p className="text-muted-foreground">{created.email}</p>
                  </div>
                  {created.temporary_password && (
                    <div className="flex items-center gap-2 rounded-xl border border-border p-3">
                      <code className="min-w-0 flex-1 truncate text-sm">{created.temporary_password}</code>
                      <Button size="sm" variant="outline" className="gap-1.5"
                        onClick={() => { navigator.clipboard.writeText(created.temporary_password!); toast.success("Copied"); }}>
                        <Copy className="size-3.5" /> Copy
                      </Button>
                    </div>
                  )}
                  <Button className="w-full" onClick={() => { setCreated(null); setOpen(false); }}>Done</Button>
                </div>
              ) : (
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); createUser.mutate(); }}>
                  <div className="space-y-2">
                    <Label htmlFor="fn">Full name</Label>
                    <Input id="fn" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="em">Email</Label>
                    <Input id="em" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <div className="flex gap-2">
                      {(["student", "admin"] as const).map((r) => (
                        <button key={r} type="button" onClick={() => setForm({ ...form, role: r })}
                          className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium capitalize transition-colors ${form.role === r ? "border-primary bg-primary/8" : "border-border"}`}>
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button type="submit" className="w-full gap-2" disabled={createUser.isPending}>
                    {createUser.isPending && <Loader2 className="size-4 animate-spin" />} Create user
                  </Button>
                </form>
              )}
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email" className="h-11 pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              className={`rounded-full border px-4 py-2 text-sm font-medium capitalize transition-colors ${filter === f ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {users.isLoading ? (
        <div className="grid place-items-center py-20"><Loader2 className="size-6 animate-spin text-primary" /></div>
      ) : users.isError ? (
        <QueryError error={users.error} onRetry={() => users.refetch()} title="Couldn't load users" />
      ) : rows.length === 0 ? (
        <EmptyState icon={Users} title="No users match" description="Adjust your search or filter." />
      ) : (
        <div className="card-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-surface text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">User</th>
                  <th className="px-6 py-3.5 font-semibold">Role</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                  <th className="px-6 py-3.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((u) => {
                  const busy = busyId === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-surface">
                      <td className="px-6 py-4">
                        <p className="font-semibold">{u.full_name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </td>
                      <td className="px-6 py-4 capitalize text-muted-foreground">{u.role}</td>
                      <td className="px-6 py-4"><StatusBadge status={u.account_status} /></td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button size="sm" variant="outline" className="gap-1.5" disabled={busy || u.account_status === "active"}
                            onClick={() => updateStatus.mutate({ id: u.id, status: "active" })}>
                            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Power className="size-3.5" />} Activate
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1.5 text-warning" disabled={busy || u.account_status === "suspended"}
                            onClick={() => updateStatus.mutate({ id: u.id, status: "suspended" })}>
                            <Ban className="size-3.5" /> Suspend
                          </Button>
                          <Button size="sm" variant="ghost" className="gap-1.5 text-destructive hover:text-destructive" disabled={busy || u.account_status === "disabled"}
                            onClick={() => updateStatus.mutate({ id: u.id, status: "disabled" })}>
                            <ShieldOff className="size-3.5" /> Disable
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
