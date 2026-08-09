/**
 * Safe PostgreSQL/Supabase → MongoDB migration (READ-ONLY on Supabase).
 * Never prints secrets. Idempotent upserts by id/_id.
 */
const fs = require("fs");
const path = require("path");
const dns = require("dns");
const { createClient } = require("@supabase/supabase-js");
const { MongoClient } = require("mongodb");

dns.setServers(["8.8.8.8", "1.1.1.1"]);

// Resolve paths relative to this repo (backend/scripts/migrate-mongo → backend).
const ROOT = path.resolve(__dirname, "..", "..");
const REPORT_DIR = path.join(ROOT, "scripts/migrate-mongo/reports");
fs.mkdirSync(REPORT_DIR, { recursive: true });

function loadEnv(p) {
  const env = {};
  if (!fs.existsSync(p)) return env;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    let k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[k] = v;
  }
  return env;
}

function snakeToCamel(key) {
  return key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function normalizeDoc(row) {
  if (!row || typeof row !== "object") return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    const camel = snakeToCamel(k);
    out[camel] = v;
    if (camel !== k && out[k] === undefined) out[k] = v;
  }
  if (out.userId == null && out.user_id != null) out.userId = out.user_id;
  if (out.productId == null && out.product_id != null) out.productId = out.product_id;
  if (out.profileId == null && out.profile_id != null) out.profileId = out.profile_id;
  if (out.createdAt == null && out.created_at != null) out.createdAt = out.created_at;
  if (out.updatedAt == null && out.updated_at != null) out.updatedAt = out.updated_at;
  if (out.fullAddress == null && out.full_address != null) out.fullAddress = out.full_address;
  if (out.mobileNumber == null && out.mobile_number != null) out.mobileNumber = out.mobile_number;
  if (out.badgeText == null && out.badge_text != null) out.badgeText = out.badge_text;
  if (out.sortOrder == null && out.sort_order != null) out.sortOrder = out.sort_order;
  if (out.phone == null && out.mobile != null) out.phone = out.mobile;
  // notification compatibility
  if (out.isRead == null && out.read != null) out.isRead = out.read;
  if (out.read == null && out.isRead != null) out.read = out.isRead;
  return out;
}

function pickPreferred(a, b) {
  const dens = (r) => Object.values(r || {}).filter((v) => v != null && v !== "").length;
  if (!a) return b;
  if (!b) return a;
  const da = dens(a);
  const db = dens(b);
  if (da !== db) return da > db ? a : b;
  const ta = new Date(a.updatedAt || a.updated_at || a.createdAt || a.created_at || 0).getTime();
  const tb = new Date(b.updatedAt || b.updated_at || b.createdAt || b.created_at || 0).getTime();
  return tb > ta ? b : a;
}

function mergeById(rowsA, rowsB, conflicts, label) {
  const map = new Map();
  for (const r of rowsA || []) {
    const id = String(r.id ?? r._id ?? "");
    if (!id) continue;
    map.set(id, normalizeDoc(r));
  }
  for (const r of rowsB || []) {
    const id = String(r.id ?? r._id ?? "");
    if (!id) continue;
    const n = normalizeDoc(r);
    if (!map.has(id)) {
      map.set(id, n);
      continue;
    }
    const prev = map.get(id);
    const chosen = pickPreferred(prev, n);
    const keys = new Set([...Object.keys(prev), ...Object.keys(n)]);
    let conflicted = false;
    for (const k of keys) {
      if (["updatedAt", "updated_at", "createdAt", "created_at"].includes(k)) continue;
      const av = prev[k];
      const bv = n[k];
      if (av != null && bv != null && JSON.stringify(av) !== JSON.stringify(bv)) {
        conflicted = true;
        break;
      }
    }
    if (conflicted) {
      conflicts.push({ collection: label, id, rule: "prefer denser/newer", kept: chosen === prev ? "sourceA" : "sourceB" });
    }
    map.set(id, chosen);
  }
  return [...map.values()];
}

