import { Router } from 'express';
import { createRateLimiter } from '../../../common/middleware/rate-limiter';
import { authenticate } from '../../../common/middleware/authenticate';
import { asyncHandler } from '../../../common/utils/async-handler';
import { env } from '../../../config/env';
import { verificationController } from '../controller/verification.controller';

const verificationRateLimiter = createRateLimiter({
  max: env.VERIFICATION_RATE_LIMIT_MAX,
  message: {
    success: false,
    message: 'Too many verification requests. Please try again later.',
    code: 'TOO_MANY_REQUESTS',
  },
});

const kycRateLimiter = createRateLimiter({
  max: env.NODE_ENV === 'production' ? 10 : 50,
  windowMs: 60_000,
  message: {
    success: false,
    message: 'Too many KYC requests. Please wait a minute.',
    code: 'TOO_MANY_REQUESTS',
  },
});

export const verificationRouter = Router();

verificationRouter.use(authenticate);
verificationRouter.use(verificationRateLimiter);

// ── Overall status ──────────────────────────────────────────────────────────
verificationRouter.get('/status', asyncHandler(verificationController.getStatus));

// ── Mobile (already verified via OTP login) ─────────────────────────────────
verificationRouter.get('/mobile/status', asyncHandler(verificationController.getMobileStatus));
verificationRouter.post('/mobile/send-otp', asyncHandler(verificationController.sendMobileOtp));
verificationRouter.post('/mobile/verify-otp', asyncHandler(verificationController.verifyMobileOtp));

// ── Aadhaar via DigiLocker ──────────────────────────────────────────────────
verificationRouter.get('/aadhaar/status', asyncHandler(verificationController.getAadhaarStatus));

// Step 1: generate DigiLocker token & redirect URL
verificationRouter.post(
  '/aadhaar/digilocker/generate',
  kycRateLimiter,
  asyncHandler(verificationController.digilockerGenerate),
);

// Step 2: fetch Aadhaar details after user completes DigiLocker
verificationRouter.post(
  '/aadhaar/digilocker/fetch',
  kycRateLimiter,
  asyncHandler(verificationController.digilockerFetch),
);

// ── PAN & Experian Credit Report ───────────────────────────────────────────
verificationRouter.post(
  '/pan/experian-credit-report',
  kycRateLimiter,
  asyncHandler(verificationController.verifyPanAndCredit),
);

// ── Face Match ─────────────────────────────────────────────────────────────
verificationRouter.post(
  '/face-match',
  kycRateLimiter,
  asyncHandler(verificationController.faceMatch),
);

// Legacy stubs
verificationRouter.post('/aadhaar/send-otp', asyncHandler(verificationController.sendAadhaarOtp));
verificationRouter.post('/aadhaar/verify', asyncHandler(verificationController.verifyAadhaar));
