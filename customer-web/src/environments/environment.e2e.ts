/**
 * Temporary e2e environment for the isolated DIRECT-payment verification
 * (points at the :4001 test backend with PAYMENT_DEV_BYPASS enabled).
 * REMOVE AFTER TESTING — not part of the app.
 */
export const environment = {
  production: false,
  appName: 'LoanEx E2E',
  apiBaseUrl: 'http://localhost:4000',
  enableDebug: true,
};
