import { useState, useEffect } from "react";
import { Loader2, Sparkles, User, Mail, GraduationCap, Phone, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { leadsService } from "@/services/leads.service";
import { apiErrorMessage } from "@/services/api";

const YEARS = [
  "1st Year MBBS",
  "2nd Year MBBS",
  "3rd Year MBBS",
  "4th Year MBBS",
  "Final Year MBBS",
  "BDS Dentistry",
  "FCPS Part 1 Aspirant",
  "House Officer / Medical Officer",
];

const LEAD_STORAGE_KEY = "mednexus_visitor_lead_captured";

interface VisitorLeadModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function VisitorLeadModal({ open: externalOpen, onOpenChange, onSuccess }: VisitorLeadModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [college, setCollege] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [year, setYear] = useState("1st Year MBBS");
  const [loading, setLoading] = useState(false);

  const isControlled = externalOpen !== undefined;
  const isOpen = isControlled ? externalOpen : internalOpen;

  useEffect(() => {
    if (isControlled) return undefined;
    if (typeof window === "undefined") return undefined;
    const captured = window.localStorage.getItem(LEAD_STORAGE_KEY);
    if (!captured) {
      const timer = setTimeout(() => setInternalOpen(true), 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isControlled]);

  const handleClose = (v: boolean) => {
    if (onOpenChange) onOpenChange(v);
    if (!isControlled) setInternalOpen(v);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !college.trim()) {
      toast.error("Please fill in your name, email, and college.");
      return;
    }
    setLoading(true);
    try {
      const payload: Parameters<typeof leadsService.submitLead>[0] = {
        full_name: fullName,
        email,
        college,
        year,
      };
      if (whatsapp.trim()) {
        payload.whatsapp = whatsapp.trim();
      }
      await leadsService.submitLead(payload);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LEAD_STORAGE_KEY, "true");
      }
      toast.success("Welcome to MedNexus! Accessing Demo QBank...");
      handleClose(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not submit form"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto card-surface p-6 sm:p-8">
        <DialogHeader className="space-y-2">
          <div className="inline-flex items-center gap-1.5 self-start rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" /> Welcome to MedNexus
          </div>
          <DialogTitle className="font-heading text-2xl font-black">
            Get Free Demo Access
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Please fill in your details to unlock instant Demo QBank access, practice questions, and promotional updates.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="lead-name" className="text-xs font-semibold">Full Name *</Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="lead-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Dr. Sheraz Ali"
                className="h-10 pl-9 text-xs"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lead-email" className="text-xs font-semibold">Email Address *</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="lead-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@medschool.edu"
                className="h-10 pl-9 text-xs"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lead-college" className="text-xs font-semibold">Medical College / University *</Label>
            <div className="relative">
              <GraduationCap className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="lead-college"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                placeholder="e.g. King Edward, KMC, Nishtar, AMC..."
                className="h-10 pl-9 text-xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lead-year" className="text-xs font-semibold">Academic Year / Track *</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger id="lead-year" className="h-10 text-xs">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={y} className="text-xs">
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lead-whatsapp" className="text-xs font-semibold">WhatsApp (Optional)</Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="lead-whatsapp"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+92 318..."
                  className="h-10 pl-9 text-xs"
                />
              </div>
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full gap-2 text-xs font-bold" disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Unlock Free Demo QBank
          </Button>

          <p className="text-[11px] text-center text-muted-foreground">
            We respect your privacy. No spam. You will get exclusive QBank trial access.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
