import api, { STORAGE_KEYS, clearSession, sessionGet, sessionSet, setRemembered } from "./api";
import type {
  AuthUser,
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponse,
  PasswordChangeRequest,
  ResetPasswordRequest,
} from "@/types/auth";

function persist(data: LoginResponse) {
  sessionSet(STORAGE_KEYS.accessToken, data.access_token);
  if (data.refresh_token) sessionSet(STORAGE_KEYS.refreshToken, data.refresh_token);
  sessionSet(STORAGE_KEYS.userId, String(data.user_id));
  sessionSet(STORAGE_KEYS.fullName, data.full_name);
  sessionSet(STORAGE_KEYS.role, data.role);
}

export const authService = {
  async login(payload: LoginRequest, remember = true): Promise<LoginResponse> {
    const { email, password } = payload;
    setRemembered(remember);
    const { data } = await api.post<LoginResponse>("/auth/login", { email, password });
    persist(data);
    return data;
  },

  async register(payload: {
    full_name: string;
    email: string;
    password: string;
    degree?: string;
    academic_year?: string;
    plan_name?: string;
    file?: File | null;
  }): Promise<{ success: boolean; message: string; user_id?: number }> {
    const formData = new FormData();
    formData.append("full_name", payload.full_name);
    formData.append("email", payload.email);
    formData.append("password", payload.password);
    if (payload.degree) formData.append("degree", payload.degree);
    if (payload.academic_year) formData.append("academic_year", payload.academic_year);
    if (payload.plan_name) formData.append("plan_name", payload.plan_name);
    if (payload.file) formData.append("file", payload.file);

    const { data } = await api.post<{ success: boolean; message: string; user_id?: number }>(
      "/auth/register",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return data;
  },

  async refresh(): Promise<LoginResponse | null> {
    const refresh_token = sessionGet(STORAGE_KEYS.refreshToken);
    if (!refresh_token) return null;
    const { data } = await api.post<LoginResponse>("/auth/refresh", { refresh_token });
    persist(data);
    return data;
  },

  async logout(): Promise<void> {
    const refresh_token = sessionGet(STORAGE_KEYS.refreshToken);
    try {
      if (refresh_token) await api.post("/auth/logout", { refresh_token });
    } finally {
      clearSession();
    }
  },

  async changePassword(payload: PasswordChangeRequest): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>("/auth/password-change", payload);
    if (data?.access_token) persist(data);
    return data;
  },

  // BUG (route mismatch — 404 on every "forgot password" attempt): this used
  // to POST to /auth/forgot-password and /auth/reset-password. The backend
  // (app/routes/auth.py) has never had those routes — it exposes
  // /auth/password-reset/request and /auth/password-reset/confirm. Every
  // submission of the "Forgot password" form was hitting FastAPI's default
  // 404 handler. Backend's `PasswordResetRequest` takes `{ email }` (matches
  // `ForgotPasswordRequest`) and `PasswordResetConfirm` takes
  // `{ token, new_password }` (matches `ResetPasswordRequest`), so only the
  // URLs needed to change here — no shape mismatch.
  /** POST /auth/password-reset/request — sends a reset link/token to the user's email. */
  async forgotPassword(payload: ForgotPasswordRequest): Promise<void> {
    await api.post("/auth/password-reset/request", payload);
  },

  /** POST /auth/password-reset/confirm — completes the reset with the emailed token. */
  async resetPassword(payload: ResetPasswordRequest): Promise<void> {
    await api.post("/auth/password-reset/confirm", payload);
  },

  getCurrentUser(): AuthUser | null {
    if (typeof window === "undefined") return null;
    const access_token = sessionGet(STORAGE_KEYS.accessToken);
    const user_id = sessionGet(STORAGE_KEYS.userId);
    const full_name = sessionGet(STORAGE_KEYS.fullName);
    const role = sessionGet(STORAGE_KEYS.role);
    if (!access_token || !user_id || !role) return null;
    return {
      access_token,
      refresh_token: sessionGet(STORAGE_KEYS.refreshToken) ?? undefined,
      user_id: Number(user_id),
      full_name: full_name ?? "",
      role: role as "student" | "admin",
    };
  },
};
