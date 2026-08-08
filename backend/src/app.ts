import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { corsOrigins, env } from './config/env';
import { jsonDb } from './config/json-db';
import { setupSwagger } from './config/swagger';
import { errorHandler, notFoundHandler } from './common/middleware/error-handler';
import { createRateLimiter } from './common/middleware/rate-limiter';
import { asyncHandler } from './common/utils/async-handler';
import { runEmiReminderPass } from './modules/notifications';
import { authRouter } from './modules/auth';
import { adminRouter } from './modules/admin';
import { rolesRouter } from './modules/rbac';
import { bankVerificationRouter } from './modules/bank-verification';
import { emiApplicationRouter } from './modules/emi-application';
import { panVerificationRouter } from './modules/pan-verification';
import { paymentRouter } from './modules/payment';
import { orderRouter } from './modules/order';
import { loanRouter } from './modules/loan';
import { emiPaymentRouter } from './modules/emi-payment';
import { emiPaymentHistoryRouter, emiStatementRouter } from './modules/emi-history';
import { autopayRouter } from './modules/autopay';
import { notificationRouter } from './modules/notifications';
import { profileRouter } from './modules/profile';
import { checkoutRouter } from './modules/checkout';
import { cartRouter } from './modules/cart';
import { wishlistRouter } from './modules/wishlist';
import { productRouter } from './modules/product';
import { categoryRouter } from './modules/category';
import { reviewsRouter } from './modules/reviews';
import { bannerRouter } from './modules/banner';
import { supportRouter } from './modules/support';
import { verificationRouter } from './modules/verification';
import { reportsRouter } from './modules/reports/reports.routes';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    }),
  );

  const allowedOrigins = new Set(corsOrigins);
  if (env.NODE_ENV !== 'production') {
    for (const origin of [
      'http://localhost:4200',
      'http://127.0.0.1:4200',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ]) {
      allowedOrigins.add(origin);
    }
  }

  app.use(
    cors({
      origin(origin, callback) {
        // Non-browser / same-origin requests (no Origin header)
        if (!origin) {
          callback(null, true);
          return;
        }
        if (allowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }
        console.warn(`[CORS] Rejected origin: ${origin}`);
        callback(null, false);
      },
      credentials: true,
    }),
  );

  // Capture raw body for Razorpay webhook signature verification.
  app.use(
    express.json({
      limit: '1mb',
      verify: (req, _res, buf) => {
        if (req.url?.includes('/payments/webhook')) {
          (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
        }
      },
    }),
  );
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  app.use(
    createRateLimiter({
      max: env.RATE_LIMIT_MAX,
      message: {
        success: false,
        message: 'Too many requests. Please try again later.',
        code: 'TOO_MANY_REQUESTS',
      },
    }),
  );

  setupSwagger(app);

  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      message: 'OK',
      data: {
        service: env.APP_NAME,
        env: env.NODE_ENV,
        timestamp: new Date().toISOString(),
        hydrateMs: jsonDb.lastHydrateMs || null,
      },
    });
  });

  // EMI reminder pass, triggered by Vercel Cron in production. Serverless
  // instances cannot keep a setInterval alive, so production relies on this
  // endpoint instead of startNotificationReminderEngine() (which runs in the
  // long-lived dev/server.ts entry). Guarded by CRON_SECRET when configured.
  app.get(
    `${env.API_PREFIX}/internal/reminders`,
    asyncHandler(async (req, res) => {
      const auth = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
      // Fail closed in production: the endpoint must never be unauthenticated.
      if (env.NODE_ENV === 'production' && !env.CRON_SECRET) {
        res.status(503).json({ success: false, message: 'Cron not configured' });
        return;
      }
      if (env.CRON_SECRET && auth !== env.CRON_SECRET) {
        res.status(403).json({ success: false, message: 'Forbidden' });
        return;
      }
      const result = await runEmiReminderPass();
      res.json({ success: true, data: result });
    }),
  );

  app.use(`${env.API_PREFIX}/auth`, authRouter);
  app.use(`${env.API_PREFIX}/verification`, verificationRouter);
  app.use(`${env.API_PREFIX}/verification/pan`, panVerificationRouter);
  app.use(`${env.API_PREFIX}/verification/bank`, bankVerificationRouter);
  app.use(`${env.API_PREFIX}/emi/applications`, emiApplicationRouter);
  app.use(`${env.API_PREFIX}/payments`, paymentRouter);
  app.use(`${env.API_PREFIX}/orders`, orderRouter);
  app.use(`${env.API_PREFIX}/loans`, loanRouter);
  app.use(`${env.API_PREFIX}/emi/payments`, emiPaymentRouter);
  app.use(`${env.API_PREFIX}/emi/payment-history`, emiPaymentHistoryRouter);
  app.use(`${env.API_PREFIX}/emi/statement`, emiStatementRouter);
  app.use(`${env.API_PREFIX}/autopay`, autopayRouter);
  app.use(`${env.API_PREFIX}/notifications`, notificationRouter);
  app.use(`${env.API_PREFIX}/profile`, profileRouter);
  app.use(`${env.API_PREFIX}/checkout`, checkoutRouter);
  app.use(`${env.API_PREFIX}/cart`, cartRouter);
  app.use(`${env.API_PREFIX}/wishlist`, wishlistRouter);
  app.use(`${env.API_PREFIX}/products`, productRouter);
  app.use(`${env.API_PREFIX}/categories`, categoryRouter);
  app.use(`${env.API_PREFIX}/reviews`, reviewsRouter);
  app.use(`${env.API_PREFIX}/banners`, bannerRouter);
  app.use(`${env.API_PREFIX}/support`, supportRouter);
  app.use(`${env.API_PREFIX}/admin`, adminRouter);
  app.use(`${env.API_PREFIX}/admin/roles`, rolesRouter);
  app.use(`${env.API_PREFIX}/reports`, reportsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
