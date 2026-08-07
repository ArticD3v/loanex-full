#!/usr/bin/env node
/**
 * Generates a Supabase/PostgreSQL DDL + seed script.
 *
 *  - Drops + recreates every table used by the LoanEx backend
 *    (collections present in db.json + collections referenced in code).
 *  - Seeds each table from `data/data/db.json`.
 *
 * Run from `loanexweb-main/backend`:
 *   node scripts/generate-supabase-sql.mjs  (writes ../supabase-recreated-tables.sql)
 */
import fs from 'node:fs';
import path from 'node:path';

const SEED_FILE = process.argv[2] || path.join('data', 'data', 'db.json');
const OUT_FILE = process.argv[3] || path.join('..', 'supabase-recreated-tables.sql');

const db = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));

function escapeLiteral(value) {
  if (value === null || value === undefined) return 'NULL';
  switch (typeof value) {
    case 'number':
      return Number.isFinite(value) ? String(value) : 'NULL';
    case 'boolean':
      return value ? 'true' : 'false';
    case 'object': {
      const json = JSON.stringify(value);
      return `'${json.replace(/'/g, "''")}'::jsonb`;
    }
    default: {
      const s = String(value);
      return `'${s.replace(/'/g, "''")}'`;
    }
  }
}

function inferType(values) {
  const present = values.filter((v) => v !== null && v !== undefined);
  if (present.length === 0) return 'text';
  if (present.every((v) => typeof v === 'boolean')) return 'boolean';
  if (present.every((v) => Number.isInteger(v))) return 'bigint';
  if (present.every((v) => typeof v === 'number')) return 'double precision';
  if (present.some((v) => Array.isArray(v) || (v && typeof v === 'object'))) return 'jsonb';
  return 'text';
}

function collectColumns(records) {
  const cols = new Map();
  for (const rec of records || []) {
    for (const [k, v] of Object.entries(rec || {})) {
      if (!cols.has(k)) cols.set(k, []);
      cols.get(k).push(v);
    }
  }
  const out = {};
  for (const [k, values] of cols) out[k] = inferType(values);
  return out;
}

function escapeIdent(row, key) {
  return escapeLiteral(row ? row[key] : undefined);
}

function tableSql(name, columns, records) {
  const entries = Object.entries(columns);
  if (!columns.id) entries.unshift(['id', 'text']);

  const colDefs = entries.map(([k, t]) => `  "${k}" ${t}`).join(',\n');
  const values = (records || []).map((rec) => {
    const row = entries.map(([k]) => escapeIdent(rec, k));
    return `  (${row.join(', ')})`;
  });

  const insert = values.length
    ? `\nINSERT INTO public."${name}" (${entries.map(([k]) => `"${k}"`).join(', ')})\nVALUES\n${values.join(',\n')};`
    : '';

  const ids = (records || []).map((r) => r && r.id).filter((i) => i !== undefined && i !== null);
  const uniqueIds = new Set(ids).size === ids.length;
  const pk = uniqueIds && ids.length > 0
    ? `,\n  CONSTRAINT "${name}_pkey" PRIMARY KEY ("id")`
    : '';

  const pkNote = uniqueIds && ids.length > 0 ? '' : '-- NOTE: no PRIMARY KEY (db.json contained duplicate/none ids)';

  return `
-- =========================================================
-- Table: public."${name}" (${records ? records.length : 0} rows)
-- =========================================================
${pkNote ? pkNote + '\n' : ''}DROP TABLE IF EXISTS public."${name}" CASCADE;

CREATE TABLE public."${name}" (
${colDefs}${pk}
);${insert}

CREATE INDEX IF NOT EXISTS "${name}_id_idx" ON public."${name}" ("id");

ALTER TABLE public."${name}" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."${name}" TO anon, authenticated, service_role;
`;
}

