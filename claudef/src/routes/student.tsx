import { createFileRoute, Outlet } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  BookOpen,
  Bookmark,
  CreditCard,
  Dices,
  LayoutDashboard,
  KeyRound,
  UserRound,
} from "lucide-react";
import { PortalShell, type NavItem } from "@/components/mednexus/PortalShell";
import { useRequireRole } from "@/hooks/useAuth";
import { PortalSkeleton } from "@/components/mednexus/PortalSkeleton";

export const Route = createFileRoute("/student")({
  ssr: false,
  component: StudentLayout,
});

const NAV: NavItem[] = [
  { to: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/student/books", label: "Books & Chapters", icon: BookOpen },
  { to: "/student/practice", label: "Practice Center", icon: Dices },
  { to: "/student/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/student/bookmarks", label: "Bookmarks", icon: Bookmark },
  { to: "/student/announcements", label: "Announcements", icon: Bell },
  { to: "/student/subscription", label: "Subscription", icon: CreditCard },
  { to: "/student/profile", label: "Profile", icon: UserRound },
  { to: "/change-password", label: "Change Password", icon: KeyRound },
];

function StudentLayout() {
  const { user, loading, logout } = useRequireRole("student");

  if (loading || !user) return <PortalSkeleton />;

  return (
    <PortalShell items={NAV} fullName={user.full_name} role="Student" onLogout={logout}>
      <Outlet />
    </PortalShell>
  );
}
