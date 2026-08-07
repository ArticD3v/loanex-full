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

  const product = await prisma.product.findFirst({
    where: { inStock: true, stockQuantity: { gt: 0 } },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (!product) {
    console.log(JSON.stringify({ ok: false, reason: 'NO_PRODUCT' }));
    return;
  }

  await prisma.wishlistItem.deleteMany({
    where: { userId: user.id, productId: product.id },
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

  const unauth = await fetch(`${base}/wishlist`);

  const add = await fetch(`${base}/wishlist`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ productId: product.id }),
  });
  const addBody = (await add.json()) as {
    data?: { item?: { id?: string }; totalItems?: number };
  };
  const wishlistItemId = addBody?.data?.item?.id ?? '';

  const duplicate = await fetch(`${base}/wishlist`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ productId: product.id }),
  });

  const list = await fetch(`${base}/wishlist`, { headers });
  const listBody = (await list.json()) as {
    data?: { totalItems?: number; items?: Array<{ id: string }> };
  };

  const status = await fetch(`${base}/wishlist/status/${product.id}`, { headers });
  const statusBody = (await status.json()) as {
    data?: { inWishlist?: boolean; wishlistItemId?: string | null };
  };

  const move = await fetch(`${base}/wishlist/${wishlistItemId}/move-to-cart`, {
    method: 'POST',
    headers,
  });
  const afterMove = await fetch(`${base}/wishlist`, { headers });
  const afterMoveBody = (await afterMove.json()) as {
    data?: { totalItems?: number; items?: Array<{ productId: string }> };
  };
  const stillInWishlist = (afterMoveBody?.data?.items ?? []).some(
    (item) => item.productId === product.id,
  );

  const reAdd = await fetch(`${base}/wishlist`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ productId: product.id }),
  });
  const reAddBody = (await reAdd.json()) as {
    data?: { item?: { id?: string } };
  };
  const removeId = reAddBody?.data?.item?.id ?? '';

  const remove = await fetch(`${base}/wishlist/${removeId}`, {
    method: 'DELETE',
    headers,
  });

  const cart = await fetch(`${base}/cart`, { headers });
  const cartBody = (await cart.json()) as {
    data?: { items?: Array<{ productId: string }> };
  };
  const inCart = (cartBody?.data?.items ?? []).some((item) => item.productId === product.id);

  console.log(
    JSON.stringify(
      {
        unauthStatus: unauth.status,
        addHttp: add.status,
        wishlistItemId: wishlistItemId || null,
        duplicateHttp: duplicate.status,
        listHttp: list.status,
        listTotal: listBody?.data?.totalItems ?? null,
        statusHttp: status.status,
        inWishlist: statusBody?.data?.inWishlist ?? null,
        moveHttp: move.status,
        stillInWishlistAfterMove: stillInWishlist,
        reAddHttp: reAdd.status,
        removeHttp: remove.status,
        inCartAfterMove: inCart,
        ok:
          unauth.status === 401 &&
          add.status === 200 &&
          Boolean(wishlistItemId) &&
          duplicate.status === 409 &&
          list.status === 200 &&
          status.status === 200 &&
          statusBody?.data?.inWishlist === true &&
          move.status === 200 &&
          stillInWishlist === false &&
          reAdd.status === 200 &&
          remove.status === 200 &&
          inCart === true,
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
