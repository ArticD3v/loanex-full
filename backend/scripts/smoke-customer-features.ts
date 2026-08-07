import { OrderStatus, PrismaClient } from '@prisma/client';
import { signAccessToken } from '../src/common/utils/jwt';

const prisma = new PrismaClient();
const base = 'http://localhost:4000/api/v1';

async function main() {
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { id: true, uuid: true, email: true, mobile: true },
  });
  if (!user) {
    console.log(JSON.stringify({ ok: false, reason: 'NO_USER' }));
    return;
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

  const unauthOrders = await fetch(`${base}/orders`);
  const listOrders = await fetch(`${base}/orders`, { headers });
  const listOrdersBody = (await listOrders.json()) as {
    data?: { totalItems?: number; items?: unknown[] };
  };

  const products = await fetch(`${base}/products?search=laptop&availability=IN_STOCK&limit=5`);
  const productsBody = (await products.json()) as {
    data?: { items?: Array<{ id: string }>; pagination?: { total: number } };
  };

  const unauthReview = await fetch(`${base}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productId: 'hp-pavilion-15',
      rating: 5,
      review: 'Smoke test review for customer features.',
    }),
  });

  const supportCreate = await fetch(`${base}/support`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      issueType: 'OTHER',
      subject: 'Smoke test ticket',
      description: 'Automated smoke test for support module.',
    }),
  });
  const supportCreateBody = (await supportCreate.json()) as {
    data?: { id?: string; ticketNumber?: string };
  };

  const supportList = await fetch(`${base}/support`, { headers });
  const supportListBody = (await supportList.json()) as {
    data?: { totalItems?: number };
  };

  const order = await prisma.order.findFirst({
    where: { userId: user.id, orderStatus: { not: OrderStatus.CANCELLED } },
    select: { productId: true },
  });

  let reviewCreateStatus: number | null = null;
  let reviewListStatus: number | null = null;

  if (order?.productId) {
    await prisma.productReview.deleteMany({
      where: { userId: user.id, productId: order.productId },
    });

    const reviewCreate = await fetch(`${base}/reviews`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        productId: order.productId,
        rating: 4,
        review: 'Good product from smoke test, would recommend.',
      }),
    });
    reviewCreateStatus = reviewCreate.status;

    const reviewList = await fetch(`${base}/reviews/${order.productId}`, { headers });
    reviewListStatus = reviewList.status;

    await prisma.productReview.deleteMany({
      where: { userId: user.id, productId: order.productId },
    });
  }

  console.log(
    JSON.stringify(
      {
        unauthOrdersStatus: unauthOrders.status,
        listOrdersStatus: listOrders.status,
        listOrdersTotal: listOrdersBody?.data?.totalItems ?? null,
        productsStatus: products.status,
        productsCount: productsBody?.data?.items?.length ?? null,
        unauthReviewStatus: unauthReview.status,
        supportCreateStatus: supportCreate.status,
        supportTicketNumber: supportCreateBody?.data?.ticketNumber ?? null,
        supportListStatus: supportList.status,
        supportListTotal: supportListBody?.data?.totalItems ?? null,
        reviewCreateStatus,
        reviewListStatus,
        hadOrderForReview: Boolean(order?.productId),
        ok:
          unauthOrders.status === 401 &&
          listOrders.status === 200 &&
          products.status === 200 &&
          unauthReview.status === 401 &&
          supportCreate.status === 201 &&
          supportList.status === 200 &&
          (order?.productId
            ? reviewCreateStatus === 201 && reviewListStatus === 200
            : true),
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
