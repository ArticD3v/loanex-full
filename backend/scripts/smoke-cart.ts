import { PrismaClient } from '@prisma/client';
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

  await prisma.product.update({
    where: { id: 'hp-pavilion-15' },
    data: { stockQuantity: 25, inStock: true },
  });
  await prisma.cartItem.deleteMany({ where: { userId: user.id } });
  await prisma.wishlistItem.deleteMany({ where: { userId: user.id } });

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

  const unauth = await fetch(`${base}/cart`);
  const add = await fetch(`${base}/cart`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ productId: 'hp-pavilion-15', quantity: 1 }),
  });
  const addBody = (await add.json()) as {
    data?: { item?: { id?: string; quantity?: number }; summary?: { totalItems?: number } };
  };
  const cartItemId = addBody?.data?.item?.id ?? '';

  const addAgain = await fetch(`${base}/cart`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ productId: 'hp-pavilion-15', quantity: 1 }),
  });
  const addAgainBody = (await addAgain.json()) as {
    data?: { item?: { quantity?: number }; items?: unknown[] };
  };

  const update = await fetch(`${base}/cart/${cartItemId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ quantity: 3 }),
  });
  const updateBody = (await update.json()) as {
    data?: { items?: Array<{ quantity?: number }> };
  };

  const get = await fetch(`${base}/cart`, { headers });

  const move = await fetch(`${base}/cart/${cartItemId}/move-to-wishlist`, {
    method: 'POST',
    headers,
  });
  const moveBody = (await move.json()) as { data?: { items?: unknown[] } };
  const wishlistCount = await prisma.wishlistItem.count({
    where: { userId: user.id, productId: 'hp-pavilion-15' },
  });

  // Re-add for remove/clear tests
  const readd = await fetch(`${base}/cart`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ productId: 'hp-pavilion-15', quantity: 2 }),
  });
  const readdBody = (await readd.json()) as { data?: { item?: { id?: string } } };
  const item2 = readdBody?.data?.item?.id ?? '';

  const remove = await fetch(`${base}/cart/${item2}`, {
    method: 'DELETE',
    headers,
  });

  await fetch(`${base}/cart`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ productId: 'hp-pavilion-15', quantity: 1 }),
  });
  const clear = await fetch(`${base}/cart`, { method: 'DELETE', headers });
  const clearBody = (await clear.json()) as { data?: { items?: unknown[] } };

  await prisma.product.update({
    where: { id: 'hp-pavilion-15' },
    data: { stockQuantity: 0, inStock: false },
  });
  const outOfStock = await fetch(`${base}/cart`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ productId: 'hp-pavilion-15', quantity: 1 }),
  });
  await prisma.product.update({
    where: { id: 'hp-pavilion-15' },
    data: { stockQuantity: 25, inStock: true },
  });

  console.log(
    JSON.stringify(
      {
        unauthStatus: unauth.status,
        addHttp: add.status,
        addedQty: addBody?.data?.item?.quantity ?? null,
        addAgainHttp: addAgain.status,
        mergedQty: addAgainBody?.data?.item?.quantity ?? null,
        updateHttp: update.status,
        updatedQty: updateBody?.data?.items?.[0]?.quantity ?? null,
        getHttp: get.status,
        moveHttp: move.status,
        cartAfterMove: moveBody?.data?.items?.length ?? null,
        wishlistCount,
        removeHttp: remove.status,
        clearHttp: clear.status,
        clearedItems: clearBody?.data?.items?.length ?? null,
        outOfStockHttp: outOfStock.status,
        ok:
          unauth.status === 401 &&
          add.status === 200 &&
          addBody?.data?.item?.quantity === 1 &&
          addAgain.status === 200 &&
          addAgainBody?.data?.item?.quantity === 2 &&
          update.status === 200 &&
          updateBody?.data?.items?.[0]?.quantity === 3 &&
          get.status === 200 &&
          move.status === 200 &&
          (moveBody?.data?.items?.length ?? -1) === 0 &&
          wishlistCount === 1 &&
          remove.status === 200 &&
          clear.status === 200 &&
          (clearBody?.data?.items?.length ?? -1) === 0 &&
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
