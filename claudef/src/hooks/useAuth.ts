import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { authService } from "@/services/auth.service";
import type { AuthUser } from "@/types/auth";

/** Reads the persisted session. Client-only: returns `loading` until mounted. */
export function useAuth() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(authService.getCurrentUser());
    setLoading(false);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    navigate({ to: "/login", replace: true });
  }, [navigate]);

  return { user, loading, logout, isAuthenticated: !!user };
}

/** Redirects to /login (or the other portal) unless the session matches `role`. */
export function useRequireRole(role: "student" | "admin") {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (user.role !== role) {
      navigate({
        to: user.role === "admin" ? "/admin/dashboard" : "/student/dashboard",
        replace: true,
      });
    }
  }, [loading, user, role, navigate]);

  return { user, loading: loading || !user || user.role !== role, logout };
}
