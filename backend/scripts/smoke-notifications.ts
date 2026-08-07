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

  const unauth = await fetch(`${base}/notifications`);

  const created = await fetch(`${base}/admin/notifications`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      userId: user.id,
      title: 'Smoke notification',
      message: 'Notification Center smoke test',
      type: 'SYSTEM',
      priority: 'MEDIUM',
      metadata: { source: 'smoke' },
    }),
  });
  const createdBody = (await created.json()) as {
    data?: { id?: string; isRead?: boolean; title?: string };
  };
  const notificationId = createdBody?.data?.id ?? '';

  const list = await fetch(`${base}/notifications?filter=ALL`, { headers });
  const listBody = (await list.json()) as {
    data?: { total?: number; unreadCount?: number; items?: Array<{ id: string }> };
  };

  const getOne = await fetch(`${base}/notifications/${notificationId}`, { headers });
  const markRead = await fetch(`${base}/notifications/${notificationId}/read`, {
    method: 'PATCH',
    headers,
  });
  const markReadBody = (await markRead.json()) as { data?: { isRead?: boolean } };

  const markAll = await fetch(`${base}/notifications/read-all`, {
    method: 'PATCH',
    headers,
  });

  const adminList = await fetch(`${base}/admin/notifications`, { headers });

  const remove = await fetch(`${base}/notifications/${notificationId}`, {
    method: 'DELETE',
    headers,
  });

  const afterDelete = await fetch(`${base}/notifications/${notificationId}`, { headers });

  console.log(
    JSON.stringify(
      {
        unauthStatus: unauth.status,
        createHttp: created.status,
        notificationId: notificationId || null,
        listHttp: list.status,
        listTotal: listBody?.data?.total ?? null,
        getHttp: getOne.status,
        markReadHttp: markRead.status,
        isRead: markReadBody?.data?.isRead ?? null,
        markAllHttp: markAll.status,
        adminListHttp: adminList.status,
        deleteHttp: remove.status,
        afterDeleteHttp: afterDelete.status,
        ok:
          unauth.status === 401 &&
          created.status === 200 &&
          Boolean(notificationId) &&
          list.status === 200 &&
          getOne.status === 200 &&
          markRead.status === 200 &&
          markReadBody?.data?.isRead === true &&
          markAll.status === 200 &&
          adminList.status === 200 &&
          remove.status === 200 &&
          afterDelete.status === 404,
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
