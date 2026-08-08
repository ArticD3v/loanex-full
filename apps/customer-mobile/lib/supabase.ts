/**
 * @deprecated Direct Supabase client removed after MongoDB migration.
 * All customer-mobile data access must go through `lib/apiClient` → Backend API → MongoDB.
 * PostgreSQL/Supabase remains intact as backup on the server only.
 */
export const supabase = null as never;

if (__DEV__) {
  console.warn(
    '[LoanEx] Direct Supabase client disabled. Use Backend API (`lib/apiClient`).',
  );
}
