/**
 * Regression test: two EMI applications created back-to-back must receive
 * UNIQUE application numbers (LX-EMI-YYYYMMDD-XXXX) and both rows must
 * persist to MongoDB with those numbers.
 *
 * It drives the exact production seam: the service's number generator
 * (maxApplicationSequenceToday + 1) followed by the repository insert —
 * no mocks, no fake store. If the generator ever regresses to a count-based
 * or non-refreshing scheme (duplicate numbers), or the Mongo mirror write
 * stops persisting, this test fails.
 *
 * Run: npx tsx scripts/test-application-number-unique.ts
 * (also wired as `npm run test:app-numbers`)
 */
import assert from 'node:assert';
import dns from 'node:dns';
import { config } from 'dotenv';
import * as path from 'node:path';
import { closeMongo, getCollection } from '../src/config/mongo';
import { emiApplicationRepository } from '../src/modules/emi-application/repository/emi-application.repository';
import { emiApplicationService } from '../src/modules/emi-application/service/emi-application.service';

// Some dev resolvers refuse SRV lookups (querySrv ECONNREFUSED); pin public
// resolvers so this test connects to Atlas reliably regardless of the local
// network's DNS configuration. Only affects this test process.
dns.setServers(['8.8.8.8', '1.1.1.1']);
config({ path: path.resolve(process.cwd(), '.env') });

const NUMBER_RE = /^LX-EMI-\d{8}-(\d{4})$/;

async function waitFor(
  predicate: () => Promise<boolean>,
  timeoutMs = 10_000,
  intervalMs = 200,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for the Mongo mirror write`);
}

function applicationInput(userId: string, productId: string, productName: string) {
  return {
    userId,
    productId,
    productName,
    sellingPrice: 100_000,
    requestedAmount: 80_000,
    requestedDownPayment: 20_000,
    requestedTenure: 6,
    estimatedMonthlyEmi: 14_286,
    interestRate: 12.5,
  };
}

async function main(): Promise<void> {
  const marker = `regression-${Date.now()}`;
  let appA: any;
  let appB: any;

  try {
    // ── create application A ─────────────────────────────────────────────
    const numA = await (emiApplicationService as any).generateApplicationNumber();
    assert.match(numA, NUMBER_RE, `application A number has unexpected format: ${numA}`);
    appA = emiApplicationRepository.create({
      applicationNumber: numA,
      ...applicationInput(`${marker}-a`, 'regression-product-a', 'Regression Product A'),
    });

    // Await durability of A (the repository mirror is fire-and-forget) —
    // models "create A completed" before create B starts, like two sequential
    // HTTP requests.
    const emiColl = await getCollection('emi_applications');
    await waitFor(async () => (await emiColl.countDocuments({ id: appA.id })) === 1);

    // ── create application B back-to-back ────────────────────────────────
    const numB = await (emiApplicationService as any).generateApplicationNumber();
    assert.match(numB, NUMBER_RE, `application B number has unexpected format: ${numB}`);
    appB = emiApplicationRepository.create({
      applicationNumber: numB,
      ...applicationInput(`${marker}-b`, 'regression-product-b', 'Regression Product B'),
    });

    await waitFor(async () =>
      (await emiColl.countDocuments({ id: { $in: [appA.id, appB.id] } })) === 2,
    );

    // ── assertions ───────────────────────────────────────────────────────
    assert.notStrictEqual(
      numA,
      numB,
      `DUPLICATE application number generated for back-to-back creates: ${numA}`,
    );
    assert.notStrictEqual(appA.id, appB.id, 'inserted rows share the same id');

    // Same-day creates must be strictly sequential (max + 1).
    const prefixA = numA.slice(0, -4);
    if (numB.startsWith(prefixA)) {
      const seqA = Number(NUMBER_RE.exec(numA)![1]);
      const seqB = Number(NUMBER_RE.exec(numB)![1]);
      assert.strictEqual(
        seqB,
        seqA + 1,
        `sequence did not increment: ${numA} -> ${numB}`,
      );
    }

    // Persistence — the numbers must be exactly what landed in Mongo.
    const docs = await emiColl.find({ id: { $in: [appA.id, appB.id] } }).toArray();
    const docA = docs.find((d: any) => d.id === appA.id);
    const docB = docs.find((d: any) => d.id === appB.id);
    assert.ok(docA, `application A (${appA.id}) missing from Mongo`);
    assert.ok(docB, `application B (${appB.id}) missing from Mongo`);
    assert.strictEqual(
      (docA as any).applicationNumber,
      numA,
      `Mongo stored a different number for A: ${(docA as any).applicationNumber}`,
    );
    assert.strictEqual(
      (docB as any).applicationNumber,
      numB,
      `Mongo stored a different number for B: ${(docB as any).applicationNumber}`,
    );

    // Uniqueness in Mongo — exactly one document per number.
    const withNumbers = await emiColl.countDocuments({
      applicationNumber: { $in: [numA, numB] },
    });
    assert.strictEqual(
      withNumbers,
      2,
      `expected exactly 2 docs across ${numA} / ${numB}, found ${withNumbers}`,
    );

    console.log(
      `PASS: two back-to-back applications got unique numbers (${numA}, ${numB}) and both persist to Mongo`,
    );
  } finally {
    // Best-effort cleanup — never leave regression rows behind.
    const emiColl = await getCollection('emi_applications').catch(() => null);
    if (emiColl && (appA || appB)) {
      const ids = [appA?.id, appB?.id].filter(Boolean);
      await emiColl.deleteMany({ id: { $in: ids } });
    }
  }
}

main().then(
  async () => {
    await closeMongo().catch(() => undefined);
    process.exitCode = 0;
  },
  async (error) => {
    console.error('FAIL:', error instanceof Error ? error.message : error);
    await closeMongo().catch(() => undefined);
    process.exitCode = 1;
  },
);
