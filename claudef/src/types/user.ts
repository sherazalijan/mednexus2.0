export type AccountStatus = "active" | "pending" | "suspended" | "disabled";

export interface User {
  id: number;
  full_name: string;
  email: string;
  role: "student" | "admin";
  account_status: AccountStatus;
  created_at?: string;
}

export interface CreateUserRequest {
  full_name: string;
  email: string;
  role: "student" | "admin";
}

export interface CreateUserResponse extends User {
  temporary_password?: string;
}

export interface UserProfile {
  id: number;
  full_name: string;
  email: string;
  role: string;
  account_status: string;
  created_at?: string;
}

export interface UserStats {
  quizzes_taken: number;
  correct_answers: number;
  incorrect_answers: number;
  average_score: number;
}

export interface QuizHistory {
  id: number;
  quiz_type: string;
  chapter_id: number | null;
  total_questions: number;
  correct_answers: number;
  score_percentage: number;
  completed_at: string;
}

export interface Subscription {
  plan_name?: string;
  start_date?: string;
  end_date?: string;
  active: boolean;
}

export interface DashboardStats {
  total_users: number;
  active_users: number;
  disabled_users: number;
  total_books: number;
  total_chapters: number;
  total_mcqs: number;
  total_attempts: number;
  average_score: number;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  full_name: string;
  total_attempts: number;
  score_percentage: number;
}
