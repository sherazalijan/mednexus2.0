import { useState, type ReactNode } from "react";
import { Link, type LinkProps } from "@tanstack/react-router";
import { LogOut, Menu, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface NavItem {
  to: NonNullable<LinkProps["to"]>;
  label: string;
  icon: LucideIcon;
}

export function PortalShell({
  items,
  fullName,
  role,
  onLogout,
  children,
}: {
  items: NavItem[];
  fullName: string;
  role: string;
  onLogout: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "MN";

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      {items.map((item) => (
        <Link
          key={String(item.to)}
          to={item.to}
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          activeProps={{
            className:
              "bg-sidebar-primary/15 text-sidebar-accent-foreground ring-1 ring-sidebar-primary/40",
          }}
          activeOptions={{ exact: false }}
        >
          <item.icon className="size-4 shrink-0" />
          <span className="truncate">{item.label}</span>
        </Link>
      ))}
    </nav>
  );

  const sidebarInner = (
    <>
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        <BrandMark tone="dark" />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg p-1.5 text-sidebar-foreground/70 lg:hidden"
          aria-label="Close navigation"
        >
          <X className="size-5" />
        </button>
      </div>
      {nav}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex min-w-0 items-center gap-3 rounded-xl bg-sidebar-accent/60 px-3 py-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full gradient-brand text-xs font-bold text-primary-foreground">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-sidebar-accent-foreground">
              {fullName || "MedNexus user"}
            </p>
            <p className="truncate text-xs capitalize text-sidebar-foreground/60">{role}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Sign out"
            className="rounded-lg p-1.5 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-surface">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-sidebar lg:flex">
        {sidebarInner}
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <div
          className={cn(
            "absolute inset-0 bg-secondary/60 transition-opacity",
            open ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setOpen(false)}
        />
        <aside
          className={cn(
            "absolute inset-y-0 left-0 flex w-72 flex-col bg-sidebar transition-transform duration-300",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {sidebarInner}
        </aside>
      </div>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-8">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>
          <div className="lg:hidden">
            <BrandMark showWordmark={false} />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onLogout} className="gap-2">
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </header>
        <main className="shell py-6 md:py-10">{children}</main>
      </div>
    </div>
  );
}
