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

  const product = await prisma.product.findUnique({ where: { id: 'hp-pavilion-15' } });
  if (!product) {
    console.log(JSON.stringify({ ok: false, reason: 'NO_PRODUCT' }));
    return;
  }

  // Ensure profile + address for happy path
  await prisma.userProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobile,
      dob: new Date('1994-08-12'),
      gender: 'MALE',
    },
    update: {},
  });
  const address = await prisma.userAddress.findFirst({
    where: { userId: user.id, addressType: 'SHIPPING' },
  });
  if (!address) {
    await prisma.userAddress.create({
      data: {
        userId: user.id,
        addressLine1: '101',
        addressLine2: 'Residency Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560025',
        country: 'India',
        isDefault: true,
        addressType: 'SHIPPING',
      },
    });
  }

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

  const unauth = await fetch(`${base}/checkout/hp-pavilion-15`);
  const summary = await fetch(`${base}/checkout/hp-pavilion-15?quantity=1`, { headers });
  const emi = await fetch(`${base}/checkout`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      productId: 'hp-pavilion-15',
      quantity: 1,
      purchaseType: 'EMI',
    }),
  });
  const emiBody = (await emi.json()) as {
    data?: { nextStep?: string; redirectPath?: string; session?: { id?: string } };
  };

  const direct = await fetch(`${base}/checkout`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      productId: 'hp-pavilion-15',
      quantity: 1,
      purchaseType: 'DIRECT',
    }),
  });
  const directBody = (await direct.json()) as {
    data?: { nextStep?: string; redirectPath?: string; session?: { id?: string } };
  };

  const sessionId = directBody?.data?.session?.id ?? '';
  const sessionGet = sessionId
    ? await fetch(`${base}/checkout/session/${sessionId}`, { headers })
    : { status: 0 };

  // Missing profile case
  await prisma.userProfile.deleteMany({ where: { userId: user.id } });
  const missingProfile = await fetch(`${base}/checkout`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      productId: 'hp-pavilion-15',
      quantity: 1,
      purchaseType: 'DIRECT',
    }),
  });

  // Restore profile for address test
  await prisma.userProfile.create({
    data: {
      userId: user.id,
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobile,
      dob: new Date('1994-08-12'),
      gender: 'MALE',
    },
  });
  await prisma.userAddress.deleteMany({ where: { userId: user.id } });
  const missingAddress = await fetch(`${base}/checkout`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      productId: 'hp-pavilion-15',
      quantity: 1,
      purchaseType: 'DIRECT',
    }),
  });

  // Out of stock
  await prisma.userAddress.create({
    data: {
      userId: user.id,
      addressLine1: '101',
      addressLine2: 'Residency Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560025',
      country: 'India',
      isDefault: true,
      addressType: 'SHIPPING',
    },
  });
  await prisma.product.update({
    where: { id: 'hp-pavilion-15' },
    data: { stockQuantity: 0, inStock: false },
  });
  const outOfStock = await fetch(`${base}/checkout`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      productId: 'hp-pavilion-15',
      quantity: 1,
      purchaseType: 'DIRECT',
    }),
  });
  await prisma.product.update({
    where: { id: 'hp-pavilion-15' },
    data: { stockQuantity: 25, inStock: true },
  });

  console.log(
    JSON.stringify(
      {
        unauthStatus: unauth.status,
        summaryHttp: summary.status,
        emiHttp: emi.status,
        emiNext: emiBody?.data?.nextStep ?? null,
        emiRedirect: emiBody?.data?.redirectPath ?? null,
        directHttp: direct.status,
        directNext: directBody?.data?.nextStep ?? null,
        directRedirect: directBody?.data?.redirectPath ?? null,
        sessionHttp: 'status' in sessionGet ? sessionGet.status : 0,
        missingProfileHttp: missingProfile.status,
        missingAddressHttp: missingAddress.status,
        outOfStockHttp: outOfStock.status,
        ok:
          unauth.status === 401 &&
          summary.status === 200 &&
          emi.status === 200 &&
          emiBody?.data?.nextStep === 'EMI_VERIFICATION' &&
          emiBody?.data?.redirectPath === '/verification' &&
          direct.status === 200 &&
          directBody?.data?.nextStep === 'DIRECT_PAYMENT' &&
          directBody?.data?.redirectPath === '/checkout/payment' &&
          ('status' in sessionGet ? sessionGet.status === 200 : false) &&
          missingProfile.status === 400 &&
          missingAddress.status === 400 &&
          outOfStock.status === 400,
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
