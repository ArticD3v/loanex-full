/**
 * Validates EMI breakdown:
 * Price 119900, DP 10000, Fee 800, Tenure 3
 *
 * Loan Amount     = 109900
 * Monthly EMI     = 36633.33
 * Upfront Payment = 10800
 * Total Payable   = 120700
 */
import {
  calculateEmiBreakdown,
  calculateMonthlyEmi,
} from '../src/modules/loan/service/emi-calculator.service';

const expected = {
  loanAmount: 109900,
  monthlyEmi: 36633.33,
  upfrontPayment: 10800,
  totalPayable: 120700,
};

const result = calculateEmiBreakdown({
  productPrice: 119900,
  downPayment: 10000,
  processingFee: 800,
  tenureMonths: 3,
});

const checks: Array<[string, number, number]> = [
  ['loanAmount', result.loanAmount, expected.loanAmount],
  ['monthlyEmi', result.monthlyEmi, expected.monthlyEmi],
  ['upfrontPayment', result.upfrontPayment, expected.upfrontPayment],
  ['totalPayable', result.totalPayable, expected.totalPayable],
];

let failed = 0;
for (const [name, actual, want] of checks) {
  const ok = actual === want;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: got ${actual}, expected ${want}`);
  if (!ok) failed += 1;
}

// Fee must not inflate monthly EMI
const emiWithoutFee = calculateMonthlyEmi(109900, 0, 3);
if (result.monthlyEmi !== emiWithoutFee) {
  console.log('FAIL monthly EMI incorrectly includes processing fee');
  failed += 1;
} else {
  console.log('PASS processing fee excluded from monthly EMI');
}

// Identity: Total Payable = Upfront + Total EMI
const identity = result.upfrontPayment + result.totalEmi;
if (identity !== result.totalPayable) {
  console.log(`FAIL identity upfront+totalEmi=${identity} !== totalPayable=${result.totalPayable}`);
  failed += 1;
} else {
  console.log('PASS Total Payable = Upfront Payment + Total EMI');
}

process.exit(failed > 0 ? 1 : 0);