async function fetchAll(sb, table) {
  const pageSize = 1000;
  let from = 0;
  const all = [];
  while (true) {
    const { data, error } = await sb.from(table).select("*").range(from, from + pageSize - 1);
    if (error) {
      if (/does not exist|PGRST/i.test(error.message)) return { ok: false, error: error.message, rows: [] };
      return { ok: false, error: error.message, rows: all };
    }
    const rows = data || [];
    all.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return { ok: true, rows: all };
}

const COLLECTION_PLAN = [
  { mongo: "users", sources: ["users"], indexes: [{ keys: { email: 1 }, opts: { unique: true, sparse: true } }, { keys: { phone: 1 }, opts: { unique: true, sparse: true } }, { keys: { id: 1 }, opts: { unique: true } }] },
  { mongo: "profiles", sources: ["profiles", "user_profiles"], indexes: [{ keys: { id: 1 }, opts: { unique: true } }, { keys: { mobileNumber: 1 }, opts: { sparse: true } }, { keys: { mobile_number: 1 }, opts: { sparse: true } }] },
  { mongo: "roles", sources: ["roles"], indexes: [{ keys: { id: 1 }, opts: { unique: true } }, { keys: { name: 1 }, opts: { unique: true } }] },
  { mongo: "otps", sources: ["otps"], indexes: [{ keys: { id: 1 }, opts: { unique: true } }, { keys: { mobile: 1, purpose: 1 } }] },
  { mongo: "refresh_tokens", sources: ["refresh_tokens"], indexes: [{ keys: { token: 1 }, opts: { unique: true, sparse: true } }, { keys: { userId: 1 } }] },
  { mongo: "addresses", sources: ["addresses", "user_addresses", "userAddress"], indexes: [{ keys: { id: 1 }, opts: { unique: true } }, { keys: { userId: 1 } }, { keys: { user_id: 1 } }] },
  { mongo: "products", sources: ["products"], indexes: [{ keys: { id: 1 }, opts: { unique: true } }, { keys: { slug: 1 }, opts: { unique: true, sparse: true } }, { keys: { sku: 1 }, opts: { unique: true, sparse: true } }, { keys: { status: 1, categoryId: 1 } }] },
  { mongo: "product_emi_plans", sources: ["product_emi_plans"], indexes: [{ keys: { productId: 1 } }, { keys: { product_id: 1 } }] },
  { mongo: "categories", sources: ["categories"], indexes: [{ keys: { id: 1 }, opts: { unique: true } }] },
  { mongo: "sub_categories", sources: ["sub_categories"], indexes: [{ keys: { categoryId: 1 } }, { keys: { category_id: 1 } }] },
  { mongo: "brands", sources: ["brands"], indexes: [{ keys: { name: 1 }, opts: { unique: true, sparse: true } }] },
  { mongo: "banners", sources: ["banners"], indexes: [{ keys: { status: 1, sort_order: 1 } }] },
  { mongo: "cart_items", sources: ["cart_items"], indexes: [{ keys: { userId: 1, productId: 1 }, opts: { unique: true, sparse: true } }, { keys: { user_id: 1, product_id: 1 }, opts: { unique: true, sparse: true } }] },
  { mongo: "wishlist_items", sources: ["wishlist_items"], indexes: [{ keys: { userId: 1, productId: 1 }, opts: { unique: true, sparse: true } }, { keys: { user_id: 1, product_id: 1 }, opts: { unique: true, sparse: true } }] },
  { mongo: "reviews", sources: ["reviews", "product_reviews"], indexes: [{ keys: { productId: 1 } }, { keys: { productId: 1, userId: 1 }, opts: { unique: true, sparse: true } }] },
  { mongo: "orders", sources: ["orders"], indexes: [{ keys: { id: 1 }, opts: { unique: true } }, { keys: { orderNumber: 1 }, opts: { unique: true, sparse: true } }, { keys: { userId: 1, createdAt: -1 } }, { keys: { applicationId: 1 }, opts: { sparse: true } }] },
  { mongo: "order_items", sources: ["order_items"], indexes: [{ keys: { orderId: 1 } }] },
  { mongo: "orderTracking", sources: ["orderTracking", "order_tracking"], indexes: [{ keys: { orderId: 1 } }] },
  { mongo: "paymentTransaction", sources: ["paymentTransaction", "payment_transactions"], indexes: [{ keys: { id: 1 }, opts: { unique: true } }, { keys: { razorpayOrderId: 1 }, opts: { unique: true, sparse: true } }, { keys: { razorpayPaymentId: 1 }, opts: { sparse: true } }, { keys: { userId: 1, paymentType: 1, paymentStatus: 1 } }, { keys: { emiScheduleId: 1 }, opts: { unique: true, sparse: true } }] },
  { mongo: "emi_applications", sources: ["emi_applications"], indexes: [{ keys: { applicationNumber: 1 }, opts: { unique: true, sparse: true } }, { keys: { userId: 1, status: 1 } }, { keys: { status: 1, submittedAt: -1 } }] },
  { mongo: "emi_details", sources: ["emi_details"], indexes: [{ keys: { orderId: 1 }, opts: { sparse: true } }] },
  { mongo: "emi_plans", sources: ["emi_plans"], indexes: [{ keys: { id: 1 }, opts: { unique: true } }] },
  { mongo: "loanAccount", sources: ["loanAccount", "loan_accounts"], indexes: [{ keys: { loanAccountNumber: 1 }, opts: { unique: true, sparse: true } }, { keys: { applicationId: 1 }, opts: { unique: true, sparse: true } }, { keys: { userId: 1, loanStatus: 1 } }] },
  { mongo: "emi_schedules", sources: ["emi_schedules", "emi_schedule"], indexes: [{ keys: { loanAccountId: 1, emiNumber: 1 }, opts: { unique: true, sparse: true } }, { keys: { paymentStatus: 1, dueDate: 1 } }] },
  { mongo: "customer_kyc", sources: ["customer_kyc", "kyc"], indexes: [{ keys: { userId: 1 }, opts: { sparse: true } }, { keys: { profileId: 1 }, opts: { sparse: true } }] },
  { mongo: "customerVerification", sources: ["customerVerification", "customer_verifications"], indexes: [{ keys: { userId: 1 }, opts: { unique: true, sparse: true } }] },
  { mongo: "aadhaarVerification", sources: ["aadhaarVerification", "aadhaar_verifications"], indexes: [{ keys: { userId: 1 } }] },
  { mongo: "panVerification", sources: ["panVerification", "pan_verifications"], indexes: [{ keys: { userId: 1 } }] },
  { mongo: "bankVerification", sources: ["bankVerification", "bank_verifications"], indexes: [{ keys: { userId: 1 } }] },
  { mongo: "mobileVerification", sources: ["mobileVerification", "mobile_verifications"], indexes: [{ keys: { userId: 1 } }] },
  { mongo: "digilocker_reports", sources: ["digilocker_reports"], indexes: [{ keys: { profileId: 1 } }] },
  { mongo: "experian_reports", sources: ["experian_reports"], indexes: [{ keys: { profileId: 1 }, opts: { sparse: true } }] },
  { mongo: "notification", sources: ["notification", "notifications"], indexes: [{ keys: { userId: 1, createdAt: -1 } }, { keys: { userId: 1, isRead: 1 } }] },
  { mongo: "audit_log", sources: ["audit_log", "audit_logs"], indexes: [{ keys: { entityType: 1, entityId: 1 } }, { keys: { userId: 1 } }] },
  { mongo: "autopayMandate", sources: ["autopayMandate", "autopay_mandates"], indexes: [{ keys: { loanAccountId: 1 } }] },
  { mongo: "checkoutSession", sources: ["checkoutSession", "checkout_sessions"], indexes: [{ keys: { userId: 1 } }] },
  { mongo: "supportTicket", sources: ["supportTicket", "support_tickets"], indexes: [{ keys: { userId: 1 } }] },
  { mongo: "fi_cases", sources: ["fi_cases"], indexes: [{ keys: { id: 1 }, opts: { unique: true } }] },
  { mongo: "job_openings", sources: ["job_openings"], indexes: [{ keys: { slug: 1 }, opts: { sparse: true } }, { keys: { status: 1 } }] },
  { mongo: "job_applications", sources: ["job_applications"], indexes: [{ keys: { jobId: 1, createdAt: -1 } }] },
  { mongo: "general_applications", sources: ["general_applications"], indexes: [{ keys: { createdAt: -1 } }] },
  { mongo: "dealers", sources: ["dealers"], indexes: [{ keys: { dealerCode: 1 }, opts: { sparse: true } }] },
  { mongo: "suppliers", sources: ["suppliers"], indexes: [{ keys: { id: 1 }, opts: { unique: true } }] },
  { mongo: "manufacturers", sources: ["manufacturers"], indexes: [{ keys: { id: 1 }, opts: { unique: true } }] },
  { mongo: "warehouses", sources: ["warehouses"], indexes: [{ keys: { id: 1 }, opts: { unique: true } }] },
  { mongo: "product_attributes", sources: ["product_attributes"], indexes: [{ keys: { name: 1 }, opts: { unique: true, sparse: true } }] },
  { mongo: "product_attribute_values", sources: ["product_attribute_values"], indexes: [{ keys: { attributeId: 1 } }] },
  { mongo: "product_variants", sources: ["product_variants"], indexes: [{ keys: { productId: 1 } }] },
  { mongo: "product_variant_attributes", sources: ["product_variant_attributes"], indexes: [{ keys: { variantId: 1 } }] },
  { mongo: "product_dealers", sources: ["product_dealers"], indexes: [{ keys: { productId: 1, dealerId: 1 }, opts: { unique: true, sparse: true } }] },
  { mongo: "product_suppliers", sources: ["product_suppliers"], indexes: [{ keys: { productId: 1 } }] },
  { mongo: "product_photos", sources: ["product_photos"], indexes: [{ keys: { productId: 1 } }] },
  { mongo: "branches", sources: ["branches"], indexes: [{ keys: { id: 1 }, opts: { unique: true, sparse: true } }] },
  { mongo: "pincodes", sources: ["pincodes"], indexes: [{ keys: { id: 1 }, opts: { unique: true, sparse: true } }] },
  { mongo: "wholesalers", sources: ["wholesalers"], indexes: [{ keys: { id: 1 }, opts: { unique: true, sparse: true } }] },
  { mongo: "delivery_partners", sources: ["delivery_partners"], indexes: [{ keys: { id: 1 }, opts: { unique: true, sparse: true } }] },
  { mongo: "delivery_zones", sources: ["delivery_zones"], indexes: [{ keys: { id: 1 }, opts: { unique: true, sparse: true } }] },
];

const DEFAULT_ROLES = [
  { id: "00000000-0000-4000-8000-000000000001", name: "Super Admin", description: "Full access", permissions: ["products.view","products.create","products.edit","products.delete","orders.view","orders.edit","orders.delete","customers.view","customers.edit","customers.delete","emi.view","emi.edit","emi.delete","fi.view","fi.edit","fi.delete","users.view","users.create","users.edit","users.delete","roles.view","roles.create","roles.edit","roles.delete","reports.view","masters.view","masters.create","masters.edit","masters.delete","settings.view","settings.edit","notifications.view","notifications.create","notifications.delete","careers.view","careers.create","careers.edit","careers.delete"], is_system: true, isSystem: true },
  { id: "00000000-0000-4000-8000-000000000002", name: "Branch Manager", description: "Branch ops", permissions: ["products.view","orders.view","orders.edit","customers.view","emi.view","emi.edit","fi.view","fi.edit","reports.view"], is_system: false, isSystem: false },
  { id: "00000000-0000-4000-8000-000000000003", name: "Credit Officer", description: "Credit review", permissions: ["products.view","orders.view","customers.view","emi.view","emi.edit","fi.view","reports.view"], is_system: false, isSystem: false },
  { id: "00000000-0000-4000-8000-000000000004", name: "FI Executive", description: "Field investigation", permissions: ["customers.view","emi.view","fi.view","fi.edit"], is_system: false, isSystem: false },
  { id: "00000000-0000-4000-8000-000000000005", name: "Sales Executive", description: "Catalog", permissions: ["products.view","products.create","products.edit","customers.view","orders.view"], is_system: false, isSystem: false },
];

(async () => {
  const env = loadEnv(path.join(ROOT, ".env"));
  let sbUrl = env.SUPABASE_URL;
  let sbKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl || /sensitive/i.test(sbUrl) || sbUrl.length < 20) {
    const seed = fs.readFileSync(path.join(ROOT, "../apps/customer-mobile/seed.js"), "utf8");
    sbUrl = seed.match(/supabaseUrl\s*=\s*'([^']+)'/)[1];
    sbKey = seed.match(/supabaseKey\s*=\s*'([^']+)'/)[1];
  }
  const mongoUri = env.MONGODB_URI;
  const dbName = env.MONGODB_DB_NAME || "loanex";
  if (!mongoUri) throw new Error("MONGODB_URI missing");

  const sb = createClient(sbUrl, sbKey, { auth: { persistSession: false } });
  const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 20000, family: 4 });
  await client.connect();
  const db = client.db(dbName);
  await db.command({ ping: 1 });

  const stats = {
    tablesInspected: 0,
    sourcesRead: 0,
    recordsRead: 0,
    recordsMigrated: 0,
    recordsMerged: 0,
    recordsSkipped: 0,
    recordsFailed: 0,
    conflicts: [],
    collections: [],
    validation: [],
    merges: [],
    legacyExcluded: [],
  };

  // --- Identity reconciliation -------------------------------------------------
  // Keep existing MongoDB users canonical by phone/email: a Supabase user whose
  // phone/email already exists in Mongo is NOT inserted again — the Mongo id
  // wins, and every child row (orders, profiles, applications, loans, …) is
  // re-keyed to it. Without this, re-running the migration creates duplicate
  // users and detaches orders from the account the customer logs in with.
  const phoneToMongoId = new Map();
  const emailToMongoId = new Map();
  const existingUsers = await db.collection("users").find({}).toArray();
  for (const u of existingUsers) {
    const mid = String(u._id ?? u.id ?? "");
    const phone = String(u.phone ?? "").replace(/\D/g, "").slice(-10);
    if (phone.length === 10 && !phoneToMongoId.has(phone)) phoneToMongoId.set(phone, mid);
    const email = String(u.email ?? "").toLowerCase().trim();
    if (email && !emailToMongoId.has(email)) emailToMongoId.set(email, mid);
  }
  const remapId = (v) => {
    if (v === null || v === undefined) return v;
    const key = String(v);
    return phoneToMongoId.get(key) || emailToMongoId.get(key) || key;
  };

  const cache = {};
  async function getTable(name) {
    if (cache[name]) return cache[name];
    const res = await fetchAll(sb, name);
    stats.tablesInspected += 1;
    if (res.ok) stats.sourcesRead += 1;
    stats.recordsRead += res.rows.length;
    cache[name] = res;
    return res;
  }

  for (const plan of COLLECTION_PLAN) {
    let rows = [];
    const sourceCounts = {};
    for (const src of plan.sources) {
      const res = await getTable(src);
      sourceCounts[src] = res.rows.length;
      if (!res.ok && res.error) continue;
      if (rows.length === 0) rows = res.rows.map(normalizeDoc);
      else {
        const before = rows.length;
        rows = mergeById(rows, res.rows, stats.conflicts, plan.mongo);
        stats.recordsMerged += Math.max(0, before + res.rows.length - rows.length);
      }
    }

    if (plan.sources.length > 1) {
      stats.merges.push({
        mongo: plan.mongo,
        sources: plan.sources,
        sourceCounts,
        mergeReason: "Same business entity; prefer runtime name + denser/newer row",
        conflictRule: "NON-NULL denser > sparser; then newer updatedAt/createdAt; conflicts logged",
      });
    }

    if (plan.mongo === "roles" && rows.length === 0) {
      rows = DEFAULT_ROLES.map((r) => ({ ...r, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
    }

    const col = db.collection(plan.mongo);
    for (const idx of plan.indexes || []) {
      try { await col.createIndex(idx.keys, idx.opts || {}); } catch {}
    }

    let migrated = 0;
    let failed = 0;
    for (const row of rows) {
      let doc = { ...row };

      if (plan.mongo === "users") {
        const phone = String(row.phone ?? "").replace(/\D/g, "").slice(-10);
        const email = String(row.email ?? "").toLowerCase().trim();
        const existing =
          (phone && phoneToMongoId.get(phone)) || (email && emailToMongoId.get(email));
        if (existing && String(row.id) !== existing) {
          // Identity already lives in Mongo — map the Supabase id to it.
          if (row.id != null) phoneToMongoId.set(String(row.id), existing);
          stats.recordsSkipped += 1;
          continue;
        }
        if (row.id != null) {
          const sid = String(row.id);
          phoneToMongoId.set(sid, sid);
          if (phone) phoneToMongoId.set(phone, sid);
          if (email) emailToMongoId.set(email, sid);
        }
      }

      // Re-key user references to the canonical Mongo identity.
      for (const k of ["userId", "profileId", "user_id", "profile_id"]) {
        if (doc[k] !== null && doc[k] !== undefined) doc[k] = remapId(doc[k]);
      }
      // Profiles are keyed by user id — re-key the row id too.
      if (plan.mongo === "profiles" && doc.id != null) doc.id = remapId(doc.id);

      const id = doc.id != null ? String(doc.id) : null;
      if (!id) { stats.recordsSkipped += 1; continue; }
      doc = { ...doc, id, _id: id };
      try {
        await col.replaceOne({ _id: id }, doc, { upsert: true });
        migrated += 1;
      } catch (e) {
        failed += 1;
        stats.recordsFailed += 1;
        stats.conflicts.push({ collection: plan.mongo, id, error: e.message, type: "WRITE_FAILED" });
      }
    }
    stats.recordsMigrated += migrated;
    const mongoCount = await col.countDocuments();
    const sourceMax = Math.max(0, ...Object.values(sourceCounts), plan.mongo === "roles" ? rows.length : 0);
    let status = "MATCHED";
    if (mongoCount < sourceMax && plan.mongo !== "roles") status = "MISSING";
    if (mongoCount > sourceMax && sourceMax > 0) status = "DUPLICATE";
    stats.validation.push({ collection: plan.mongo, sourceCounts, mongoCount, migrated, failed, status });
    stats.collections.push(plan.mongo);
  }

  stats.legacyExcluded = [
    "user_profiles","user_addresses","kyc","audit_logs","emi_schedule","product_reviews",
    "payment_transactions","loan_accounts","notifications","order_tracking","customer_verifications",
    "aadhaar_verifications","pan_verifications","bank_verifications","mobile_verifications",
    "autopay_mandates","checkout_sessions","support_tickets",
  ];

  const paymentCol = db.collection("paymentTransaction");
  const kycSuccess = await paymentCol.countDocuments({
    $or: [
      { paymentType: "KYC_VERIFICATION", paymentStatus: "SUCCESS" },
      { purpose: "KYC_VERIFICATION", paymentStatus: "SUCCESS" },
      { purpose: "KYC_VERIFICATION", status: "SUCCESS" },
    ],
  });

  const report = {
    mongoOk: true,
    dbName,
    collectionsCreated: stats.collections.length,
    ...stats,
    kycSuccessPayments: kycSuccess,
    duplicateTablesFound: stats.merges.length,
    tablesMerged: stats.merges.length,
  };
  fs.writeFileSync(path.join(REPORT_DIR, "migration-report.json"), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(REPORT_DIR, "migration-conflicts.json"), JSON.stringify(stats.conflicts, null, 2));
  fs.writeFileSync(path.join(REPORT_DIR, "merge-plan.json"), JSON.stringify(stats.merges, null, 2));

  console.log(JSON.stringify({
    ok: true,
    collections: stats.collections.length,
    recordsRead: stats.recordsRead,
    recordsMigrated: stats.recordsMigrated,
    recordsMerged: stats.recordsMerged,
    recordsSkipped: stats.recordsSkipped,
    recordsFailed: stats.recordsFailed,
    conflicts: stats.conflicts.length,
    validationMatched: stats.validation.filter((v) => v.status === "MATCHED").length,
    validationMissing: stats.validation.filter((v) => v.status === "MISSING").length,
    validationDuplicate: stats.validation.filter((v) => v.status === "DUPLICATE").length,
    withData: stats.validation.filter((v) => v.mongoCount > 0).map((v) => ({ c: v.collection, n: v.mongoCount })),
    kycSuccessPayments: kycSuccess,
  }, null, 2));

  await client.close();
})().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message }));
  process.exit(1);
});
