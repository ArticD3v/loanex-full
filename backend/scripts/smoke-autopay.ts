import { PrismaClient } from '@prisma/client';
import { signAccessToken } from '../src/common/utils/jwt';

const prisma = new PrismaClient();
const base = 'http://localhost:4000/api/v1';

async function main() {
  const loan = await prisma.loanAccount.findFirst({
    where: { loanStatus: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  });
  if (!loan) {
    console.log(JSON.stringify({ ok: false, reason: 'NO_ACTIVE_LOAN' }));
    return;
  }

  // Reset open mandates for clean smoke
  await prisma.autopayMandate.updateMany({
    where: {
      loanAccountId: loan.id,
      status: { in: ['PENDING', 'ACTIVE', 'PAUSED'] },
    },
    data: { status: 'CANCELLED' },
  });
  await prisma.loanAccount.update({
    where: { id: loan.id },
    data: { autopayEnabled: false },
  });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: loan.userId },
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

  const unauth = await fetch(`${base}/autopay/status`);
  const status = await fetch(`${base}/autopay/status`, { headers });
  const create = await fetch(`${base}/autopay/create-mandate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      paymentMethod: 'UPI_AUTOPAY',
      bankName: 'HDFC Bank',
      upiId: 'smoke@okhdfcbank',
    }),
  });
  const createBody = (await create.json()) as { data?: { status?: string; mandateReference?: string } };

  const dup = await fetch(`${base}/autopay/create-mandate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      paymentMethod: 'NACH',
      bankName: 'HDFC Bank',
    }),
  });

  const approve = await fetch(`${base}/admin/autopay/${loan.id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status: 'ACTIVE', remarks: 'Smoke approve' }),
  });

  const statusAfter = await fetch(`${base}/autopay/status`, { headers });
  const statusAfterBody = (await statusAfter.json()) as {
    data?: { autopayStatus?: string; loan?: { autopayEnabled?: boolean } };
  };

  const history = await fetch(`${base}/autopay/history`, { headers });
  const adminList = await fetch(`${base}/admin/autopay`, { headers });
  const adminGet = await fetch(`${base}/admin/autopay/${loan.id}`, { headers });

  const cancel = await fetch(`${base}/autopay/cancel-mandate`, {
    method: 'POST',
    headers,
  });

  console.log(
    JSON.stringify(
      {
        unauthStatus: unauth.status,
        statusHttp: status.status,
        createHttp: create.status,
        createdStatus: createBody?.data?.status ?? null,
        duplicateHttp: dup.status,
        approveHttp: approve.status,
        autopayStatusAfterApprove: statusAfterBody?.data?.autopayStatus ?? null,
        autopayEnabled: statusAfterBody?.data?.loan?.autopayEnabled ?? null,
        historyHttp: history.status,
        adminListHttp: adminList.status,
        adminGetHttp: adminGet.status,
        cancelHttp: cancel.status,
        ok:
          unauth.status === 401 &&
          status.status === 200 &&
          create.status === 200 &&
          createBody?.data?.status === 'PENDING' &&
          dup.status === 409 &&
          approve.status === 200 &&
          statusAfterBody?.data?.autopayStatus === 'ENABLED' &&
          statusAfterBody?.data?.loan?.autopayEnabled === true &&
          history.status === 200 &&
          adminList.status === 200 &&
          adminGet.status === 200 &&
          cancel.status === 200,
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
