import { PrismaClient } from '@prisma/client';
import { signAccessToken } from '../src/common/utils/jwt';

const prisma = new PrismaClient();
const base = 'http://localhost:4000/api/v1';

async function main() {
  const loan = await prisma.loanAccount.findFirst({
    orderBy: { createdAt: 'desc' },
  });
  if (!loan) {
    console.log(JSON.stringify({ ok: false, reason: 'NO_LOAN' }));
    return;
  }

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
  const headers = { Authorization: `Bearer ${token}` };

  const unauth = await fetch(`${base}/emi/payment-history`);
  const history = await fetch(`${base}/emi/payment-history?paymentType=EMI`, { headers });
  const historyBody = (await history.json()) as {
    data?: { total?: number; items?: Array<{ id: string; receiptAvailable?: boolean }> };
  };

  const statement = await fetch(`${base}/emi/statement`, { headers });
  const statementPdf = await fetch(`${base}/emi/statement/pdf`, { headers });
  const statementBuf = Buffer.from(await statementPdf.arrayBuffer());
  const statementIsPdf = statementBuf.subarray(0, 4).toString() === '%PDF';

  const excel = await fetch(`${base}/emi/payment-history/export?format=excel`, { headers });
  const pdf = await fetch(`${base}/emi/payment-history/export?format=pdf`, { headers });
  const pdfBuf = Buffer.from(await pdf.arrayBuffer());
  const historyIsPdf = pdfBuf.subarray(0, 4).toString() === '%PDF';

  const paymentId = historyBody?.data?.items?.find((item) => item.receiptAvailable)?.id
    ?? historyBody?.data?.items?.[0]?.id;

  let receiptHttp = 0;
  let receiptIsPdf = false;
  let byIdHttp = 0;
  if (paymentId) {
    const byId = await fetch(`${base}/emi/payment-history/${paymentId}`, { headers });
    byIdHttp = byId.status;
    const receipt = await fetch(`${base}/emi/payment-history/${paymentId}/receipt`, { headers });
    receiptHttp = receipt.status;
    const receiptBuf = Buffer.from(await receipt.arrayBuffer());
    receiptIsPdf = receiptBuf.subarray(0, 4).toString() === '%PDF';
  }

  console.log(
    JSON.stringify(
      {
        unauthStatus: unauth.status,
        historyHttp: history.status,
        historyTotal: historyBody?.data?.total ?? 0,
        statementHttp: statement.status,
        statementPdfHttp: statementPdf.status,
        statementIsPdf,
        exportExcelHttp: excel.status,
        exportPdfHttp: pdf.status,
        historyIsPdf,
        byIdHttp,
        receiptHttp,
        receiptIsPdf,
        ok:
          unauth.status === 401 &&
          history.status === 200 &&
          statement.status === 200 &&
          statementPdf.status === 200 &&
          statementIsPdf &&
          excel.status === 200 &&
          pdf.status === 200 &&
          historyIsPdf &&
          (!paymentId || (byIdHttp === 200 && (receiptHttp === 200 || receiptHttp === 404))),
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
