import { PrismaClient, OrderStatus } from '@prisma/client';
import { signAccessToken } from '../src/common/utils/jwt';

const prisma = new PrismaClient();
const base = 'http://localhost:4000/api/v1';

const FLOW: OrderStatus[] = [
  OrderStatus.PROCESSING,
  OrderStatus.PACKED,
  OrderStatus.SHIPPED,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.DELIVERED,
];

async function main() {
  const order = await prisma.order.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { application: true },
  });

  if (!order) {
    console.log(JSON.stringify({ ok: false, reason: 'NO_ORDER' }));
    return;
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: order.userId },
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

  const unauth = await fetch(`${base}/orders/${order.id}/tracking`);
  const notFound = await fetch(`${base}/orders/00000000-0000-0000-0000-000000000000/tracking`, {
    headers,
  });
  const tracking = await fetch(`${base}/orders/${order.id}/tracking`, { headers });
  const trackingBody = (await tracking.json()) as {
    data?: { orderStatus?: string; steps?: unknown[]; canOpenEmiDashboard?: boolean };
  };

  const invalidJump = await fetch(`${base}/admin/orders/${order.id}/status`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status: 'DELIVERED' }),
  });

  let latestStatus = order.orderStatus;
  const updates: Array<{ to: string; http: number }> = [];

  for (const next of FLOW) {
    const current = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    latestStatus = current.orderStatus;
    if (latestStatus === OrderStatus.DELIVERED) break;
    if (latestStatus === next) continue;

    const expectedNext =
      latestStatus === OrderStatus.ORDER_CONFIRMED
        ? OrderStatus.PROCESSING
        : latestStatus === OrderStatus.PROCESSING
          ? OrderStatus.PACKED
          : latestStatus === OrderStatus.PACKED
            ? OrderStatus.SHIPPED
            : latestStatus === OrderStatus.SHIPPED
              ? OrderStatus.OUT_FOR_DELIVERY
              : latestStatus === OrderStatus.OUT_FOR_DELIVERY
                ? OrderStatus.DELIVERED
                : null;

    if (expectedNext !== next) continue;

    const res = await fetch(`${base}/admin/orders/${order.id}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        status: next,
        remarks: `Smoke advance to ${next}`,
        location: 'LoanEx Central Warehouse, Mumbai',
      }),
    });
    updates.push({ to: next, http: res.status });
    if (res.status !== 200) break;
  }

  const after = await prisma.order.findUniqueOrThrow({
    where: { id: order.id },
    include: { application: true, trackingEvents: true },
  });

  const invoice = await fetch(`${base}/orders/${order.id}/invoice`, { headers });
  const invoiceBuf = Buffer.from(await invoice.arrayBuffer());
  const invoiceIsPdf = invoiceBuf.subarray(0, 4).toString() === '%PDF';

  const finalTracking = await fetch(`${base}/orders/${order.id}/tracking`, { headers });
  const finalBody = (await finalTracking.json()) as {
    data?: { orderStatus?: string; canOpenEmiDashboard?: boolean; steps?: unknown[] };
  };

  console.log(
    JSON.stringify(
      {
        orderId: order.id,
        unauthStatus: unauth.status,
        notFoundStatus: notFound.status,
        trackingHttp: tracking.status,
        initialStatus: trackingBody?.data?.orderStatus ?? null,
        stepsCount: trackingBody?.data?.steps?.length ?? 0,
        invalidJumpHttp: invalidJump.status,
        updates,
        finalOrderStatus: after.orderStatus,
        loanStatus: after.application.status,
        trackingEvents: after.trackingEvents.length,
        invoiceHttp: invoice.status,
        invoiceIsPdf,
        canOpenEmiDashboard: finalBody?.data?.canOpenEmiDashboard ?? null,
        ok:
          unauth.status === 401 &&
          notFound.status === 404 &&
          tracking.status === 200 &&
          (invalidJump.status === 400 || after.orderStatus === OrderStatus.DELIVERED) &&
          invoice.status === 200 &&
          invoiceIsPdf &&
          after.orderStatus === OrderStatus.DELIVERED &&
          after.application.status === 'ACTIVE_EMI',
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
    await prisma.$disconnect();
  });
