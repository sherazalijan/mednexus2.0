import api from "./api";
import type { QuizHistory, Subscription, UserProfile, UserStats } from "@/types/user";

export const userService = {
  async getProfile(id: number): Promise<UserProfile> {
    const { data } = await api.get<UserProfile>(`/users/${id}`);
    return data;
  },
  async getHistory(id: number): Promise<QuizHistory[]> {
    const { data } = await api.get<QuizHistory[]>(`/users/${id}/history`);
    return data;
  },
  async getStats(id: number): Promise<UserStats> {
    const { data } = await api.get<UserStats>(`/users/${id}/stats`);
    return data;
  },
  async getSubscription(id: number): Promise<Subscription> {
    const { data } = await api.get<Subscription>(`/users/${id}/subscription`);
    return data;
  },
};
