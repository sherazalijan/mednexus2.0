import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { leadsService } from "@/services/leads.service";

export function DemoCountdownBanner() {
  const timerQuery = useQuery({
    queryKey: ["demo-timer"],
    queryFn: leadsService.getDemoTimerConfig,
    staleTime: 60000,
  });

  // Client-side fallback end date: 7 days from initial load
  const fallbackEndsAt = useMemo(() => {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  }, []);

  const title = timerQuery.data?.title || "⚡ Free Demo Mode access ending soon! Lock in your PKR 500 subscription price today.";
  const endsAt = timerQuery.data?.ends_at || fallbackEndsAt;
  const isActive = timerQuery.data?.active ?? true;

  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 6,
    hours: 23,
    minutes: 59,
    seconds: 59,
  });

  useEffect(() => {
    if (!isActive || !endsAt) return;

    const targetDate = new Date(endsAt).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = targetDate - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [endsAt, isActive]);

  if (!isActive) {
    return null;
  }

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="w-full bg-gradient-to-r from-accent/95 via-primary to-accent py-2.5 px-4 text-primary-foreground shadow-md relative z-50">
      <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 font-bold tracking-wide text-center sm:text-left">
          <span className="flex size-6 place-items-center rounded-full bg-primary-foreground/20 text-accent-foreground animate-pulse shrink-0">
            <Clock className="size-3.5 mx-auto" />
          </span>
          <span>{title}</span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Countdown Clock Box */}
          <div className="flex items-center gap-1 font-mono text-xs font-black">
            <span className="rounded bg-black/30 px-1.5 py-0.5">{pad(timeLeft.days)}d</span>
            <span>:</span>
            <span className="rounded bg-black/30 px-1.5 py-0.5">{pad(timeLeft.hours)}h</span>
            <span>:</span>
            <span className="rounded bg-black/30 px-1.5 py-0.5">{pad(timeLeft.minutes)}m</span>
            <span>:</span>
            <span className="rounded bg-black/30 px-1.5 py-0.5 text-accent-foreground">{pad(timeLeft.seconds)}s</span>
          </div>

          <Button asChild size="sm" variant="secondary" className="h-7 text-[11px] font-bold gap-1 px-3">
            <Link to="/register">
              Lock PKR 500 Price <ArrowRight className="size-3" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
