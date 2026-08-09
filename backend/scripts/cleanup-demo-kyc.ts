/**
 * Cleanup: remove the demo customer's KYC records so they can redo KYC with
 * real verification (DigiLocker Aadhaar → PAN/Experian → CIBIL).
 *
 * Deletes ONLY these rows for the given phone number, preserving all other data:
 *   - customer_kyc
 *   - digilocker_reports
 *   - customerVerification / customer_verification (verification mirrors)
 *
 * Usage: npx tsx scripts/cleanup-demo-kyc.ts [phone]
 */
import { jsonDb } from '../src/config/json-db';
import { authRepository } from '../src/modules/auth/auth.repository';

async function main() {
  const phone = (process.argv[2] ?? '9462557060').replace(/\D/g, '');
  if (!/^[6-9]\d{9}$/.test(phone)) {
    console.error('Invalid phone number:', phone);
    process.exit(1);
  }

  await jsonDb.refreshCollection('users');
  const user =
    jsonDb.findOne('users', { phone }) ??
    (await authRepository.findByMobile(phone)) ??
    null;

  if (!user?.id) {
    console.error(`No user found for phone ${phone}`);
    process.exit(1);
  }
  const userId = user.id;
  console.log(`User: ${userId} (${user.fullName ?? ''}) ${phone}`);

  const results: Record<string, number> = {};
  for (const [collection, filter] of [
    ['customer_kyc', { userId }],
    ['digilocker_reports', { userId }],
    ['customerVerification', { userId }],
    ['customer_verification', { userId }],
    ['verifications', { userId }],
  ] as const) {
    try {
      await jsonDb.refreshCollection(collection as string);
      const before = jsonDb.findMany(collection as string, filter as any).length;
      if (before > 0) {
        jsonDb.deleteMany(collection as string, filter as any);
        await jsonDb.refreshCollection(collection as string);
      }
      results[collection as string] = before;
      console.log(`  ${collection}: removed ${before}`);
    } catch (err: any) {
      console.log(`  ${collection}: skipped (${err?.message ?? err})`);
    }
  }

  console.log('Done. KYC data cleared — user can redo KYC with real verification.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
