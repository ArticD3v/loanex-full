import { EmiApplicationStatus, PrismaClient } from '@prisma/client';
import { signAccessToken } from '../src/common/utils/jwt';

const p = new PrismaClient();

async function main() {
  const app = await p.emiApplication.findFirst({ orderBy: { createdAt: 'desc' } });
  if (!app) {
    console.log(JSON.stringify({ ok: false, reason: 'NO_APPLICATION' }));
    return;
  }

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
  const headers = { Authorization: `Bearer ${token}` };
  const original = app.status;

  const results: Record<string, string | null> = {};

  for (const status of [
    EmiApplicationStatus.UNDER_REVIEW,
    EmiApplicationStatus.APPROVED,
    EmiApplicationStatus.REJECTED,
    EmiApplicationStatus.PENDING,
  ] as const) {
    await p.emiApplication.update({
      where: { id: app.id },
      data: {
        status,
        approvedAmount: status === EmiApplicationStatus.APPROVED ? 30000 : null,
        approvedTenure: status === EmiApplicationStatus.APPROVED ? 6 : null,
        approvedDownPayment: status === EmiApplicationStatus.APPROVED ? 20000 : null,
        rejectionReason:
          status === EmiApplicationStatus.REJECTED ? 'Insufficient documentation' : null,
      },
    });

    const res = await fetch('http://localhost:4000/api/v1/emi/applications/current?event=viewed', {
      headers,
    });
    const body = await res.json();
    results[status] = body?.data?.status ?? null;
  }

  await p.emiApplication.update({
    where: { id: app.id },
    data: {
      status: original,
      approvedAmount: null,
      approvedTenure: null,
      approvedDownPayment: null,
      rejectionReason: null,
    },
  });

  console.log(JSON.stringify({ restoredTo: original, results }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await p.$disconnect();
  });
