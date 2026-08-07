import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const URL = process.env.SUPABASE_URL ?? 'https://vbzulguxiyvpozpjfxpz.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const supabase = createClient(URL, KEY);

const TEST_MOBILE = '9876543210';
const TEST_EMAIL = 'flowtest@loanex.in';
const TEST_NAME = 'Flow Test User';

async function main() {
  const existing = await supabase.from('users').select('id').eq('phone', TEST_MOBILE).maybeSingle();
  if (existing.data) {
    console.log(JSON.stringify({ seeded: false, userId: existing.data.id, reason: 'EXISTS' }));
    return;
  }

  const userId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { error: ue } = await supabase.from('users').insert({
    id: userId,
    phone: TEST_MOBILE,
    email: TEST_EMAIL,
    role: 'customer',
    created_at: now,
    updated_at: now,
  });
  if (ue) throw new Error(`users: ${ue.message}`);

  const { error: pe } = await supabase.from('profiles').insert({
    id: userId,
    mobile_number: TEST_MOBILE,
    fullName: TEST_NAME,
    email: TEST_EMAIL,
    kyc_status: 'Approved',
    createdAt: now,
    updatedAt: now,
  });
  if (pe) throw new Error(`profiles: ${pe.message}`);

  const { error: cve } = await supabase.from('customerVerification').insert({
    id: crypto.randomUUID(),
    userId,
    mobileVerified: true,
    aadhaarVerified: true,
    panVerified: true,
    bankVerified: false,
    verificationStatus: 'COMPLETED',
    cibilScore: 700,
    createdAt: now,
    updatedAt: now,
  });
  if (cve) throw new Error(`customerVerification: ${cve.message}`);

  const { error: ae } = await supabase.from('aadhaarVerification').insert({
    id: crypto.randomUUID(),
    userId,
    aadhaarNumberMasked: 'XXXXXXXX1122',
    verificationStatus: 'VERIFIED',
    createdAt: now,
    updatedAt: now,
  });
  if (ae) throw new Error(`aadhaarVerification: ${ae.message}`);

  const { error: pne } = await supabase.from('panVerification').insert({
    id: crypto.randomUUID(),
    userId,
    panNumberMasked: 'XXXXXXXX99F',
    fullName: TEST_NAME,
    status: 'VERIFIED',
    createdAt: now,
  });
  if (pne) throw new Error(`panVerification: ${pne.message}`);

  const { error: mve } = await supabase.from('mobileVerification').insert({
    id: crypto.randomUUID(),
    userId,
    mobile: TEST_MOBILE,
    isVerified: true,
    purpose: 'SIGNUP',
    createdAt: now,
    updatedAt: now,
  });
  if (mve) throw new Error(`mobileVerification: ${mve.message}`);

  const { error: kye } = await supabase.from('customer_kyc').insert({
    id: crypto.randomUUID(),
    userId,
    fullName: TEST_NAME,
    aadharVerified: true,
    pan_verified: true,
    cibil_score: 700,
    createdAt: now,
    updatedAt: now,
  });
  if (kye) throw new Error(`customer_kyc: ${kye.message}`);

  console.log(JSON.stringify({ seeded: true, userId, mobile: TEST_MOBILE }));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
