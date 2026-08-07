export interface AuthUser {
  id: string;
  uuid: string;
  fullName: string;
  mobile: string;
  email: string;
  isMobileVerified: boolean;
  isEmailVerified: boolean;
  status: 'PENDING' | 'ACTIVE' | 'BLOCKED';
  createdAt: string;
  updatedAt: string;
}

export type OtpPurpose = 'REGISTER' | 'LOGIN' | 'FORGOT_PASSWORD' | 'RESET_PASSWORD';

export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  message: string;
  code: string;
  details?: Array<{ path: string; message: string }> | unknown;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
}

export interface RegisterResponse {
  user: AuthUser;
  otpSent: boolean;
  devOtp?: string;
  message: string;
}

export interface LoginSuccessResponse extends AuthTokens {
  requiresOtp: false;
  user: AuthUser;
  message: string;
}

export interface LoginOtpRequiredResponse {
  requiresOtp: true;
  mobile: string;
  devOtp?: string;
  message: string;
}

export type LoginResponse = LoginSuccessResponse | LoginOtpRequiredResponse;

export interface SendOtpResponse {
  otpSent: boolean;
  mobile: string;
  purpose: OtpPurpose;
  expiresInMinutes: number;
  resendAvailableIn?: number;
  maxResend?: number;
  resendCount?: number;
  otpChallenge?: string;
  devOtp?: string;
  message: string;
}

export interface VerifyOtpSuccessResponse extends Partial<AuthTokens> {
  verified: boolean;
  activated: boolean;
  requiresProfile?: boolean;
  registrationToken?: string;
  user?: AuthUser;
  mobile?: string;
  purpose?: OtpPurpose;
  message: string;
}

export interface CompleteRegistrationResponse extends AuthTokens {
  requiresOtp: false;
  user: AuthUser;
  message: string;
}

export interface ForgotPasswordResponse {
  otpSent: boolean;
  mobile: string;
  devOtp?: string;
  message: string;
}

export interface ResetPasswordResponse {
  reset: boolean;
  message: string;
}

export interface RefreshTokenResponse extends AuthTokens {
  user: AuthUser;
  message: string;
}
