/**
 * Pure helper checks (no DB writes).
 * Run: npx tsx scripts/validate-address-helpers.ts
 */
import {
  addressBelongsToUser,
  resolveAddressType,
} from '../src/modules/profile/repository/profile.repository';
import { normalizeAddressRow } from '../src/config/mirror-sanitize';

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

const userId = '11111111-1111-4111-8111-111111111111';

assert(
  addressBelongsToUser({ profileId: userId }, userId),
  'camelCase profileId ownership failed',
);
assert(
  addressBelongsToUser({ profile_id: userId }, userId),
  'snake_case profile_id ownership failed',
);
assert(
  addressBelongsToUser({ user_id: userId }, userId),
  'snake_case user_id ownership failed',
);
assert(
  !addressBelongsToUser({ profile_id: '00000000-0000-4000-8000-000000000000' }, userId),
  'ownership false-positive',
);

assert(resolveAddressType('SHIPPING') === 'SHIPPING', 'SHIPPING type');
assert(resolveAddressType('Home') === 'SHIPPING', 'Home legacy label');
assert(resolveAddressType({ label: 'Home' }) === 'SHIPPING', 'Home row');
assert(resolveAddressType('BILLING') === 'BILLING', 'BILLING type');

const normalized = normalizeAddressRow({
  id: '22222222-2222-4222-8222-222222222222',
  profile_id: userId,
  user_id: userId,
  house_number: '12',
  street: 'Lane',
  is_default: true,
  label: 'Home',
  created_at: '2026-08-01T00:00:00.000Z',
});
assert(normalized.profileId === userId, 'normalize profileId');
assert(normalized.userId === userId, 'normalize userId');
assert(normalized.is_default === true, 'normalize is_default');
assert(addressBelongsToUser(normalized, userId), 'normalized ownership');

console.log('PASS address ownership/type/normalize helpers');
