/**
 * Validates EMI breakdown for 0% and 12.5% reducing-balance paths.
 */
import {
  buildEmiSchedule,
  calculateEmiBreakdown,
  calculateMonthlyEmi,
  DEFAULT_ANNUAL_INTEREST_RATE_PERCENT,
  round2,
} from '../src/modules/loan/service/emi-calculator.service';

let failed = 0;

function check(name: string, actual: number, want: number) {
  const ok = actual === want;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: got ${actual}, expected ${want}`);
  if (!ok) failed += 1;
}

// --- 0% path (fee excluded from principal) ---
const zeroRate = calculateEmiBreakdown({
  productPrice: 119900,
  downPayment: 10000,
  processingFee: 800,
  tenureMonths: 3,
  annualInterestRatePercent: 0,
});

check('0% loanAmount', zeroRate.loanAmount, 109900);
check('0% monthlyEmi', zeroRate.monthlyEmi, 36633.33);
check('0% upfrontPayment', zeroRate.upfrontPayment, 10800);
check('0% totalPayable', zeroRate.totalPayable, 120700);

const emiWithoutFee = calculateMonthlyEmi(109900, 0, 3);
if (zeroRate.monthlyEmi !== emiWithoutFee) {
  console.log('FAIL monthly EMI incorrectly includes processing fee');
  failed += 1;
} else {
  console.log('PASS processing fee excluded from monthly EMI');
}

const identity = zeroRate.upfrontPayment + zeroRate.totalEmi;
if (identity !== zeroRate.totalPayable) {
  console.log(`FAIL identity upfront+totalEmi=${identity} !== totalPayable=${zeroRate.totalPayable}`);
  failed += 1;
} else {
  console.log('PASS Total Payable = Upfront Payment + Total EMI');
}

// --- 12.5% reducing-balance (user My EMI example) ---
const principal = 69999;
const rate = DEFAULT_ANNUAL_INTEREST_RATE_PERCENT;
const tenure = 3;
const properEmi = calculateMonthlyEmi(principal, rate, tenure);
check('12.5% monthlyEmi', properEmi, 23820.78);

const startDate = new Date('2026-08-08T00:00:00.000Z');
const schedule = buildEmiSchedule({
  principal,
  annualRatePercent: rate,
  tenureMonths: tenure,
  startDate,
});

check('12.5% schedule emiAmount', schedule.emiAmount, 23820.78);
check('12.5% totalInterest', schedule.totalInterest, 1463.36);
check('12.5% totalPayable', schedule.totalPayable, 71462.36);

const emiAmounts = schedule.rows.map((r) => r.emiAmount);
const firstTwoEqual = emiAmounts[0] === emiAmounts[1];
const lastClose = Math.abs(emiAmounts[2] - emiAmounts[0]) < 1;
if (!firstTwoEqual || !lastClose) {
  console.log(`FAIL equal EMI expected, got ${emiAmounts.join(', ')}`);
  failed += 1;
} else {
  console.log('PASS schedule EMIs are equal (last may differ by < ₹1 for residual)');
}

// Forced 0%-style EMI under 12.5% must NOT be used by createLoanAccount anymore;
// document the bad outcome for regression awareness.
const bad = buildEmiSchedule({
  principal,
  annualRatePercent: rate,
  tenureMonths: tenure,
  startDate,
  emiAmount: round2(principal / tenure),
});
if (Math.abs(bad.rows[2].emiAmount - bad.emiAmount) > 100) {
  console.log(
    `PASS bad forced-EMI detected (last=${bad.rows[2].emiAmount} vs regular=${bad.emiAmount})`,
  );
} else {
  console.log('FAIL expected balloon last EMI when forcing 0%-style amount');
  failed += 1;
}

process.exit(failed > 0 ? 1 : 0);