import axios from "axios";

export const API_BASE_URL =
  (import.meta.env["VITE_API_URL"] as string | undefined) || "http://127.0.0.1:8000";

export const STORAGE_KEYS = {
  accessToken: "access_token",
  refreshToken: "refresh_token",
  userId: "user_id",
  fullName: "full_name",
  role: "role",
  remember: "remember_me",
} as const;

/** Session lives in localStorage when "Remember me" is on, sessionStorage otherwise. */
export function isRemembered(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_KEYS.remember) !== "0";
}

export function setRemembered(remember: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.remember, remember ? "1" : "0");
}

function store(): Storage | null {
  if (typeof window === "undefined") return null;
  return isRemembered() ? localStorage : sessionStorage;
}

export function sessionGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  return store()?.getItem(key) ?? null;
}

export function sessionSet(key: string, value: string) {
  store()?.setItem(key, value);
}

export function clearSession() {
  if (typeof window === "undefined") return;
  Object.values(STORAGE_KEYS).forEach((key) => {
    if (key === STORAGE_KEYS.remember) return;
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

// BUG (login/chapters/quiz "hangs forever"): axios had no timeout at all.
// If a response never comes back — a slow cold-start, a dropped connection,
// a proxy that swallows the request — the caller's `await api.post(...)`
// (or `.get(...)`) just never resolves and never rejects. Every "loading"
// spinner in this app (`login.tsx`'s `loading` state, every page's
// `query.isLoading`) is driven directly off that promise, so a hung request
// means a permanently-spinning UI with no error, no retry, nothing. A
// generous but finite timeout turns that into an actual error the UI can
// show and let the user retry, instead of a silent infinite hang.
const REQUEST_TIMEOUT_MS = 20_000;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
});

// Request interceptor: inject JWT
api.interceptors.request.use((config) => {
  const token = sessionGet(STORAGE_KEYS.accessToken);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---------------------------------------------------------------------------
// Response interceptor: silent refresh on 401, hard logout only if the
// refresh itself fails.
//
// BUG (random "sign-out" mid-session / "stay logged in" not working):
// access tokens are 15 minutes (app/core/security.py). `authService.refresh()`
// existed but was never called by anything — the old interceptor treated
// every 401 as "session is dead", wiped storage and hard-redirected to
// /login. In practice that means anyone whose access token happens to
// expire mid-click gets logged out even though they have a perfectly valid
// 30-day refresh token sitting right there. This interceptor now uses that
// refresh token transparently: on a 401, it exchanges the refresh token for
// a new pair exactly once and retries the original request. Only if there's
// no refresh token, or the refresh call itself 401s (refresh token expired
// or revoked), does it fall back to the old hard-logout behavior.
// ---------------------------------------------------------------------------
let refreshPromise: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const refresh_token = sessionGet(STORAGE_KEYS.refreshToken);
  if (!refresh_token) return null;
  try {
    const { data } = await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      { refresh_token },
      { timeout: REQUEST_TIMEOUT_MS },
    );
    sessionSet(STORAGE_KEYS.accessToken, data.access_token);
    sessionSet(STORAGE_KEYS.refreshToken, data.refresh_token);
    sessionSet(STORAGE_KEYS.userId, String(data.user_id));
    sessionSet(STORAGE_KEYS.fullName, data.full_name);
    sessionSet(STORAGE_KEYS.role, data.role);
    return data.access_token as string;
  } catch {
    return null;
  }
}

function hardLogoutToLogin() {
  clearSession();
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error?.config as (typeof error.config & { _retried?: boolean }) | undefined;
    const status = error?.response?.status;

    if (status === 401 && original && !original._retried && typeof window !== "undefined") {
      original._retried = true;
      // Coalesce concurrent 401s (several queries firing at once on page
      // load) into a single /auth/refresh call instead of one per request.
      refreshPromise ??= performRefresh().finally(() => {
        refreshPromise = null;
      });
      const newAccessToken = await refreshPromise;
      if (newAccessToken) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newAccessToken}`;
        return api.request(original);
      }
      hardLogoutToLogin();
    }

    return Promise.reject(error);
  },
);

/** Normalizes FastAPI error payloads (string | {detail} | validation array) to a message. */
export function apiErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED") {
      return "The MedNexus API took too long to respond. Please try again.";
    }
    if (!error.response) {
      return `Cannot reach the MedNexus API at ${API_BASE_URL}. Make sure the backend is running.`;
    }
    const detail = (error.response.data as { detail?: unknown } | undefined)?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      const first = detail[0] as { msg?: string } | undefined;
      if (first?.msg) return first.msg;
    }
    return error.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export default api;
