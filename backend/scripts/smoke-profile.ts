import { PrismaClient } from '@prisma/client';
import { signAccessToken } from '../src/common/utils/jwt';

const prisma = new PrismaClient();
const base = 'http://localhost:4000/api/v1';

async function main() {
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { id: true, uuid: true, email: true, mobile: true, fullName: true },
  });
  if (!user) {
    console.log(JSON.stringify({ ok: false, reason: 'NO_USER' }));
    return;
  }

  await prisma.userAddress.deleteMany({ where: { userId: user.id } });
  await prisma.userProfile.deleteMany({ where: { userId: user.id } });

  const token = signAccessToken({
    sub: user.id,
    uuid: user.uuid,
    email: user.email,
    mobile: user.mobile,
  });
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const payload = {
    fullName: user.fullName || 'Smoke User',
    email: user.email,
    dob: '1994-08-12',
    gender: 'MALE',
    billingSameAsShipping: true,
    address: {
      addressLine1: '101',
      addressLine2: 'Residency Road',
      landmark: 'Opposite Park',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560025',
      country: 'India',
    },
  };

  const unauth = await fetch(`${base}/profile`);
  const getEmpty = await fetch(`${base}/profile`, { headers });
  const invalid = await fetch(`${base}/profile`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...payload, address: { ...payload.address, pincode: '12' } }),
  });
  const created = await fetch(`${base}/profile`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const createdBody = (await created.json()) as {
    data?: { hasProfile?: boolean; address?: { pincode?: string } };
  };
  const duplicate = await fetch(`${base}/profile`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const updated = await fetch(`${base}/profile`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      ...payload,
      address: { ...payload.address, addressLine1: '202', pincode: '560001' },
    }),
  });
  const updatedBody = (await updated.json()) as {
    data?: { address?: { addressLine1?: string; pincode?: string } };
  };
  const getAfter = await fetch(`${base}/profile`, { headers });

  console.log(
    JSON.stringify(
      {
        unauthStatus: unauth.status,
        getEmptyHttp: getEmpty.status,
        invalidHttp: invalid.status,
        createHttp: created.status,
        hasProfile: createdBody?.data?.hasProfile ?? null,
        duplicateHttp: duplicate.status,
        updateHttp: updated.status,
        updatedLine1: updatedBody?.data?.address?.addressLine1 ?? null,
        updatedPincode: updatedBody?.data?.address?.pincode ?? null,
        getAfterHttp: getAfter.status,
        ok:
          unauth.status === 401 &&
          getEmpty.status === 200 &&
          invalid.status === 400 &&
          created.status === 200 &&
          createdBody?.data?.hasProfile === true &&
          duplicate.status === 409 &&
          updated.status === 200 &&
          updatedBody?.data?.address?.addressLine1 === '202' &&
          updatedBody?.data?.address?.pincode === '560001' &&
          getAfter.status === 200,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
