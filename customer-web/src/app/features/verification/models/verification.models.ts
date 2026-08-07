export type VerificationStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'PENDING_REVIEW';

export interface VerificationStatusResponse {
  mobileVerified: boolean;
  aadhaarVerified: boolean;
  panVerified: boolean;
  faceVerified?: boolean;
  bankVerified: boolean;
  overallProgress: number;
  completedSteps: number;
  totalSteps: number;
  verificationStatus: VerificationStatus;
  kyc?: any;
}

export type VerificationStepKey = 'mobile' | 'aadhaar' | 'pan' | 'face' | 'bank';

export interface VerificationStepCard {
  key: VerificationStepKey;
  icon: string;
  title: string;
  description: string;
  completed: boolean;
  actionLabel: string;
  actionPath: string | null;
}

export interface MobileVerificationStatus {
  mobile: string;
  mobileVerified: boolean;
  hasActiveOtp: boolean;
  expiresAt: string | null;
  resendCount: number;
  maxResend: number;
  attemptCount: number;
  maxAttempts: number;
  cooldownMs: number;
}

export interface SendMobileOtpResponse {
  mobile: string;
  mobileVerified: boolean;
  otpSent: boolean;
  expiresAt?: string;
  resendCount?: number;
  maxResend?: number;
  cooldownMs?: number;
  devOtp?: string;
  message: string;
}

export interface VerifyMobileOtpResponse {
  mobileVerified: boolean;
  mobile: string;
  nextStep: 'AADHAAR_VERIFICATION';
  user: {
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
  };
  message: string;
}

export interface AadhaarVerificationStatus {
  aadhaarVerified: boolean;
  mobileVerified: boolean;
  aadhaarNumberMasked: string | null;
  hasActiveOtp: boolean;
  otpExpiresAt: string | null;
  resendCount: number;
  maxResend: number;
  attemptCount: number;
  maxAttempts: number;
  cooldownMs: number;
  verificationStatus: string;
}

export interface SendAadhaarOtpResponse {
  aadhaarVerified: boolean;
  otpSent: boolean;
  aadhaarNumberMasked: string | null;
  otpExpiresAt?: string;
  resendCount?: number;
  maxResend?: number;
  cooldownMs?: number;
  devOtp?: string;
  message: string;
}

export interface VerifyAadhaarResponse {
  aadhaarVerified: boolean;
  aadhaarNumberMasked: string | null;
  verifiedAt?: string;
  nextStep: 'PAN_VERIFICATION';
  message: string;
}

export interface PanVerificationStatusResponse {
  panVerified: boolean;
  aadhaarVerified: boolean;
  mobileVerified: boolean;
  panNumberMasked: string | null;
  fullName: string | null;
  status: 'PENDING' | 'VERIFIED' | 'FAILED';
  verifiedAt: string | null;
}

export interface VerifyPanResponse {
  status: 'VERIFIED';
  panVerified: boolean;
  panNumberMasked: string | null;
  nextStep: 'BANK_VERIFICATION';
  verifiedAt?: string;
}

export interface BankVerificationStatusResponse {
  bankVerified: boolean;
  panVerified: boolean;
  aadhaarVerified: boolean;
  mobileVerified: boolean;
  accountNumberMasked: string | null;
  bankName: string | null;
  accountType: 'SAVINGS' | 'CURRENT' | null;
  ifscCode: string | null;
  status: 'PENDING' | 'VERIFIED' | 'FAILED';
  verifiedAt: string | null;
  verificationStatus: string;
}

export interface VerifyBankResponse {
  status: 'VERIFIED';
  bankVerified: boolean;
  accountNumberMasked: string | null;
  bankName: string | null;
  verificationStatus: string;
  nextStep: 'VERIFICATION_SUMMARY';
  verifiedAt?: string;
}
