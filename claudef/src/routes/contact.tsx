import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Mail,
  MessageSquare,
  Send,
  Sparkles,
  Building2,
  BookOpen,
  PhoneCall,
  Loader2,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { BrandMark } from "@/components/mednexus/BrandMark";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { contactService } from "@/services/contact.service";
import { apiErrorMessage } from "@/services/api";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us & Software Services — MedNexus" },
      {
        name: "description",
        content: "Contact MedNexus for student support, complaints, custom AI solutions, and business management software.",
      },
    ],
  }),
  component: ContactPage,
});

const SERVICES = [
  {
    icon: BookOpen,
    title: "Medical QBank & MBBS / FCPS Review",
    body: "Chapter-wise MCQs, high-yield revision, and model test papers tailored for MBBS students across all years and FCPS Part 1 aspirants.",
  },
  {
    icon: Sparkles,
    title: "Custom AI & Machine Learning Solutions",
    body: "Intelligent medical question generation, custom AI learning bots, automated document analysis, and AI workflows for healthcare & education.",
  },
  {
    icon: Building2,
    title: "Business & Practice Management Software",
    body: "Tailored clinic management systems, pharmacy inventory software, business ERPs, client portals, and automated business workflows.",
  },
];

function ContactPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("complaint");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      await contactService.submitForm({
        full_name: fullName,
        email,
        category,
        message,
      });
      toast.success("Thank you! Your complaint/message has been submitted.");
      setSubmitted(true);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not submit your message."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header Navigation */}
      <header className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/">
            <BrandMark />
          </Link>
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-6xl space-y-12 px-6 py-12">
        {/* Title Banner */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            Support & Software Services
          </span>
          <h1 className="font-heading text-3xl font-extrabold sm:text-5xl">
            How can we <span className="text-gradient-brand">help you today?</span>
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Have a question, complaint, or need custom AI or business management software? Get in touch with our team directly.
          </p>
        </div>

        {/* Direct Contact Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 max-w-4xl mx-auto">
          <Card className="hover:border-primary/50 transition-all shadow-sm">
            <CardContent className="p-6 flex items-start gap-4">
              <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Mail className="size-6" />
              </div>
              <div className="space-y-1 min-w-0">
                <h3 className="font-heading text-lg font-bold">Email Us Directly</h3>
                <p className="text-xs text-muted-foreground">Drop us an email for inquiries or feedback</p>
                <a
                  href="mailto:sherazalijan5@gmail.com"
                  className="inline-block text-sm font-semibold text-primary hover:underline break-all"
                >
                  sherazalijan5@gmail.com
                </a>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-success/50 transition-all shadow-sm">
            <CardContent className="p-6 flex items-start gap-4">
              <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-success/10 text-success">
                <PhoneCall className="size-6" />
              </div>
              <div className="space-y-1 min-w-0">
                <h3 className="font-heading text-lg font-bold">WhatsApp Direct Contact</h3>
                <p className="text-xs text-muted-foreground">Instant chat support & custom software inquiries</p>
                <a
                  href="https://wa.me/923189286959"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-sm font-semibold text-success hover:underline"
                >
                  +92 318 9286959
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* What We Provide Section */}
        <div className="space-y-6 pt-4">
          <div className="text-center space-y-2">
            <h2 className="font-heading text-2xl font-bold sm:text-3xl">What We Provide</h2>
            <p className="text-sm text-muted-foreground">
              Empowering medical students and businesses with state-of-the-art software solutions.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {SERVICES.map((s) => (
              <Card key={s.title} className="card-surface hover:border-primary/40 transition-all">
                <CardContent className="p-6 space-y-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <s.icon className="size-5" />
                  </div>
                  <h3 className="font-heading text-base font-bold">{s.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Complaint Box & Inquiry Form Section */}
        <div className="grid gap-8 lg:grid-cols-2 pt-6 items-start">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <ShieldAlert className="size-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Complaint & Inquiry Box</span>
            </div>
            <h2 className="font-heading text-3xl font-extrabold">Send a Message or Report an Issue</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your feedback helps us make MedNexus better. Whether you have a complaint regarding questions, a book request, or want to build custom AI software for your organization, submit the form and our admin team will review it.
            </p>
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground">Direct Admin Contact:</p>
              <div className="text-xs space-y-1">
                <p><strong>Email:</strong> sherazalijan5@gmail.com</p>
                <p><strong>WhatsApp:</strong> +92 318 9286959</p>
              </div>
            </div>
          </div>

          <Card className="card-surface p-6 sm:p-8 shadow-md">
            {submitted ? (
              <div className="text-center py-10 space-y-4">
                <div className="grid size-16 mx-auto place-items-center rounded-full bg-success/15 text-success">
                  <CheckCircle2 className="size-8" />
                </div>
                <h3 className="font-heading text-2xl font-bold">Submission Received!</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Thank you for contacting us. Your message has been routed to the admin panel. We will reach out to you shortly.
                </p>
                <Button onClick={() => { setSubmitted(false); setMessage(""); }}>
                  Submit Another Inquiry
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Dr. Sheraz Ali"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sherazalijan5@gmail.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category / Topic *</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select topic" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="complaint">Complaint / Issue Report</SelectItem>
                      <SelectItem value="book_request">Coming Soon Book Request</SelectItem>
                      <SelectItem value="ai_software">Custom AI & Business Software Query</SelectItem>
                      <SelectItem value="inquiry">General Inquiry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message / Details *</Label>
                  <Textarea
                    id="message"
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your complaint, book suggestion, or software project details..."
                    required
                  />
                </div>

                <Button type="submit" size="lg" className="w-full gap-2" disabled={submitting}>
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Submit to Admin
                </Button>
              </form>
            )}
          </Card>
        </div>
      </main>

      <footer className="border-t border-border bg-card py-8 mt-12 text-center text-xs text-muted-foreground">
        <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <BrandMark />
          <p>© {new Date().getFullYear()} MedNexus · Email: sherazalijan5@gmail.com · WhatsApp: +92 318 9286959</p>
        </div>
      </footer>
    </div>
  );
}
