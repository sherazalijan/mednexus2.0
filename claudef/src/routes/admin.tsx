import { createFileRoute, Outlet } from "@tanstack/react-router";
import {
  Bell,
  BookOpen,
  CreditCard,
  FilePlus2,
  KeyRound,
  LayoutDashboard,
  Trophy,
  Users,
  Sparkles,
  Clock,
  MessageSquareWarning,
} from "lucide-react";
import { PortalShell, type NavItem } from "@/components/mednexus/PortalShell";
import { useRequireRole } from "@/hooks/useAuth";
import { PortalSkeleton } from "@/components/mednexus/PortalSkeleton";

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: AdminLayout,
});

const NAV: NavItem[] = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/users", label: "User Management", icon: Users },
  { to: "/admin/payment-proofs", label: "Payment Proofs", icon: CreditCard },
  { to: "/admin/coming-soon", label: "Coming Soon Books", icon: Sparkles },
  { to: "/admin/leads", label: "Visitor Leads & Timer", icon: Clock },
  { to: "/admin/complaints", label: "Complaints & Inquiries", icon: MessageSquareWarning },
  { to: "/admin/books", label: "Books & Chapters", icon: BookOpen },
  { to: "/admin/mcq-upload", label: "MCQ Upload", icon: FilePlus2 },
  { to: "/admin/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/admin/announcements", label: "Announcements", icon: Bell },
  { to: "/change-password", label: "Change Password", icon: KeyRound },
];

function AdminLayout() {
  const { user, loading, logout } = useRequireRole("admin");

  if (loading || !user) return <PortalSkeleton />;

  return (
    <PortalShell items={NAV} fullName={user.full_name} role="Administrator" onLogout={logout}>
      <Outlet />
    </PortalShell>
  );
}
