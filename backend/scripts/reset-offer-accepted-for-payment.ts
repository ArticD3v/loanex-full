import { EmiApplicationStatus, PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function main() {
  const app = await p.emiApplication.findFirst({ orderBy: { createdAt: 'desc' } });
  if (!app) {
    console.log(JSON.stringify({ ok: false, reason: 'NO_APPLICATION' }));
    return;
  }

  await p.paymentTransaction.deleteMany({ where: { applicationId: app.id } });
  await p.order.deleteMany({ where: { applicationId: app.id } });

  const updated = await p.emiApplication.update({
    where: { id: app.id },
    data: {
      status: EmiApplicationStatus.OFFER_ACCEPTED,
      approvedAmount: app.approvedAmount ?? app.requestedAmount,
      approvedDownPayment: app.approvedDownPayment ?? app.requestedDownPayment,
      approvedTenure: app.approvedTenure ?? app.requestedTenure,
      monthlyEmi: app.monthlyEmi ?? app.estimatedMonthlyEmi,
      processingFee: app.processingFee ?? 499,
      interestRate: app.interestRate ?? 12.5,
      offerAcceptedAt: new Date(),
      offerDeclinedAt: null,
    },
    select: { applicationNumber: true, status: true },
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
