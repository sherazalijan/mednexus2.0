import api from "./api";
import type {
  AccountStatus,
  CreateUserRequest,
  CreateUserResponse,
  DashboardStats,
  LeaderboardEntry,
  User,
} from "@/types/user";

export type LeaderboardScope = "global" | "weekly" | "monthly" | "book" | "chapter";

/** Statuses the backend `PATCH /admin/users/{id}/status` handler accepts. */
export const UPDATABLE_STATUSES = ["active", "suspended", "disabled"] as const;
export type UpdatableStatus = (typeof UPDATABLE_STATUSES)[number];

export const adminService = {
  async getDashboard(): Promise<DashboardStats> {
    const { data } = await api.get<DashboardStats>("/admin/dashboard");
    return data;
  },

  async getUsers(): Promise<User[]> {
    const { data } = await api.get<User[]>("/admin/users");
    return data;
  },

  async createUser(payload: CreateUserRequest): Promise<CreateUserResponse> {
    const { data } = await api.post<CreateUserResponse>("/admin/create-user", payload);
    return data;
  },

  /**
   * Activate / Suspend / Disable a user.
   * PATCH /admin/users/{id}/status  body: { account_status }
   */
  async updateUserStatus(id: number, account_status: UpdatableStatus): Promise<User> {
    const { data } = await api.patch<User>(`/admin/users/${id}/status`, { account_status });
    return data;
  },

  async getLeaderboard(scope: LeaderboardScope = "global"): Promise<LeaderboardEntry[]> {
    const { data } = await api.get<LeaderboardEntry[]>("/admin/leaderboard", {
      params: { scope },
    });
    return data;
  },
};

export type { AccountStatus };
