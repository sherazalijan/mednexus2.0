export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user_id: number;
  full_name: string;
  role: "student" | "admin";
  new_device?: boolean;
}

export interface AuthUser {
  user_id: number;
  full_name: string;
  role: "student" | "admin";
  access_token: string;
  refresh_token?: string | undefined;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

