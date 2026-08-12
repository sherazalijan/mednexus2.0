import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ChevronRight, Loader2, PlayCircle, Sparkles, GraduationCap, Search, Stethoscope } from "lucide-react";
import { PageHeader } from "@/components/mednexus/PageHeader";
import { EmptyState } from "@/components/mednexus/EmptyState";
import { QueryError } from "@/components/mednexus/QueryError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { bookService } from "@/services/content.service";
import type { Book } from "@/types/content";

export const Route = createFileRoute("/student/books/")({
  head: () => ({
    meta: [
      { title: "Medical Library — MedNexus" },
      { name: "description", content: "Browse MBBS, BDS, and FCPS Part 1 QBanks (SK23, SK24, TMM Super 6) by category." },
      { property: "og:title", content: "Medical Library — MedNexus" },
    ],
  }),
  component: StudentBooks,
});

type TrackCategory = "all" | "mbbs" | "bds" | "fcps_part1";

interface CategorizedBook extends Book {
  trackCategory: "MBBS" | "BDS" | "FCPS Part 1 Preparation";
  subCategory?: string;
}

// Fallback high-yield QBank catalog so logged-in students immediately see SK23, SK24, TMM Super 6, etc.
const DEFAULT_CATALOG: CategorizedBook[] = [
  {
    id: 101,
    title: "SK23 — FCPS Part 1 Core QBank",
    description: "High-yield past paper MCQs, answer keys, and anatomical/physiological explanations for FCPS Part 1.",
    trackCategory: "FCPS Part 1 Preparation",
    subCategory: "FCPS Part 1",
  },
  {
    id: 102,
    title: "SK24 — FCPS Part 1 Super Revision",
    description: "24-chapter comprehensive review questions for FCPS Part 1 candidates with clinical rationale.",
    trackCategory: "FCPS Part 1 Preparation",
    subCategory: "FCPS Part 1",
  },
  {
    id: 103,
    title: "TMM Super 6 — 2nd Year MBBS",
    description: "Essential 2nd Year MBBS high-yield revision topics, anatomy, physiology, and pathology MCQs.",
    trackCategory: "MBBS",
    subCategory: "2nd Year MBBS",
  },
  {
    id: 104,
    title: "General Anatomy & Embryology QBank",
    description: "Gross Anatomy, Osteology, Histology, and Embryology MCQs for 1st Year MBBS students.",
    trackCategory: "MBBS",
    subCategory: "1st Year MBBS",
  },
  {
    id: 105,
    title: "Oral Pathology & Dental Surgery QBank",
    description: "Comprehensive BDS QBank for Dental Anatomy, Oral Pathology, and Operative Dentistry.",
    trackCategory: "BDS",
    subCategory: "BDS Dentistry",
  },
  {
    id: 106,
    title: "Clinical Medicine & General Surgery",
    description: "Scenario-based clinical MCQs for 4th Year and Final Year MBBS exam preparation.",
    trackCategory: "MBBS",
    subCategory: "Final Year MBBS",
  },
];

function getTrack(b: Book): "MBBS" | "BDS" | "FCPS Part 1 Preparation" {
  const t = (b.title + " " + (b.description || "")).toLowerCase();
  if (t.includes("sk23") || t.includes("sk24") || t.includes("fcps") || t.includes("part 1") || t.includes("part-1")) {
    return "FCPS Part 1 Preparation";
  }
  if (t.includes("bds") || t.includes("dental") || t.includes("dentistry") || t.includes("oral")) {
    return "BDS";
  }
  return "MBBS";
}

function StudentBooks() {
  const [selectedTrack, setSelectedTrack] = useState<TrackCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const booksQuery = useQuery({ queryKey: ["books"], queryFn: bookService.getBooks });

  const allBooks: CategorizedBook[] = useMemo(() => {
    const fetched = booksQuery.data ?? [];
    if (fetched.length === 0) {
      return DEFAULT_CATALOG;
    }
    return fetched.map((b) => ({
      ...b,
      trackCategory: getTrack(b),
    }));
  }, [booksQuery.data]);

  const filteredBooks = useMemo(() => {
    return allBooks.filter((b) => {
      const matchesTrack =
        selectedTrack === "all"
          ? true
          : selectedTrack === "fcps_part1"
          ? b.trackCategory === "FCPS Part 1 Preparation"
          : selectedTrack === "bds"
          ? b.trackCategory === "BDS"
          : b.trackCategory === "MBBS";

      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = !q || b.title.toLowerCase().includes(q) || (b.description || "").toLowerCase().includes(q);

      return matchesTrack && matchesQuery;
    });
  }, [allBooks, selectedTrack, searchQuery]);

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="card-surface p-6 gradient-night text-primary-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary-foreground/10 text-accent text-xs font-semibold">
            <Sparkles className="size-3.5" /> Program Specific QBanks
          </div>
          <h2 className="font-heading text-xl font-bold">MBBS, BDS & FCPS Part 1 QBanks</h2>
          <p className="text-sm text-primary-foreground/75">
            Select your track below to access SK23, SK24, TMM Super 6, and MBBS/BDS revision books.
          </p>
        </div>
        <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90 shrink-0 gap-2">
          <Link to="/student/quiz-session" search={{ mode: "random", source: "database", count: 20 }}>
            <PlayCircle className="size-4" /> Start Quick Quiz
          </Link>
        </Button>
      </div>

      <PageHeader
        title="Medical QBank Library"
        subtitle="Explore books organized by MBBS, BDS, and FCPS Part 1 Preparation."
      />

      {/* Program Track Tabs & Search Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        {/* Track Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "all", label: "All Tracks", icon: BookOpen },
            { id: "mbbs", label: "MBBS (All Years)", icon: Stethoscope },
            { id: "bds", label: "BDS Dentistry", icon: GraduationCap },
            { id: "fcps_part1", label: "FCPS Part 1 Prep (SK23, SK24)", icon: Sparkles },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedTrack(t.id as TrackCategory)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                selectedTrack === t.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-border bg-card hover:border-primary/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="size-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search SK23, SK24, TMM..."
            className="h-10 pl-9 text-xs"
          />
        </div>
      </div>

      {/* Books Grid */}
      {booksQuery.isLoading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : booksQuery.isError ? (
        <QueryError error={booksQuery.error} onRetry={() => booksQuery.refetch()} title="Couldn't load the library" />
      ) : filteredBooks.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No books match your selection"
          description="Try selecting 'All Tracks' or clear your search term."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredBooks.map((b) => (
            <div
              key={b.id}
              className="card-surface group flex flex-col justify-between p-6 transition-shadow hover:shadow-elevated"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="grid size-12 place-items-center rounded-2xl gradient-brand text-primary-foreground">
                    <BookOpen className="size-5" />
                  </span>
                  <Badge
                    className={
                      b.trackCategory === "FCPS Part 1 Preparation"
                        ? "bg-accent/15 text-accent border-accent/30"
                        : b.trackCategory === "BDS"
                        ? "bg-primary/15 text-primary"
                        : "bg-success/15 text-success"
                    }
                  >
                    {b.subCategory || b.trackCategory}
                  </Badge>
                </div>

                <h2 className="font-heading text-lg font-bold">{b.title}</h2>
                <p className="line-clamp-3 text-sm text-muted-foreground leading-relaxed">
                  {b.description || "Comprehensive medical QBank chapter review."}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-border/40">
                <Button asChild className="w-full gap-1.5">
                  <Link
                    to="/student/books/$bookId/chapters"
                    params={{ bookId: String(b.id) }}
                  >
                    Explore Chapters <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