// Collections referenced by backend code but missing from db.json.
const CODE_COLLECTIONS = {
  aadhaarVerification: [
    ['userId', 'text'], ['aadhaarNumberMasked', 'text'], ['aadhaarHash', 'text'],
    ['otp', 'text'], ['otpExpiresAt', 'text'], ['resendCount', 'bigint'],
    ['attemptCount', 'bigint'], ['verificationStatus', 'text'], ['verifiedAt', 'text'],
    ['createdAt', 'text'], ['updatedAt', 'text'],
  ],
  mobileVerification: [
    ['userId', 'text'], ['mobile', 'text'], ['otp', 'text'], ['expiresAt', 'text'],
    ['isUsed', 'boolean'], ['isVerified', 'boolean'], ['purpose', 'text'],
    ['createdAt', 'text'], ['updatedAt', 'text'],
  ],
  customerVerification: [
    ['userId', 'text'], ['mobileVerified', 'boolean'], ['aadhaarVerified', 'boolean'],
    ['panVerified', 'boolean'], ['bankVerified', 'boolean'], ['verificationStatus', 'text'],
    ['createdAt', 'text'], ['updatedAt', 'text'],
  ],
  panVerification: [
    ['userId', 'text'], ['panNumberMasked', 'text'], ['panHash', 'text'], ['fullName', 'text'],
    ['dateOfBirth', 'text'], ['status', 'text'], ['verifiedAt', 'text'], ['createdAt', 'text'],
  ],
  bankVerification: [
    ['userId', 'text'], ['accountHolderName', 'text'], ['bankName', 'text'],
    ['accountNumberMasked', 'text'], ['accountNumberHash', 'text'], ['ifscCode', 'text'],
    ['accountType', 'text'], ['status', 'text'], ['verifiedAt', 'text'], ['createdAt', 'text'],
  ],
  autopayMandate: [
    ['userId', 'text'], ['loanAccountId', 'text'], ['provider', 'text'], ['mandateId', 'text'],
    ['mandateReference', 'text'], ['paymentMethod', 'text'], ['bankName', 'text'], ['upiId', 'text'],
    ['maximumDebitAmount', 'double precision'], ['frequency', 'text'], ['nextDebitDate', 'text'],
    ['status', 'text'], ['createdAt', 'text'], ['updatedAt', 'text'],
  ],
  loan_accounts: [
    ['userId', 'text'], ['applicationId', 'text'], ['loanAccountNumber', 'text'],
    ['productId', 'text'], ['loanAmount', 'double precision'], ['interestRate', 'double precision'],
    ['processingFee', 'double precision'], ['loanTenure', 'bigint'], ['emiAmount', 'double precision'],
    ['totalInterest', 'double precision'], ['totalPayable', 'double precision'],
    ['outstandingAmount', 'double precision'], ['loanStatus', 'text'],
    ['createdAt', 'text'], ['updatedAt', 'text'],
  ],
  loanAccount: [
    ['userId', 'text'], ['applicationId', 'text'], ['loanAccountNumber', 'text'],
    ['productId', 'text'], ['loanAmount', 'double precision'], ['interestRate', 'double precision'],
    ['processingFee', 'double precision'], ['loanTenure', 'bigint'], ['emiAmount', 'double precision'],
    ['totalInterest', 'double precision'], ['totalPayable', 'double precision'],
    ['outstandingAmount', 'double precision'], ['loanStatus', 'text'],
    ['createdAt', 'text'], ['updatedAt', 'text'],
  ],
  emiDetail: [
    ['orderId', 'text'], ['userId', 'text'], ['loanAccountId', 'text'], ['emiNumber', 'bigint'],
    ['dueDate', 'text'], ['principalAmount', 'double precision'], ['interestAmount', 'double precision'],
    ['emiAmount', 'double precision'], ['remainingBalance', 'double precision'],
    ['paymentStatus', 'text'], ['createdAt', 'text'], ['updatedAt', 'text'],
  ],
  emiApplication: [
    ['applicationNumber', 'text'], ['userId', 'text'], ['productId', 'text'], ['productName', 'text'],
    ['sellingPrice', 'double precision'], ['requestedAmount', 'double precision'],
    ['requestedDownPayment', 'double precision'], ['requestedTenure', 'bigint'],
    ['estimatedMonthlyEmi', 'double precision'], ['status', 'text'],
    ['createdAt', 'text'], ['updatedAt', 'text'],
  ],
  notification: [
    ['userId', 'text'], ['title', 'text'], ['message', 'text'], ['type', 'text'],
    ['category', 'text'], ['priority', 'text'], ['metadata', 'jsonb'], ['isRead', 'boolean'],
    ['archived', 'boolean'], ['createdAt', 'text'], ['updatedAt', 'text'],
  ],
  supportTicket: [
    ['userId', 'text'], ['ticketNumber', 'text'], ['issueType', 'text'], ['subject', 'text'],
    ['description', 'text'], ['attachment', 'text'], ['status', 'text'],
    ['createdAt', 'text'], ['updatedAt', 'text'],
  ],
  paymentTransaction: [
    ['applicationId', 'text'], ['userId', 'text'], ['razorpayOrderId', 'text'], ['amount', 'double precision'],
    ['currency', 'text'], ['paymentStatus', 'text'], ['paymentType', 'text'], ['orderNumber', 'text'],
    ['createdAt', 'text'], ['updatedAt', 'text'],
  ],
  orderTracking: [
    ['orderId', 'text'], ['status', 'text'], ['location', 'text'], ['note', 'text'],
    ['trackedAt', 'text'], ['createdAt', 'text'],
  ],
  userAddress: [
    ['userId', 'text'], ['profileId', 'text'], ['type', 'text'], ['address', 'text'],
    ['isDefault', 'boolean'], ['createdAt', 'text'], ['updatedAt', 'text'],
  ],
};

