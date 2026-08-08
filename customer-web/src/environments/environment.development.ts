/**
 * Development environment configuration for LoanEx.
 * Used by the development build via fileReplacements in angular.json.
 */
export const environment = {
  production: false,
  appName: 'LoanEx Dev',
  // Empty = same-origin /api → proxied to deployed API (avoids CORS).
  apiBaseUrl: '',
  enableDebug: true,
};
