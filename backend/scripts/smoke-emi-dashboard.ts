import { PrismaClient } from '@prisma/client';
import { signAccessToken } from '../src/common/utils/jwt';

const prisma = new PrismaClient();
const base = 'http://localhost:4000/api/v1';

async function main() {
  const application = await prisma.emiApplication.findFirst({
    where: { status: 'ACTIVE_EMI' },
    orderBy: { updatedAt: 'desc' },
  });

  if (!application) {
    console.log(JSON.stringify({ ok: false, reason: 'NO_ACTIVE_EMI_APPLICATION' }));
    return;
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: application.userId },
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

  const unauth = await fetch(`${base}/loans/dashboard`);
  const dashboard = await fetch(`${base}/loans/dashboard`, { headers });
  const dashboardBody = (await dashboard.json()) as {
    data?: {
      loan?: { id?: string; loanAccountNumber?: string; loanStatus?: string };
      summary?: { remainingEmis?: number; outstandingBalance?: number };
      schedule?: unknown[];
      nextEmi?: { emiNumber?: number } | null;
    };
  };

  const current = await fetch(`${base}/loans/current`, { headers });
  const history = await fetch(`${base}/loans/payment-history`, { headers });
  const statement = await fetch(`${base}/loans/statement`, { headers });
  const statementBuf = Buffer.from(await statement.arrayBuffer());
  const statementIsPdf = statementBuf.subarray(0, 4).toString() === '%PDF';

  const loanId = dashboardBody?.data?.loan?.id;
  const adminList = await fetch(`${base}/admin/loans`, { headers });
  const adminGet = loanId
    ? await fetch(`${base}/admin/loans/${loanId}`, { headers })
    : { status: 0 };

  let pauseHttp = 0;
  let resumeHttp = 0;
  if (loanId) {
    const paused = await fetch(`${base}/admin/loans/${loanId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ loanStatus: 'PAUSED', remarks: 'Smoke pause' }),
    });
    pauseHttp = paused.status;

    const blocked = await fetch(`${base}/loans/dashboard`, { headers });

    const resumed = await fetch(`${base}/admin/loans/${loanId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ loanStatus: 'ACTIVE', remarks: 'Smoke resume' }),
    });
    resumeHttp = resumed.status;

    console.log(
      JSON.stringify(
        {
          unauthStatus: unauth.status,
          dashboardHttp: dashboard.status,
          loanAccountNumber: dashboardBody?.data?.loan?.loanAccountNumber ?? null,
          loanStatus: dashboardBody?.data?.loan?.loanStatus ?? null,
          scheduleCount: dashboardBody?.data?.schedule?.length ?? 0,
          remainingEmis: dashboardBody?.data?.summary?.remainingEmis ?? null,
          nextEmi: dashboardBody?.data?.nextEmi?.emiNumber ?? null,
          currentHttp: current.status,
          historyHttp: history.status,
          statementHttp: statement.status,
          statementIsPdf,
          adminListHttp: adminList.status,
          adminGetHttp: adminGet.status,
          pauseHttp,
          dashboardWhilePausedHttp: blocked.status,
          resumeHttp,
          ok:
            unauth.status === 401 &&
            dashboard.status === 200 &&
            current.status === 200 &&
            history.status === 200 &&
            statement.status === 200 &&
            statementIsPdf &&
            adminList.status === 200 &&
            adminGet.status === 200 &&
            pauseHttp === 200 &&
            blocked.status === 403 &&
            resumeHttp === 200,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(JSON.stringify({ ok: false, reason: 'NO_LOAN_ID', dashboardHttp: dashboard.status }));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
