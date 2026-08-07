import { PrismaClient } from '@prisma/client';
import { signAccessToken } from '../src/common/utils/jwt';

const p = new PrismaClient();

async function main() {
  const app = await p.emiApplication.findFirst({ orderBy: { createdAt: 'desc' } });
  if (!app) {
    console.log(JSON.stringify({ ok: false, reason: 'NO_APPLICATION' }));
    return;
  }

  const user = await p.user.findUnique({
    where: { id: app.userId },
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

  const headers = { Authorization: `Bearer ${token}` };

  const viewed = await fetch(
    'http://localhost:4000/api/v1/emi/applications/current?event=viewed',
    { headers },
  );
  const viewedBody = await viewed.json();

  const refreshed = await fetch(
    'http://localhost:4000/api/v1/emi/applications/current?event=refreshed',
    { headers },
  );
  const refreshedBody = await refreshed.json();

  const statusRes = await fetch('http://localhost:4000/api/v1/emi/applications/status', {
    headers,
  });
  const statusBody = await statusRes.json();

  const unauth = await fetch('http://localhost:4000/api/v1/emi/applications/current');

  const audit = await p.auditLog.count({
    where: {
      action: { in: ['STATUS_VIEWED', 'STATUS_REFRESHED'] },
      entity: 'emi_applications',
    },
  });

  console.log(
    JSON.stringify(
      {
        unauthStatus: unauth.status,
        viewedHttp: viewed.status,
        viewedOk: viewedBody?.success === true,
        viewedStatus: viewedBody?.data?.status ?? null,
        hasAppNumber: Boolean(viewedBody?.data?.applicationNumber),
        approvedAmountNull: viewedBody?.data?.approvedAmount === null,
        refreshedHttp: refreshed.status,
        refreshedOk: refreshedBody?.success === true,
        statusHttp: statusRes.status,
        statusHasApp: statusBody?.data?.hasApplication ?? null,
        canModify: statusBody?.data?.canModifyApplication ?? null,
        canPay: statusBody?.data?.canPayDownPayment ?? null,
        canAccept: statusBody?.data?.canAcceptOffer ?? null,
        auditCount: audit,
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
