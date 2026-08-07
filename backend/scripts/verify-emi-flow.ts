import 'dotenv/config';
import { signAccessToken } from '../src/common/utils/jwt';

const BASE = 'http://localhost:4000/api/v1';
const TEST_MOBILE = '9876543210';
const TEST_EMAIL = 'flowtest@loanex.in';
const TEST_USER_ID = 'aec05433-4117-46f0-b8bc-4060445914ab';

const token = signAccessToken({
  sub: TEST_USER_ID,
  uuid: TEST_USER_ID,
  email: TEST_EMAIL,
  mobile: TEST_MOBILE,
});
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

let pass = 0;
let fail = 0;

function report(name: string, ok: boolean, detail: unknown) {
  if (ok) pass += 1;
  else fail += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${JSON.stringify(detail)}`);
}

async function api(path: string, opts: { method?: string; body?: unknown } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function main() {
  // ---- 1. Review: personal info from profiles ----
  const review = await api('/emi/applications/review');
  report(
    'review.personal (fullName from profiles)',
    review.status === 200 &&
      review.json?.data?.personal?.fullName === 'Flow Test User' &&
      review.json?.data?.personal?.mobile === TEST_MOBILE,
    { status: review.status, personal: review.json?.data?.personal },
  );
  report(
    'review.canSubmit (KYC complete)',
    review.status === 200 && review.json?.data?.verification?.overallStatus === 'COMPLETED',
    review.json?.data?.verification,
  );

  // ---- 2. Create application (resume if one already exists) ----
  const created = await api('/emi/applications', {
    method: 'POST',
    body: {
      productId: 'id_1786019829213_it8zhh',
      sellingPrice: 18156,
      requestedAmount: 14524.8,
      requestedDownPayment: 3631.2,
      requestedTenure: 9,
      estimatedMonthlyEmi: 1692.18,
    },
  });
  let app = created.json?.data;
  if (created.status === 409) {
    const current = await api('/emi/applications/current');
    app = current.json?.data?.application ?? current.json?.data;
    report(
      'create application → resumed existing',
      current.status === 200 && !!app?.applicationNumber,
      { status: current.status, appNumber: app?.applicationNumber, status2: app?.status, reason: created.json?.message },
    );
  } else {
    report(
      'create application → PENDING',
      created.status === 201 && app?.status === 'PENDING' && !!app?.applicationNumber,
      { status: created.status, appNumber: app?.applicationNumber, status2: app?.status },
    );
  }

  // ---- 3. Current status / offer not available ----
  const current = await api('/emi/applications/current');
  report('current → PENDING', current.status === 200 && current.json?.data?.status === 'PENDING', current.json?.data?.status);

  // ---- 4. Approve via admin endpoint (works without PAYMENT_DEV_BYPASS) ----
  const approved = await api(`/admin/emi-applications/${app?.id}/approve`, { method: 'POST' });
  const approvedData = approved.json?.data;
  report(
    'admin-approve → APPROVED',
    approved.status === 200 && approvedData?.status === 'APPROVED',
    { status: approved.status, appStatus: approvedData?.status, msg: approved.json?.message },
  );
  report(
    'order created on approval (orderNumber stored)',
    !!approvedData?.orderId && !!approvedData?.orderNumber && approvedData?.orderNumber?.startsWith('LX-ORD-'),
    { orderId: approvedData?.orderId, orderNumber: approvedData?.orderNumber, nextStep: approvedData?.nextStep },
  );

  // ---- 5. Current offer (with approved terms) ----
  const offer = await api('/emi/applications/current-offer');
  const of = offer.json?.data;
  report(
    'current-offer → approved terms',
    offer.status === 200 && of?.status === 'APPROVED' && of?.approvedDownPayment > 0 && of?.interestRate > 0,
    { status: offer.status, approvedAmount: of?.approvedAmount, approvedDownPayment: of?.approvedDownPayment, interestRate: of?.interestRate, processingFee: of?.processingFee, termsModified: of?.termsModified },
  );

  // ---- 6. Accept offer ----
  const accepted = await api('/emi/applications/accept-offer', { method: 'POST' });
  report(
    'accept-offer → OFFER_ACCEPTED',
    accepted.status === 200 && accepted.json?.data?.status === 'OFFER_ACCEPTED',
    { status: accepted.status, appStatus: accepted.json?.data?.status, nextStep: accepted.json?.data?.nextStep },
  );

  // ---- 7. Down-payment context (approved fields) ----
  const dp = await api('/payments/down-payment');
  const dpc = dp.json?.data;
  report(
    'down-payment context',
    dp.status === 200 &&
      dpc?.approvedDownPayment === 3631.2 &&
      dpc?.applicationNumber?.startsWith('LX-EMI-'),
    { status: dp.status, appNumber: dpc?.applicationNumber, approvedLoanAmount: dpc?.approvedLoanAmount, approvedDownPayment: dpc?.approvedDownPayment, payableToday: dpc?.paymentSummary?.totalPayableToday },
  );

  const paymentResult = await performDownPayment();

  // ---- 9. Order confirmation endpoint ----
  const conf = await api(`/payments/order-confirmation?orderNumber=${encodeURIComponent(paymentResult?.orderNumber ?? '')}`);
  const cd = conf.json?.data;
  report(
    'order-confirmation',
    conf.status === 200 && !!cd?.orderNumber && cd?.applicationNumber?.startsWith('LX-EMI-'),
    { status: conf.status, orderNumber: cd?.orderNumber, applicationNumber: cd?.applicationNumber, orderStatus: cd?.orderStatus },
  );

  // ---- 10. Loan current (buildLoanSummary fix) ----
  const loan = await api('/loans/current');
  const ld = loan.json?.data;
  report(
    'loan/current → processingFee & interestRate correct',
    loan.status === 200 && ld?.processingFee > 0 && ld?.processingFee !== ld?.emiAmount && ld?.interestRate > 0,
    { status: loan.status, loanAmount: ld?.loanAmount, processingFee: ld?.processingFee, interestRate: ld?.interestRate, emiAmount: ld?.emiAmount, downPaymentPaid: ld?.downPaymentPaid, applicationNumber: ld?.applicationNumber },
  );

  // ---- 11. Order list (mapOrderRecord fix) ----
  const orders = await api('/orders');
  const firstOrder = orders.json?.data?.items?.[0];
  report(
    'orders → real orderNumber + applicationId + EMI + status',
    orders.status === 200 &&
      !!firstOrder?.orderNumber?.startsWith('LX-ORD-') &&
      !!firstOrder?.applicationId &&
      firstOrder?.paymentType === 'EMI' &&
      ['ORDER_CONFIRMED', 'PROCESSING'].includes(firstOrder?.orderStatus ?? ''),
    { status: orders.status, orderNumber: firstOrder?.orderNumber, applicationId: firstOrder?.applicationId, paymentType: firstOrder?.paymentType, orderStatus: firstOrder?.orderStatus },
  );

  // ---- 12. History (order/loan linked) ----
  const hist = await api('/emi/applications/history');
  const top = hist.json?.data?.items?.[0];
  report(
    'history → order + loan linked on latest app',
    hist.status === 200 && !!top?.orderId && !!top?.orderNumber && !!top?.loanAccountNumber && top?.nextStep === 'VIEW_LOAN',
    { status: hist.status, appNumber: top?.applicationNumber, status2: top?.status, orderId: top?.orderId, orderNumber: top?.orderNumber, loanAccountNumber: top?.loanAccountNumber, nextStep: top?.nextStep },
  );

  // ---- 13. EMI payment ----
  const dashboard = await api('/loans/dashboard');
  const firstPending = dashboard.json?.data?.emiSchedule?.find((s: any) => s.paymentStatus === 'PENDING');
  report('loan/dashboard → schedule', dashboard.status === 200 && !!firstPending, { status: dashboard.status, emis: dashboard.json?.data?.emiSchedule?.length });

  if (firstPending) {
    const emiOrder = await api('/emi-payments/create-order', { method: 'POST', body: { emiId: firstPending.id } });
    const emiRazorpayOrderId = emiOrder.json?.data?.razorpayOrderId;
    report('emi-payment create-order', emiOrder.status === 201 && !!emiRazorpayOrderId, { status: emiOrder.status, emiId: firstPending.id });

    const emiSigned = await api('/emi-payments/dev-bypass-signature', { method: 'POST', body: { razorpayOrderId: emiRazorpayOrderId } });
    if (emiSigned.status === 200 && !!emiSigned.json?.data) {
      const emiVerify = await api('/emi-payments/verify', { method: 'POST', body: { emiId: firstPending.id, ...emiSigned.json?.data } });
      const evd = emiVerify.json?.data;
      report(
        'emi-payment verify → SUCCESS',
        emiVerify.status === 200 && evd?.paymentStatus === 'SUCCESS',
        { status: emiVerify.status, paymentStatus: evd?.paymentStatus, receiptUrl: evd?.receiptUrl },
      );
    } else {
      console.log(
        `\n[SKIP] Dev bypass disabled. Complete the EMI payment manually in Razorpay test mode ` +
        `using order ${emiRazorpayOrderId} (EMI id ${firstPending.id}), then press Enter...`,
      );
      await waitForEnter();
      const emiAfter = await api('/loans/payment-history');
      report('emi-payment manual verify (payment history)', emiAfter.status === 200, {
        status: emiAfter.status,
        count: emiAfter.json?.data?.payments?.length,
      });
    }
  } else {
    report('emi-payment verify (no pending EMI)', false, 'no PENDING emi found');
  }

  // ---- 14. Admin list (customer join fix) ----
  const admin = await api('/admin/emi-applications');
  const adminItem = admin.json?.data?.items?.find((i: any) => i.userId === TEST_USER_ID);
  report(
    'admin list → customer fullName joined',
    admin.status === 200 && !!adminItem?.customer?.fullName && adminItem?.customer?.fullName === 'Flow Test User',
    { status: admin.status, total: admin.json?.data?.total, customer: adminItem?.customer },
  );

  // ---- 15. Payment history + statement ----
  const payHist = await api('/loans/payment-history');
  report('loan/payment-history', payHist.status === 200, { status: payHist.status, count: payHist.json?.data?.payments?.length });
  const statement = await api('/loans/statement');
  report('loan/statement → PDF', statement.status === 200 && !!statement.json?.data?.relativePath, { status: statement.status, file: statement.json?.data?.relativePath });

  console.log(`\n===== RESULT: ${pass} passed, ${fail} failed =====`);
  process.exitCode = fail > 0 ? 1 : 0;
}

async function performDownPayment() {
  // ---- 8. Create payment order (real Razorpay order via API) + verify ----
  const order = await api('/payments/create-order', { method: 'POST', body: {} });
  const razorpayOrderId = order.json?.data?.razorpayOrderId;
  report(
    'create-order → razorpay order',
    order.status === 201 && !!razorpayOrderId,
    { status: order.status, razorpayOrderId, amount: order.json?.data?.amount },
  );

  const signed = await api('/payments/dev-bypass-signature', {
    method: 'POST',
    body: { razorpayOrderId },
  });

  if (signed.status === 200 && !!signed.json?.data) {
    report('dev-bypass-signature', true, signed.json?.data);

    const verify = await api('/payments/verify', { method: 'POST', body: signed.json?.data });
    const vd = verify.json?.data;
    report(
      'verify → payment SUCCESS',
      verify.status === 200 && vd?.paymentStatus === 'SUCCESS',
      { status: verify.status, paymentStatus: vd?.paymentStatus, orderNumber: vd?.orderNumber, loanAccountNumber: vd?.loanAccountNumber },
    );
    report(
      'loan created after down payment',
      !!vd?.loanAccountNumber?.startsWith('LN-'),
      { loanAccountNumber: vd?.loanAccountNumber },
    );
    return vd;
  }

  console.log(
    `\n[SKIP] Dev bypass disabled (PAYMENT_DEV_BYPASS=false). Complete the down payment ` +
    `manually in Razorpay test mode using order ${razorpayOrderId}, then press Enter...`,
  );
  await waitForEnter();
  return await verifyAfterManualPayment(razorpayOrderId);
}

async function verifyAfterManualPayment(razorpayOrderId: string) {
  const orderRes = await fetch(`${BASE}/payments/order-confirmation`, { headers });
  const od = (await orderRes.json().catch(() => null))?.data;
  return {
    orderNumber: od?.orderNumber,
    applicationNumber: od?.applicationNumber,
    orderStatus: od?.orderStatus,
    razorpayOrderId,
  };
}

function waitForEnter(): Promise<void> {
  return new Promise((resolve) => {
    process.stdin.resume();
    process.stdin.once('data', () => {
      process.stdin.pause();
      resolve();
    });
  });
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
