import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Mail, Clock, Send, Loader2, Sparkles, GraduationCap, CheckCircle2, Phone, Calendar } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { leadsService, type VisitorLead, type DemoTimerConfig } from "@/services/leads.service";
import { apiErrorMessage } from "@/services/api";

export const Route = createFileRoute("/admin/leads")({
  head: () => ({
    meta: [{ title: "Visitor Leads & Promo Campaign — Admin" }],
  }),
  component: AdminLeadsPage,
});

function AdminLeadsPage() {
  const qc = useQueryClient();
  const [promoOpen, setPromoOpen] = useState(false);
  const [subject, setSubject] = useState("Exclusive Offer: Unlock Full MedNexus QBank Access!");
  const [promoMessage, setPromoMessage] = useState(
    "Thank you for exploring MedNexus! Get complete access to MBBS, BDS, SK23, and SK24 QBanks for only PKR 500/month. Subscribe today at https://mednexus.app/register"
  );
  const [search, setSearch] = useState("");

  // Demo Timer Controls State
  const [timerTitle, setTimerTitle] = useState("⚡ Free Demo Mode access ending soon! Lock in your 500 PKR subscription price today.");
  const [timerActive, setTimerActive] = useState(true);
  const [timerDays, setTimerDays] = useState(7);

  const leadsQuery = useQuery({
    queryKey: ["admin-leads"],
    queryFn: leadsService.adminGetLeads,
  });

  const timerQuery = useQuery({
    queryKey: ["admin-demo-timer"],
    queryFn: leadsService.getDemoTimerConfig,
  });

  const sendPromo = useMutation({
    mutationFn: () => leadsService.adminSendPromo({ subject, message: promoMessage }),
    onSuccess: (data) => {
      toast.success(data.message || `Email sent to ${data.sent_count} leads!`);
      setPromoOpen(false);
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Failed to send emails")),
  });

  const updateTimer = useMutation({
    mutationFn: (config: DemoTimerConfig) => leadsService.adminUpdateDemoTimerConfig(config),
    onSuccess: () => {
      toast.success("Demo Mode timer configuration updated!");
      qc.invalidateQueries({ queryKey: ["demo-timer"] });
      qc.invalidateQueries({ queryKey: ["admin-demo-timer"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not update timer config")),
  });

  const handleSetTimer1Week = () => {
    const endsAt = new Date(Date.now() + timerDays * 24 * 60 * 60 * 1000).toISOString();
    updateTimer.mutate({
      active: timerActive,
      title: timerTitle,
      ends_at: endsAt,
    });
  };

  const leadsList = leadsQuery.data?.leads ?? [];
  const filteredLeads = leadsList.filter(
    (l) =>
      !search ||
      l.full_name.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase()) ||
      l.college.toLowerCase().includes(search.toLowerCase()) ||
      l.year.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Visitor Leads & Demo Timer Controls"
        subtitle="Manage captured pre-login student leads, send promotional campaigns, and control the 1-week Demo Mode timer."
      />

      {/* Top Stat Cards & Quick Promo Action */}
      <div className="grid gap-6 sm:grid-cols-3">
        <Card className="card-surface p-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Captured Leads</p>
            <h2 className="font-heading text-3xl font-extrabold">{leadsQuery.data?.total_leads ?? 0}</h2>
          </div>
          <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Users className="size-6" />
          </div>
        </Card>

        <Card className="card-surface p-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Promotional Campaign</p>
            <p className="text-xs text-muted-foreground mt-1">Send announcement email to all leads</p>
          </div>
          <Button onClick={() => setPromoOpen(true)} className="gap-2 shrink-0">
            <Mail className="size-4" /> Send Email
          </Button>
        </Card>

        <Card className="card-surface p-6 flex items-center justify-between border-accent/40 bg-accent/5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">Demo Timer Status</p>
            <p className="text-xs text-muted-foreground mt-1">
              {timerQuery.data?.active ? "Timer Active on Site" : "Timer Disabled"}
            </p>
          </div>
          <Clock className="size-6 text-accent" />
        </Card>
      </div>

      {/* Demo Mode Countdown Timer Admin Config Section */}
      <Card className="card-surface p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-2">
          <Clock className="size-5 text-primary" />
          <h2 className="font-heading text-xl font-bold">Demo Mode Countdown Timer Settings</h2>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Configure the urgent countdown banner displayed above the Demo Mode button across the site. Set a timer (e.g. 1 week) to create urgency for prospective students.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-border p-4">
            <div>
              <p className="text-sm font-semibold">Enable Demo Mode Countdown Timer</p>
              <p className="text-xs text-muted-foreground">Renders countdown banner on top of site</p>
            </div>
            <Switch checked={timerActive} onCheckedChange={setTimerActive} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timer-title" className="text-xs">Banner Urgency Text</Label>
            <Input
              id="timer-title"
              value={timerTitle}
              onChange={(e) => setTimerTitle(e.target.value)}
              className="h-10 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Timer Duration (Days)</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={timerDays}
                onChange={(e) => setTimerDays(Number(e.target.value))}
                className="h-10 w-32 text-xs"
              />
            </div>

            <Button
              onClick={handleSetTimer1Week}
              disabled={updateTimer.isPending}
              className="gap-2 self-end h-10"
            >
              {updateTimer.isPending ? <Loader2 className="size-4 animate-spin" /> : <Calendar className="size-4" />}
              Set Timer for {timerDays} Days From Now
            </Button>
          </div>

          {timerQuery.data?.ends_at && (
            <p className="text-xs text-muted-foreground">
              Current timer set to end at: <strong>{new Date(timerQuery.data.ends_at).toLocaleString()}</strong>
            </p>
          )}
        </div>
      </Card>

      {/* Visitor Leads Table Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="font-heading text-xl font-bold flex items-center gap-2">
            <GraduationCap className="size-5 text-primary" /> Captured Student Leads
          </h2>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads by name, college, email..."
            className="h-10 w-full sm:w-72 text-xs"
          />
        </div>

        {leadsQuery.isLoading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : leadsQuery.isError ? (
          <QueryError error={leadsQuery.error} onRetry={() => leadsQuery.refetch()} title="Couldn't load leads" />
        ) : filteredLeads.length === 0 ? (
          <EmptyState icon={Users} title="No visitor leads captured yet" description="Leads filled by visitors before logging in will appear here." />
        ) : (
          <div className="card-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-xs">
                <thead className="bg-surface text-left uppercase tracking-wider text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">Student</th>
                    <th className="px-6 py-3.5 font-semibold">Medical College</th>
                    <th className="px-6 py-3.5 font-semibold">Year / Track</th>
                    <th className="px-6 py-3.5 font-semibold">WhatsApp</th>
                    <th className="px-6 py-3.5 font-semibold">Captured Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLeads.map((l) => (
                    <tr key={l.id} className="hover:bg-surface/50">
                      <td className="px-6 py-4">
                        <p className="font-bold text-sm">{l.full_name}</p>
                        <p className="text-muted-foreground">{l.email}</p>
                      </td>
                      <td className="px-6 py-4 font-medium">{l.college}</td>
                      <td className="px-6 py-4">
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary font-semibold">
                          {l.year}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {l.whatsapp ? (
                          <a href={`https://wa.me/${l.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" className="text-success font-semibold hover:underline">
                            {l.whatsapp}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {l.created_at ? new Date(l.created_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Send Promo Email Modal */}
      <Dialog open={promoOpen} onOpenChange={setPromoOpen}>
        <DialogContent className="sm:max-w-lg card-surface p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold">
              Send Promotional Email to Leads
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              This email will be delivered to all {leadsList.length} captured visitor leads.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="promo-subject" className="text-xs">Subject Line *</Label>
              <Input
                id="promo-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="h-10 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="promo-msg" className="text-xs">Email Content / Message *</Label>
              <Textarea
                id="promo-msg"
                rows={6}
                value={promoMessage}
                onChange={(e) => setPromoMessage(e.target.value)}
                className="text-xs leading-relaxed"
              />
            </div>

            <Button
              onClick={() => sendPromo.mutate()}
              disabled={sendPromo.isPending}
              className="w-full gap-2 text-xs font-bold"
            >
              {sendPromo.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Send Email to All {leadsList.length} Leads
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
