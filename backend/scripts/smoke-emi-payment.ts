import { PrismaClient } from '@prisma/client';
import { signAccessToken } from '../src/common/utils/jwt';

const prisma = new PrismaClient();
const base = 'http://localhost:4000/api/v1';

async function main() {
  const loan = await prisma.loanAccount.findFirst({
    where: { loanStatus: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    include: {
      schedule: { orderBy: { emiNumber: 'asc' } },
    },
  });

  if (!loan) {
    console.log(JSON.stringify({ ok: false, reason: 'NO_ACTIVE_LOAN' }));
    return;
  }

  const nextEmi = loan.schedule.find((row) => row.paymentStatus !== 'PAID');
  if (!nextEmi) {
    console.log(JSON.stringify({ ok: false, reason: 'NO_UNPAID_EMI', loanId: loan.id }));
    return;
  }

  const futureEmi = loan.schedule.find(
    (row) => row.paymentStatus !== 'PAID' && row.id !== nextEmi.id,
  );

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

  const unauth = await fetch(`${base}/emi/payments/${nextEmi.id}`);
  const details = await fetch(`${base}/emi/payments/${nextEmi.id}`, { headers });
  const detailsBody = (await details.json()) as {
    data?: { canPay?: boolean; paymentSummary?: { grandTotal?: number } };
  };

  let futureHttp = 0;
  if (futureEmi) {
    const futureOrder = await fetch(`${base}/emi/payments/create-order`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ emiId: futureEmi.id }),
    });
    futureHttp = futureOrder.status;
  }

  const create = await fetch(`${base}/emi/payments/create-order`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ emiId: nextEmi.id }),
  });
  const createBody = (await create.json()) as {
    data?: { razorpayOrderId?: string; paymentDevBypass?: boolean };
  };

  const orderId = createBody?.data?.razorpayOrderId;
  let verifyHttp = 0;
  let duplicateHttp = 0;
  let alreadyPaidHttp = 0;
  let receiptHttp = 0;
  let receiptIsPdf = false;
  let remainingAfter: number | null = null;

  if (orderId && createBody?.data?.paymentDevBypass) {
    const signed = await fetch(`${base}/emi/payments/dev-bypass-signature`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ razorpayOrderId: orderId }),
    });
    const signedBody = (await signed.json()) as {
      data?: {
        razorpayOrderId?: string;
        razorpayPaymentId?: string;
        razorpaySignature?: string;
      };
    };

    const verify = await fetch(`${base}/emi/payments/verify`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        emiId: nextEmi.id,
        razorpayOrderId: signedBody.data?.razorpayOrderId,
        razorpayPaymentId: signedBody.data?.razorpayPaymentId,
        razorpaySignature: signedBody.data?.razorpaySignature,
      }),
    });
    verifyHttp = verify.status;
    const verifyBody = (await verify.json()) as {
      data?: { remainingEmis?: number };
    };
    remainingAfter = verifyBody?.data?.remainingEmis ?? null;

    const duplicate = await fetch(`${base}/emi/payments/verify`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        emiId: nextEmi.id,
        razorpayOrderId: signedBody.data?.razorpayOrderId,
        razorpayPaymentId: signedBody.data?.razorpayPaymentId,
        razorpaySignature: signedBody.data?.razorpaySignature,
      }),
    });
    duplicateHttp = duplicate.status;

    const already = await fetch(`${base}/emi/payments/create-order`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ emiId: nextEmi.id }),
    });
    alreadyPaidHttp = already.status;

    const receipt = await fetch(`${base}/emi/payments/${nextEmi.id}/receipt`, { headers });
    receiptHttp = receipt.status;
    const buf = Buffer.from(await receipt.arrayBuffer());
    receiptIsPdf = buf.subarray(0, 4).toString() === '%PDF';
  }

  const admin = await fetch(`${base}/admin/emi-payments?loanId=${loan.id}`, { headers });

  console.log(
    JSON.stringify(
      {
        loanId: loan.id,
        emiId: nextEmi.id,
        unauthStatus: unauth.status,
        detailsHttp: details.status,
        canPay: detailsBody?.data?.canPay ?? null,
        futureEmiBlockedHttp: futureHttp,
        createHttp: create.status,
        verifyHttp,
        duplicateHttp,
        alreadyPaidHttp,
        receiptHttp,
        receiptIsPdf,
        remainingAfter,
        adminHttp: admin.status,
        ok:
          unauth.status === 401 &&
          details.status === 200 &&
          create.status === 200 &&
          verifyHttp === 200 &&
          (duplicateHttp === 200 || duplicateHttp === 409) &&
          (alreadyPaidHttp === 409 || alreadyPaidHttp === 400) &&
          receiptHttp === 200 &&
          receiptIsPdf &&
          admin.status === 200 &&
          (futureHttp === 0 || futureHttp === 400),
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