// Collections present in db.json but empty there; columns curated from code.
const EMPTY_DB_COLLECTIONS = {
  order_items: [
    ['orderId', 'text'], ['productId', 'text'], ['quantity', 'bigint'], ['price', 'double precision'],
    ['createdAt', 'text'],
  ],
  notifications: [
    ['userId', 'text'], ['title', 'text'], ['message', 'text'], ['type', 'text'], ['category', 'text'],
    ['priority', 'text'], ['metadata', 'jsonb'], ['isRead', 'boolean'], ['archived', 'boolean'],
    ['createdAt', 'text'], ['updatedAt', 'text'],
  ],
  cart_items: [['user_id', 'text'], ['product_id', 'text'], ['quantity', 'bigint'], ['created_at', 'text'], ['updatedAt', 'text']],
  wishlist_items: [['user_id', 'text'], ['product_id', 'text'], ['created_at', 'text'], ['updated_at', 'text'], ['updatedAt', 'text']],
  reviews: [['userId', 'text'], ['productId', 'text'], ['rating', 'bigint'], ['review', 'text'], ['userName', 'text'], ['title', 'text'], ['createdAt', 'text'], ['updatedAt', 'text']],
  sub_categories: [['name', 'text'], ['categoryId', 'text'], ['status', 'text'], ['createdAt', 'text']],
  experian_reports: [['userId', 'text'], ['profileId', 'text'], ['report', 'jsonb'], ['bureauScore', 'bigint'], ['createdAt', 'text']],
  dealers: [['dealerCode', 'text'], ['dealerName', 'text'], ['mobile', 'text'], ['email', 'text'], ['status', 'text']],
  suppliers: [['name', 'text'], ['contact', 'text'], ['email', 'text'], ['status', 'text']],
  manufacturers: [['name', 'text'], ['logo', 'text'], ['status', 'text']],
  warehouses: [['name', 'text'], ['location', 'text'], ['status', 'text']],
  product_reviews: [['productId', 'text'], ['userId', 'text'], ['rating', 'bigint'], ['comment', 'text'], ['createdAt', 'text']],
  bank_accounts: [['userId', 'text'], ['bankName', 'text'], ['accountNumberMasked', 'text'], ['ifscCode', 'text'], ['createdAt', 'text']],
};

const sections = [];
sections.push(`-- ============================================================
-- LoanEx -> Supabase recreated schema + full seed
-- Generated: ${new Date().toISOString()}
-- Source:    ${SEED_FILE}
--
-- Drops and recreates every table, then re-inserts all records from
-- db.json. Run the whole file in the Supabase SQL editor.
-- ============================================================
SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';

`);

for (const name of Object.keys(db)) {
  const records = db[name] || [];
  if (records.length > 0) {
    sections.push(tableSql(name, collectColumns(records), records));
  } else if (EMPTY_DB_COLLECTIONS[name]) {
    const columns = Object.fromEntries(EMPTY_DB_COLLECTIONS[name]);
    sections.push(tableSql(name, columns, []));
  } else if (CODE_COLLECTIONS[name]) {
    const columns = Object.fromEntries(CODE_COLLECTIONS[name]);
    sections.push(tableSql(name, columns, []));
  } else {
    sections.push(tableSql(name, { data: 'jsonb' }, []));
  }
}

for (const name of Object.keys(CODE_COLLECTIONS)) {
  if (Object.prototype.hasOwnProperty.call(db, name)) continue; // handled above
  const columns = Object.fromEntries(CODE_COLLECTIONS[name]);
  sections.push(tableSql(name, columns, []));
}

const out = sections.join('\n');
fs.writeFileSync(OUT_FILE, out, 'utf-8');
console.log(`Wrote ${OUT_FILE} (${out.length.toLocaleString()} bytes, ${Object.keys(db).length + Object.keys(CODE_COLLECTIONS).length - 0} tables)`);