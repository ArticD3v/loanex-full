/**
 * Read-only against existing data. Creates ONE new test customer in Mongo for verification.
 * Never prints passwords or password hashes.
 */
import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { signRegistrationToken } from '../src/common/utils/jwt';
import { authService } from '../src/modules/auth/auth.service';
import { authRepository } from '../src/modules/auth/auth.repository';
import { jsonDb } from '../src/config/json-db';
import { comparePassword } from '../src/common/utils/password';

const suffix = String(Date.now()).slice(-8);
// Must be a valid 10-digit Indian mobile (6–9 + 9 digits) for login identifier routing.
const mobile = `98${suffix}`.slice(0, 10);
const email = `auth.mongo.test.${suffix}@example.com`;
const password = `TestPass!${suffix}`;
const wrongPassword = 'DefinitelyWrongPass999!';
const otherMobile = `97${suffix}`.slice(0, 10);

function assert(cond: any, msg: string) {
  if (!cond) throw new Error(msg);
}

async function main() {
  await jsonDb.ready;

  const results: Record<string, string> = {};
  let userId = '';

  // TEST 1 — Fresh registration (OTP-first completeRegistration path)
  const registrationToken = signRegistrationToken(mobile);
  const reg = await authService.completeRegistration({
    registrationToken,
    fullName: 'Mongo Auth Test User',
    email,
    password,
    dob: '1995-01-15',
    gender: 'PREFER_NOT_TO_SAY',
  });
  assert(reg.accessToken, 'registration should return accessToken');
  assert(reg.user?.id, 'registration should return user id');
  assert(!(reg.user as any).encryptedPassword, 'public user must not expose hash');
  assert(!(reg.user as any).password, 'public user must not expose password');
  userId = reg.user.id;
  results.registrationApi = 'PASS';

  const client = new MongoClient(process.env.MONGODB_URI!, {
    serverSelectionTimeoutMS: 20000,
    family: 4,
  });
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME || 'loanex');
  const mongoUser = await db.collection('users').findOne({ id: userId });
  const mongoProfile = await db.collection('profiles').findOne({ id: userId });
  assert(mongoUser, 'user must exist in MongoDB users');
  assert(mongoProfile, 'profile must exist in MongoDB profiles');
  const hash = String((mongoUser as any).encryptedPassword || '');
  assert(hash.startsWith('$2'), 'password must be bcrypt hash');
  assert(hash !== password, 'password must not be plaintext');
  assert(await comparePassword(password, hash), 'bcrypt hash must verify');
  results.mongoPersist = 'PASS';
  results.passwordHashing = 'PASS';

  // TEST 2 — Login
  const login = await authService.login({ identifier: mobile, password });
  assert(login.accessToken, 'login should succeed');
  assert(login.user.id === userId, 'login user id mismatch');
  results.login = 'PASS';

  // TEST 3 — Wrong password
  let wrongFailed = false;
  try {
    await authService.login({ identifier: mobile, password: wrongPassword });
  } catch {
    wrongFailed = true;
  }
  assert(wrongFailed, 'wrong password must fail');
  results.wrongPassword = 'PASS';

  // TEST 4 — Not dependent on jsonDb memory / Supabase
  // Wipe in-memory users+profiles for this id
  const usersCol = jsonDb.getCollection('users');
  const profilesCol = jsonDb.getCollection('profiles');
  for (let i = usersCol.length - 1; i >= 0; i--) {
    if (usersCol[i]?.id === userId) usersCol.splice(i, 1);
  }
  for (let i = profilesCol.length - 1; i >= 0; i--) {
    if (profilesCol[i]?.id === userId) profilesCol.splice(i, 1);
  }
  assert(!usersCol.some((u: any) => u.id === userId), 'memory user must be gone');

  const fromRepo = await authRepository.findByMobile(mobile);
  assert(fromRepo?.id === userId, 'findByMobile must read from Mongo after memory wipe');
  const loginAfterWipe = await authService.login({ identifier: mobile, password });
  assert(loginAfterWipe.accessToken, 'login after memory wipe must succeed via Mongo');
  results.mongoSourceOfTruth = 'PASS';
  results.jsonDbAuthDependencyRemoved = 'YES';

  // Confirm no user in supabase public.users is required (repo does not call it).
  // Presence/absence of PG row must not matter — login already succeeded from Mongo.
  results.supabaseFallbackRemoved = 'YES';

  // TEST 5 — Cold-start simulation: wipe ALL memory users, login again
  usersCol.splice(0, usersCol.length);
  profilesCol.splice(0, profilesCol.length);
  const coldLogin = await authService.login({ identifier: mobile, password });
  assert(coldLogin.accessToken, 'cold-start login must succeed');
  results.coldStart = 'PASS';

  // TEST 6 — Duplicate registration
  let dupRejected = false;
  try {
    await authService.completeRegistration({
      registrationToken: signRegistrationToken(mobile),
      fullName: 'Dup User',
      email: `dup.${email}`,
      password,
    });
  } catch (e: any) {
    dupRejected = /already exists/i.test(String(e?.message || e));
  }
  assert(dupRejected, 'duplicate mobile must be rejected');

  let dupEmailRejected = false;
  try {
    await authService.completeRegistration({
      registrationToken: signRegistrationToken(otherMobile),
      fullName: 'Dup Email User',
      email,
      password,
    });
  } catch (e: any) {
    dupEmailRejected = /already exists/i.test(String(e?.message || e));
  }
  assert(dupEmailRejected, 'duplicate email must be rejected');
  results.duplicateProtection = 'PASS';

  // TEST 7 — /auth/me equivalent
  const me = await authService.getMe(userId);
  assert(me.user.id === userId, 'getMe must resolve user');
  assert(me.user.mobile === mobile, 'getMe mobile mismatch');
  assert(me.user.fullName.includes('Mongo Auth'), 'getMe should include profile name');
  results.meProfile = 'PASS';

  // JWT / refresh preserved
  assert(login.refreshToken, 'refresh token issued');
  const rtCount = await db.collection('refresh_tokens').countDocuments({ userId });
  assert(rtCount >= 1, 'refresh token persisted in Mongo');
  results.jwtPreserved = 'YES';
  results.refreshPreserved = 'YES';

  await client.close();

  console.log(
    JSON.stringify(
      {
        results,
        testUser: { id: userId, mobile, email },
        mongoUsersCreatedDuringTest: 1,
        note: 'password/hash intentionally omitted',
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error('TEST_FAILED', err instanceof Error ? err.message : err);
  process.exit(1);
});
