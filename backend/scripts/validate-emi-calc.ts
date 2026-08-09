/**
 * Validates the client Excel EMI model (0% interest, fee in principal).
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

// --- Client Excel example ---
// Sale 30000, DP 12000, Service 2000, Tenure 9
const excel = calculateEmiBreakdown({
  productPrice: 30000,
  downPayment: 12000,
  processingFee: 2000,
  tenureMonths: 9,
});

check('Excel EMI principal', excel.loanAmount, 20000);
check('Excel monthlyEmi', excel.monthlyEmi, 2222.22);
check('Excel interest', excel.totalInterest, 0);
check('Excel upfront (= DP)', excel.upfrontPayment, 12000);
check('Excel totalPayable', excel.totalPayable, 32000);

const excelIdentity = round2(excel.upfrontPayment + excel.totalEmi);
if (excelIdentity !== excel.totalPayable) {
  console.log(`FAIL Excel identity ${excelIdentity} !== ${excel.totalPayable}`);
  failed += 1;
} else {
  console.log('PASS Excel identity: DP + Total EMI = Total Payable');
}

// Display rounding (nearest rupee) matches Excel UI ₹2,222
check('Excel display EMI', Math.round(excel.monthlyEmi), 2222);

// --- Original product plan 1 ---
const plan1 = calculateEmiBreakdown({
  productPrice: 99999,
  downPayment: 15000,
  processingFee: 600,
  tenureMonths: 1,
});
check('Product 1m principal', plan1.loanAmount, 85599);
check('Product 1m monthlyEmi', plan1.monthlyEmi, 85599);
check('Product 1m totalPayable', plan1.totalPayable, 100599);

// --- Original product plan 2 ---
const plan2 = calculateEmiBreakdown({
  productPrice: 99999,
  downPayment: 30000,
  processingFee: 20,
  tenureMonths: 3,
});
check('Product 3m principal', plan2.loanAmount, 70019);
check('Product 3m monthlyEmi', plan2.monthlyEmi, 23339.67);
check('Product 3m display EMI', Math.round(plan2.monthlyEmi), 23340);
check('Product 3m totalPayable', plan2.totalPayable, 100019);

// Fee must be inside principal (not Price − DP alone)
if (plan1.loanAmount === 84999) {
  console.log('FAIL fee excluded from EMI principal');
  failed += 1;
} else {
  console.log('PASS processing fee included in EMI principal');
}

// Legacy reducing-balance helper still available for loan schedules
const legacyEmi = calculateMonthlyEmi(69999, DEFAULT_ANNUAL_INTEREST_RATE_PERCENT, 3);
check('Legacy 12.5% helper monthlyEmi', legacyEmi, 23820.78);

const startDate = new Date('2026-08-08T00:00:00.000Z');
const schedule = buildEmiSchedule({
  principal: 69999,
  annualRatePercent: DEFAULT_ANNUAL_INTEREST_RATE_PERCENT,
  tenureMonths: 3,
  startDate,
});
check('Legacy schedule emiAmount', schedule.emiAmount, 23820.78);

process.exit(failed > 0 ? 1 : 0);
