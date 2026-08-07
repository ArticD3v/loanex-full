import { EmiApplicationStatus, PrismaClient } from '@prisma/client';
import { signAccessToken } from '../src/common/utils/jwt';

const p = new PrismaClient();
const base = 'http://localhost:4000/api/v1/payments';

async function main() {
  const app = await p.emiApplication.findFirst({ orderBy: { createdAt: 'desc' } });
  if (!app) {
    console.log(JSON.stringify({ ok: false, reason: 'NO_APPLICATION' }));
    return;
  }

  // Clean previous payment/order for retest
  await p.paymentTransaction.deleteMany({ where: { applicationId: app.id } });
  await p.order.deleteMany({ where: { applicationId: app.id } });

  await p.emiApplication.update({
    where: { id: app.id },
    data: {
      status: EmiApplicationStatus.OFFER_ACCEPTED,
      approvedAmount: app.approvedAmount ?? app.requestedAmount,
      approvedDownPayment: app.approvedDownPayment ?? app.requestedDownPayment,
      approvedTenure: app.approvedTenure ?? app.requestedTenure,
      monthlyEmi: app.monthlyEmi ?? app.estimatedMonthlyEmi,
      processingFee: app.processingFee ?? 499,
      offerAcceptedAt: new Date(),
      offerDeclinedAt: null,
    },
  });

  const user = await p.user.findUniqueOrThrow({
    where: { id: app.userId },
    select: { id: true, uuid: true, email: true, mobile: true },
  });
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

  const unauth = await fetch(`${base}/create-order`, { method: 'POST', body: '{}' });
  const context = await fetch(`${base}/down-payment`, { headers });
  const contextBody = await context.json();

  const created = await fetch(`${base}/create-order`, {
    method: 'POST',
    headers,
    body: '{}',
  });
  const createdBody = await created.json();
  const orderId = createdBody?.data?.razorpayOrderId as string;

  const badVerify = await fetch(`${base}/verify`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      razorpayOrderId: orderId,
      razorpayPaymentId: 'pay_bad',
      razorpaySignature: 'invalid',
    }),
  });
  const badVerifyBody = await badVerify.json();

  // Recreate order after failed verify
  await p.paymentTransaction.deleteMany({ where: { applicationId: app.id } });
  await p.emiApplication.update({
    where: { id: app.id },
    data: { status: EmiApplicationStatus.OFFER_ACCEPTED },
  });

  const created2 = await fetch(`${base}/create-order`, {
    method: 'POST',
    headers,
    body: '{}',
  });
  const created2Body = await created2.json();
  const orderId2 = created2Body?.data?.razorpayOrderId as string;

  const signed = await fetch(`${base}/dev-bypass-signature`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ razorpayOrderId: orderId2 }),
  });
  const signedBody = await signed.json();

  const verify = await fetch(`${base}/verify`, {
    method: 'POST',
    headers,
    body: JSON.stringify(signedBody.data),
  });
  const verifyBody = await verify.json();

  const byApp = await fetch(`${base}/${app.id}`, { headers });
  const confirmation = await fetch(
    `${base}/order-confirmation?orderNumber=${encodeURIComponent(verifyBody?.data?.orderNumber ?? '')}`,
    { headers },
  );

  console.log(
    JSON.stringify(
      {
        unauthStatus: unauth.status,
        contextHttp: context.status,
        totalPayable: contextBody?.data?.paymentSummary?.totalPayableToday ?? null,
        createHttp: created.status,
        signatureFailedHttp: badVerify.status,
        signatureFailedCode: badVerifyBody?.details?.code ?? null,
        verifyHttp: verify.status,
        paymentStatus: verifyBody?.data?.paymentStatus ?? null,
        orderNumber: verifyBody?.data?.orderNumber ?? null,
        byAppHttp: byApp.status,
        confirmationHttp: confirmation.status,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await p.$disconnect();
  });
