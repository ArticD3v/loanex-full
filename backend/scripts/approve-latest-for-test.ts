import { EmiApplicationStatus, PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function main() {
  const app = await p.emiApplication.findFirst({ orderBy: { createdAt: 'desc' } });
  if (!app) {
    console.log(JSON.stringify({ ok: false, reason: 'NO_APPLICATION' }));
    return;
  }

  const updated = await p.emiApplication.update({
    where: { id: app.id },
    data: {
      status: EmiApplicationStatus.APPROVED,
      approvedAmount: app.approvedAmount ?? app.requestedAmount,
      approvedTenure: app.approvedTenure ?? app.requestedTenure,
      approvedDownPayment: app.approvedDownPayment ?? app.requestedDownPayment,
      monthlyEmi: app.monthlyEmi ?? app.estimatedMonthlyEmi,
      interestRate: app.interestRate ?? 12.5,
      processingFee: app.processingFee ?? 499,
      adminRemarks: app.adminRemarks ?? 'Approved for testing — you can Accept Offer now.',
      offerAcceptedAt: null,
      offerDeclinedAt: null,
      rejectionReason: null,
      reviewedAt: new Date(),
    },
    select: {
      applicationNumber: true,
      status: true,
    },
  });

  console.log(JSON.stringify({ ok: true, ...updated }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await p.$disconnect();
  });
