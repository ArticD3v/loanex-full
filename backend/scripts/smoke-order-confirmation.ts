import { PrismaClient } from '@prisma/client';
import { signAccessToken } from '../src/common/utils/jwt';
import fs from 'node:fs';

const p = new PrismaClient();
const base = 'http://localhost:4000/api/v1';

async function main() {
  const order = await p.order.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { application: true },
  });
  if (!order) {
    console.log(JSON.stringify({ ok: false, reason: 'NO_ORDER' }));
    return;
  }

  const payment = await p.paymentTransaction.findFirst({
    where: {
      applicationId: order.applicationId,
      paymentStatus: 'SUCCESS',
    },
    orderBy: { createdAt: 'desc' },
  });

  if (payment && !order.paymentTransactionId) {
    await p.order.update({
      where: { id: order.id },
      data: {
        paymentTransactionId: payment.id,
        orderStatus: 'ORDER_CONFIRMED',
        estimatedDeliveryDate: order.estimatedDeliveryDate ?? new Date(Date.now() + 7 * 86400000),
      },
    });
  }

  const user = await p.user.findUniqueOrThrow({
    where: { id: order.userId },
    select: { id: true, uuid: true, email: true, mobile: true },
  });
  const token = signAccessToken({
    sub: user.id,
    uuid: user.uuid,
    email: user.email,
    mobile: user.mobile,
  });
  const headers = { Authorization: `Bearer ${token}` };

  const unauth = await fetch(`${base}/orders/current`);
  const current = await fetch(`${base}/orders/current`, { headers });
  const currentBody = await current.json();
  const byId = await fetch(`${base}/orders/${order.id}`, { headers });
  const receipt = await fetch(`${base}/orders/${order.id}/receipt`, { headers });
  const receiptBuf = Buffer.from(await receipt.arrayBuffer());
  const looksPdf = receiptBuf.subarray(0, 4).toString() === '%PDF';

  console.log(
    JSON.stringify(
      {
        unauthStatus: unauth.status,
        currentHttp: current.status,
        orderStatus: currentBody?.data?.orderStatus ?? null,
        paymentIdPresent: Boolean(currentBody?.data?.paymentId),
        byIdHttp: byId.status,
        receiptHttp: receipt.status,
        receiptIsPdf: looksPdf,
        receiptBytes: receiptBuf.length,
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
