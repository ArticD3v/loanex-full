import { EmiApplicationStatus, PrismaClient } from '@prisma/client';
import { signAccessToken } from '../src/common/utils/jwt';

const p = new PrismaClient();
const base = 'http://localhost:4000/api/v1/emi/applications';

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
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const original = {
    status: app.status,
    approvedAmount: app.approvedAmount,
    approvedTenure: app.approvedTenure,
    approvedDownPayment: app.approvedDownPayment,
    monthlyEmi: app.monthlyEmi,
    interestRate: app.interestRate,
    processingFee: app.processingFee,
    adminRemarks: app.adminRemarks,
    offerAcceptedAt: app.offerAcceptedAt,
    offerDeclinedAt: app.offerDeclinedAt,
  };

  await p.emiApplication.update({
    where: { id: app.id },
    data: {
      status: EmiApplicationStatus.APPROVED,
      approvedAmount: 30000,
      approvedTenure: 6,
      approvedDownPayment: 20000,
      monthlyEmi: 5167,
      interestRate: 12.5,
      processingFee: 499,
      adminRemarks: 'Approved as requested',
      offerAcceptedAt: null,
      offerDeclinedAt: null,
    },
  });

  const unauth = await fetch(`${base}/current-offer`);
  const pendingCheck = await p.emiApplication.update({
    where: { id: app.id },
    data: { status: EmiApplicationStatus.PENDING },
  });
  void pendingCheck;
  const notAvailable = await fetch(`${base}/current-offer`, { headers });
  const notAvailableBody = await notAvailable.json();

  await p.emiApplication.update({
    where: { id: app.id },
    data: { status: EmiApplicationStatus.APPROVED },
  });

  const offer = await fetch(`${base}/current-offer`, { headers });
  const offerBody = await offer.json();

  const accept = await fetch(`${base}/accept-offer`, {
    method: 'POST',
    headers,
    body: '{}',
  });
  const acceptBody = await accept.json();

  const acceptAgain = await fetch(`${base}/accept-offer`, {
    method: 'POST',
    headers,
    body: '{}',
  });
  const acceptAgainBody = await acceptAgain.json();

  await p.emiApplication.update({
    where: { id: app.id },
    data: {
      status: EmiApplicationStatus.APPROVED,
      offerAcceptedAt: null,
      offerDeclinedAt: null,
    },
  });

  const decline = await fetch(`${base}/decline-offer`, {
    method: 'POST',
    headers,
    body: '{}',
  });
  const declineBody = await decline.json();

  const audit = await p.auditLog.count({
    where: {
      action: { in: ['OFFER_VIEWED', 'OFFER_ACCEPTED', 'OFFER_DECLINED'] },
      entity: 'emi_applications',
    },
  });

  await p.emiApplication.update({
    where: { id: app.id },
    data: {
      status: original.status,
      approvedAmount: original.approvedAmount,
      approvedTenure: original.approvedTenure,
      approvedDownPayment: original.approvedDownPayment,
      monthlyEmi: original.monthlyEmi,
      interestRate: original.interestRate,
      processingFee: original.processingFee,
      adminRemarks: original.adminRemarks,
      offerAcceptedAt: original.offerAcceptedAt,
      offerDeclinedAt: original.offerDeclinedAt,
    },
  });

  console.log(
    JSON.stringify(
      {
        unauthStatus: unauth.status,
        notAvailableHttp: notAvailable.status,
        notAvailableCode: notAvailableBody?.details?.code ?? null,
        offerHttp: offer.status,
        offerStatus: offerBody?.data?.status ?? null,
        offerAmount: offerBody?.data?.approvedLoanAmount ?? null,
        acceptHttp: accept.status,
        acceptStatus: acceptBody?.data?.status ?? null,
        acceptNext: acceptBody?.data?.nextStep ?? null,
        alreadyAcceptedHttp: acceptAgain.status,
        alreadyAcceptedCode: acceptAgainBody?.details?.code ?? null,
        declineHttp: decline.status,
        declineStatus: declineBody?.data?.status ?? null,
        auditCount: audit,
        restored: true,
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
