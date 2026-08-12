import { useQuery } from "@tanstack/react-query";
import { Sparkles, GraduationCap, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { comingSoonService, type ComingSoonBook } from "@/services/coming_soon.service";

export const DEFAULT_UPCOMING_BOOKS: ComingSoonBook[] = [
  {
    title: "TMM Super 6",
    category: "MBBS 2nd Year",
    target_audience: "2nd Year MBBS Students",
    description: "High-yield chapter-wise MCQs and rapid revision notes for 2nd Year MBBS subjects.",
    release_tag: "Coming Soon Online",
    featured: true,
  },
  {
    title: "SK24 (Super 24 FCPS Part 1)",
    category: "FCPS Part 1",
    target_audience: "FCPS Part 1 Aspirants & House Officers",
    description: "Comprehensive 24-chapter past papers, explanations, and key concepts for FCPS Part 1.",
    release_tag: "Coming Soon Online",
    featured: true,
  },
  {
    title: "SK23 (FCPS Part 1 Core)",
    category: "FCPS Part 1",
    target_audience: "FCPS Part 1 Aspirants",
    description: "High-yield past paper questions with anatomical and physiological explanations.",
    release_tag: "Coming Soon Online",
    featured: true,
  },
  {
    title: "Anatomy & Histology QBank",
    category: "MBBS 1st Year",
    target_audience: "1st Year MBBS Students",
    description: "Gross Anatomy, Embryology, and Histology MCQs with high-resolution diagram explanations.",
    release_tag: "In Preparation",
    featured: false,
  },
  {
    title: "Physiology & Biochemistry Master",
    category: "MBBS 1st & 2nd Year",
    target_audience: "1st & 2nd Year MBBS",
    description: "Organ system physiological concepts, clinical biochemistry, and rapid revision MCQs.",
    release_tag: "In Preparation",
    featured: false,
  },
  {
    title: "Clinical Medicine & Surgery Core",
    category: "MBBS 4th & Final Year",
    target_audience: "4th & Final Year MBBS",
    description: "Internal Medicine, General Surgery, Gynae/Obs, and Pediatrics clinical scenario MCQs.",
    release_tag: "Coming Soon",
    featured: false,
  },
];

export function ComingSoonBooks() {
  const query = useQuery({
    queryKey: ["coming-soon-books"],
    queryFn: comingSoonService.getComingSoonBooks,
    staleTime: 60000,
  });

  const booksList = (query.data && query.data.length > 0) ? query.data : DEFAULT_UPCOMING_BOOKS;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
          <Sparkles className="size-3.5" /> Upcoming Releases for MBBS & FCPS
        </div>
        <h2 className="font-heading text-2xl font-extrabold sm:text-4xl">
          Books Coming Soon Online
        </h2>
        <p className="text-sm text-muted-foreground">
          Dedicated QBanks for every MBBS Year (1st through Final Year) and FCPS Part 1 candidates will soon be active on MedNexus.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {booksList.map((b) => (
          <Card
            key={b.id || b.title}
            className={`relative overflow-hidden transition-all hover:border-primary/50 ${
              b.featured ? "border-primary/40 bg-primary/5 shadow-md" : "card-surface"
            }`}
          >
            {b.featured && (
              <div className="absolute right-0 top-0 rounded-bl-xl bg-gradient-to-r from-primary to-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                High Demand
              </div>
            )}
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <GraduationCap className="size-4" /> {b.category}
              </div>

              <div className="space-y-1">
                <h3 className="font-heading text-lg font-bold">{b.title}</h3>
                <p className="text-xs font-medium text-muted-foreground">{b.target_audience}</p>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">{b.description}</p>

              <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                <span className="flex items-center gap-1 font-semibold text-accent">
                  <Clock className="size-3.5" /> {b.release_tag}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  Online Soon
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
