import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { supabase } from './supabase';
import { env } from './env';
import { normalizeOrderRow, sanitizeMirrorPayload } from './mirror-sanitize';

const { appendFileSync } = fs;

const DB_FILE_PATH = path.join(process.cwd(), 'data', 'db.json');

// Ensure directory exists when the filesystem is writable (local/dev).
// On Vercel the app root is read-only; source mode skips local persistence.
const dataDir = path.dirname(DB_FILE_PATH);
try {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
} catch {
  /* ignore EROFS / permission errors on serverless */
}

export interface LocalDatabaseSchema {
  users: any[];
  profiles: any[];
  roles: any[];
  categories: any[];
  sub_categories: any[];
  brands: any[];
  products: any[];
  product_emi_plans: any[];
  cart_items: any[];
  wishlist_items: any[];
  orders: any[];
  order_items: any[];
  emi_details: any[];
  addresses: any[];
  customer_kyc: any[];
  experian_reports: any[];
  digilocker_reports: any[];
  banners: any[];
  notifications: any[];
  reviews: any[];
  dealers: any[];
  suppliers: any[];
  manufacturers: any[];
  warehouses: any[];
  branches: any[];
  pincodes: any[];
  wholesalers: any[];
  delivery_partners: any[];
  delivery_zones: any[];
}

const DEFAULT_INITIAL_DATA: LocalDatabaseSchema = {
  // No seeded demo customer — accounts are created through the real auth flow.
  users: [],
  roles: [
    {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Super Admin',
      description: 'Full access to every module in the admin portal',
      permissions: [
        'products.view', 'products.create', 'products.edit', 'products.delete',
        'orders.view', 'orders.edit', 'orders.delete',
        'customers.view', 'customers.edit', 'customers.delete',
        'emi.view', 'emi.edit', 'emi.delete',
        'fi.view', 'fi.edit', 'fi.delete',
        'users.view', 'users.create', 'users.edit', 'users.delete',
        'roles.view', 'roles.create', 'roles.edit', 'roles.delete',
        'reports.view',
        'masters.view', 'masters.create', 'masters.edit', 'masters.delete',
        'settings.view', 'settings.edit',
        'notifications.view', 'notifications.create', 'notifications.delete',
      ],
      is_system: true,
      isSystem: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '00000000-0000-4000-8000-000000000002',
      name: 'Branch Manager',
      description: 'Run branch operations: orders, EMI approvals and field investigation',
      permissions: [
        'products.view',
        'orders.view', 'orders.edit',
        'customers.view',
        'emi.view', 'emi.edit',
        'fi.view', 'fi.edit',
        'reports.view',
      ],
      is_system: false,
      isSystem: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '00000000-0000-4000-8000-000000000003',
      name: 'Credit Officer',
      description: 'Review and approve credit: EMI applications, loans and payment terms',
      permissions: [
        'products.view',
        'orders.view',
        'customers.view',
        'emi.view', 'emi.edit',
        'fi.view',
        'reports.view',
      ],
      is_system: false,
      isSystem: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '00000000-0000-4000-8000-000000000004',
      name: 'FI Executive',
      description: 'Field investigation: view and update FI cases only',
      permissions: ['customers.view', 'emi.view', 'fi.view', 'fi.edit'],
      is_system: false,
      isSystem: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '00000000-0000-4000-8000-000000000005',
      name: 'Sales Executive',
      description: 'Product catalog: view, add and edit products',
      permissions: ['products.view', 'products.create', 'products.edit', 'customers.view', 'orders.view'],
      is_system: false,
      isSystem: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  profiles: [],
  categories: [
    {
      id: 'a1111111-1111-4111-8111-111111111101',
      name: 'Smartphone',
      description: 'Flagship and mid-range smartphones',
      icon: 'pi pi-mobile',
      color: '#3b82f6',
      bgColor: '#eff6ff',
      status: 'active',
      sortOrder: 1,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'a1111111-1111-4111-8111-111111111102',
      name: 'Laptop',
      description: 'Ultrabooks, gaming and creator laptops',
      icon: 'pi pi-desktop',
      color: '#10b981',
      bgColor: '#ecfdf5',
      status: 'active',
      sortOrder: 2,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'a1111111-1111-4111-8111-111111111103',
      name: 'Smart TV',
      description: '4K and QLED smart televisions',
      icon: 'pi pi-desktop',
      color: '#8b5cf6',
      bgColor: '#f5f3ff',
      status: 'active',
      sortOrder: 3,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'a1111111-1111-4111-8111-111111111104',
      name: 'Refrigerator',
      description: 'Frost-free and inverter refrigerators',
      icon: 'pi pi-home',
      color: '#0ea5e9',
      bgColor: '#f0f9ff',
      status: 'active',
      sortOrder: 4,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'a1111111-1111-4111-8111-111111111105',
      name: 'Washing Machine',
      description: 'Front load and top load washing machines',
      icon: 'pi pi-sync',
      color: '#f59e0b',
      bgColor: '#fffbeb',
      status: 'active',
      sortOrder: 5,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'a1111111-1111-4111-8111-111111111106',
      name: 'Air Conditioner',
      description: 'Inverter split air conditioners',
      icon: 'pi pi-sun',
      color: '#14b8a6',
      bgColor: '#f0fdfa',
      status: 'active',
      sortOrder: 6,
      createdAt: new Date().toISOString(),
    },
  ],
  sub_categories: [],
  brands: [
    { id: 'brand-apple', name: 'Apple', logo: '', status: 'active' },
    { id: 'brand-dell', name: 'Dell', logo: '', status: 'active' },
    { id: 'brand-samsung', name: 'Samsung', logo: '', status: 'active' },
    { id: 'brand-sony', name: 'Sony', logo: '', status: 'active' },
  ],
  products: [],
  product_emi_plans: [],
  cart_items: [],
  wishlist_items: [],
  orders: [],
  order_items: [],
  emi_details: [],
  addresses: [],
  customer_kyc: [],
  experian_reports: [],
  digilocker_reports: [],
  banners: [
    {
      id: 'b1111111-1111-4111-8111-111111111101',
      title: 'Zero Down Payment Festive EMI Offer',
      subtitle: 'Get your dream smartphone at 0% interest with instant digital KYC',
      badgeText: 'HOT OFFER',
      badge_text: 'HOT OFFER',
      image_url: 'https://images.unsplash.com/photo-1695048133142-1a204986d903?w=1200&q=80',
      imageUrl: 'https://images.unsplash.com/photo-1695048133142-1a204986d903?w=1200&q=80',
      link: '/products?category=Smartphone',
      placement: 'home',
      sort_order: 1,
      status: 'active',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'b1111111-1111-4111-8111-111111111102',
      title: 'Laptops & Workstations On Easy EMI',
      subtitle: 'Instant approval in under 2 minutes on top laptop brands',
      badgeText: 'NEW LAUNCH',
      badge_text: 'NEW LAUNCH',
      image_url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1200&q=80',
      imageUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1200&q=80',
      link: '/products?category=Laptop',
      placement: 'home',
      sort_order: 2,
      status: 'active',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'b1111111-1111-4111-8111-111111111110',
      title: 'Exciting Offers. Bigger Benefits.',
      subtitle: 'Unlock exclusive EMI deals, festive discounts, and zero-cost plans on top brands.',
      badgeText: 'Explore Offers',
      badge_text: 'Explore Offers',
      image_url: 'https://images.unsplash.com/photo-1607083206869-4c79793e7914?w=1200&q=80',
      imageUrl: 'https://images.unsplash.com/photo-1607083206869-4c79793e7914?w=1200&q=80',
      link: '/products',
      placement: 'promotional',
      sort_order: 10,
      status: 'active',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'b1111111-1111-4111-8111-111111111120',
      title: 'Smart Home Appliances Festival',
      subtitle: 'TVs, refrigerators, washers and ACs with flexible monthly EMIs',
      badgeText: 'APPLIANCES',
      badge_text: 'APPLIANCES',
      image_url: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=1200&q=80',
      imageUrl: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=1200&q=80',
      link: '/products?category=Smart%20TV',
      placement: 'product',
      sort_order: 20,
      status: 'active',
      createdAt: new Date().toISOString(),
    },
  ],
  notifications: [],
  reviews: [],
  dealers: [
    { id: 'dealer-001', name: 'Dealer X', code: 'DLR-X', status: 'active' },
    { id: 'dealer-002', name: 'Dealer Y', code: 'DLR-Y', status: 'active' },
  ],
  suppliers: [
    { id: 'supplier-001', name: 'Supplier A', status: 'active' },
    { id: 'supplier-002', name: 'Supplier B', status: 'active' },
  ],
  manufacturers: [],
  warehouses: [
    { id: 'warehouse-001', name: 'Main Hub', status: 'active' },
    { id: 'warehouse-002', name: 'City Center', status: 'active' },
    { id: 'warehouse-003', name: 'North Branch', status: 'active' },
  ],
  branches: [
    {
      id: 'branch-001',
      name: 'Mumbai Andheri',
      branchCode: 'MUM-AND',
      city: 'Mumbai',
      state: 'Maharashtra',
      branchManager: 'Anil Sharma',
      mobile: '+91 98000 11111',
      status: 'active',
    },
    {
      id: 'branch-002',
      name: 'Mumbai Borivali',
      branchCode: 'MUM-BOR',
      city: 'Mumbai',
      state: 'Maharashtra',
      branchManager: 'Arun Mehta',
      mobile: '+91 98000 33333',
      status: 'active',
    },
    {
      id: 'branch-003',
      name: 'Pune Kothrud',
      branchCode: 'PUN-KOT',
      city: 'Pune',
      state: 'Maharashtra',
      branchManager: 'Rahul Mehta',
      mobile: '+91 98000 77777',
      status: 'active',
    },
    {
      id: 'branch-004',
      name: 'Bengaluru Koramangala',
      branchCode: 'BLR-KOR',
      city: 'Bengaluru',
      state: 'Karnataka',
      branchManager: 'Priya Nair',
      mobile: '+91 98000 44444',
      status: 'active',
    },
    {
      id: 'branch-005',
      name: 'Delhi Connaught Place',
      branchCode: 'DEL-CP',
      city: 'New Delhi',
      state: 'Delhi',
      branchManager: 'Vikram Singh',
      mobile: '+91 98000 55555',
      status: 'active',
    },
    {
      id: 'branch-006',
      name: 'Hyderabad Banjara Hills',
      branchCode: 'HYD-BH',
      city: 'Hyderabad',
      state: 'Telangana',
      branchManager: 'Neha Kapoor',
      mobile: '+91 98000 22222',
      status: 'active',
    },
    {
      id: 'branch-007',
      name: 'Chennai T Nagar',
      branchCode: 'CHN-TN',
      city: 'Chennai',
      state: 'Tamil Nadu',
      branchManager: 'Sneha Iyer',
      mobile: '+91 98000 66666',
      status: 'active',
    },
    {
      id: 'branch-008',
      name: 'Ahmedabad CG Road',
      branchCode: 'AMD-CG',
      city: 'Ahmedabad',
      state: 'Gujarat',
      branchManager: 'Kavita Desai',
      mobile: '+91 98000 88888',
      status: 'inactive',
    },
  ],
  pincodes: [
    {
      id: 'pincode-400053',
      name: '400053',
      pincode: '400053',
      city: 'Mumbai',
      state: 'Maharashtra',
      branchName: 'Mumbai Andheri',
      status: 'active',
    },
    {
      id: 'pincode-400069',
      name: '400069',
      pincode: '400069',
      city: 'Mumbai',
      state: 'Maharashtra',
      branchName: 'Mumbai Andheri',
      status: 'active',
    },
    {
      id: 'pincode-400092',
      name: '400092',
      pincode: '400092',
      city: 'Mumbai',
      state: 'Maharashtra',
      branchName: 'Mumbai Borivali',
      status: 'active',
    },
    {
      id: 'pincode-411038',
      name: '411038',
      pincode: '411038',
      city: 'Pune',
      state: 'Maharashtra',
      branchName: 'Pune Kothrud',
      status: 'active',
    },
    {
      id: 'pincode-560034',
      name: '560034',
      pincode: '560034',
      city: 'Bengaluru',
      state: 'Karnataka',
      branchName: 'Bengaluru Koramangala',
      status: 'active',
    },
    {
      id: 'pincode-560001',
      name: '560001',
      pincode: '560001',
      city: 'Bengaluru',
      state: 'Karnataka',
      branchName: 'Bengaluru Koramangala',
      status: 'active',
    },
    {
      id: 'pincode-110001',
      name: '110001',
      pincode: '110001',
      city: 'New Delhi',
      state: 'Delhi',
      branchName: 'Delhi Connaught Place',
      status: 'active',
    },
    {
      id: 'pincode-500034',
      name: '500034',
      pincode: '500034',
      city: 'Hyderabad',
      state: 'Telangana',
      branchName: 'Hyderabad Banjara Hills',
      status: 'active',
    },
    {
      id: 'pincode-600017',
      name: '600017',
      pincode: '600017',
      city: 'Chennai',
      state: 'Tamil Nadu',
      branchName: 'Chennai T Nagar',
      status: 'active',
    },
    {
      id: 'pincode-380009',
      name: '380009',
      pincode: '380009',
      city: 'Ahmedabad',
      state: 'Gujarat',
      branchName: 'Ahmedabad CG Road',
      status: 'inactive',
    },
  ],
  wholesalers: [
    { id: 'wholesaler-001', name: 'Wholesale 1', status: 'active' },
    { id: 'wholesaler-002', name: 'Wholesale 2', status: 'active' },
  ],
  delivery_partners: [
    { id: 'partner-001', name: 'BlueDart', status: 'active', serviceableZones: [] },
    { id: 'partner-002', name: 'Delhivery', status: 'active', serviceableZones: [] },
  ],
  delivery_zones: [
    { id: 'zone-001', name: 'Zone 1', status: 'active' },
    { id: 'zone-002', name: 'Zone 2', status: 'active' },
  ],
};

/**
 * Collections hydrated on cold start in SUPABASE_SYNC_MODE=source.
 * Fixed whitelist — OpenAPI enumeration pulls ~58 paths (including casing
 * duplicates) and sequential selects measured at ~19s locally.
 */
const HYDRATE_COLLECTIONS = Array.from(
  new Set([
    ...Object.keys(DEFAULT_INITIAL_DATA),
    'otps',
    'refresh_tokens',
    'audit_log',
    'supportTicket',
    'support_tickets',
    'emi_applications',
    'emiApplication',
    'emiDetail',
    'paymentTransaction',
    'orderTracking',
    'panVerification',
    'customerVerification',
    'notification',
    'loanAccount',
    'loan_accounts',
    'emi_schedules',
    'aadhaarVerification',
    'bankVerification',
    'userAddress',
    'mobileVerification',
    'autopayMandate',
    'fi_cases',
    'bank_accounts',
    'bankVerification',
    'customerVerification',
    'panVerification',
    'roles',
  ]),
);

const HYDRATE_CONCURRENCY = 8;

function cloneValue<T>(value: T): T {
  return value == null ? value : (JSON.parse(JSON.stringify(value)) as T);
}

function cloneRows<T>(rows: T[]): T[] {
  if (rows.length === 0) return [];
  return JSON.parse(JSON.stringify(rows)) as T[];
}

/** Catalog collections re-fetched on a throttle so direct Supabase inserts
 * (e.g. a product added via the Supabase dashboard) show up without a restart. */
const CATALOG_REFRESH_COLLECTIONS = [
  'products',
  'product_emi_plans',
  'roles',
  // Users too — staff/customer accounts created or edited directly in the
  // Supabase dashboard surface in the admin portal without a process restart.
  'users',
  'categories',
  'sub_categories',
  'brands',
  'dealers',
  'suppliers',
  'manufacturers',
  'warehouses',
  'branches',
  'pincodes',
  'wholesalers',
  'delivery_partners',
  'delivery_zones',
  'banners',
];
const CATALOG_REFRESH_TTL_MS = 15_000;

class LocalDatabaseEngine {
  private data: LocalDatabaseSchema;
  private readonly sourceMode =
    env.NODE_ENV === 'production' ? true : env.SUPABASE_SYNC_MODE === 'source';
  private readonly warned = new Set<string>();
  private readonly lastRefreshAt = new Map<string, number>();
  public readonly ready: Promise<void>;
  /** Last cold-start hydrate duration in ms (0 if not yet measured). */
  public lastHydrateMs = 0;

  constructor() {
    this.data = this.loadData();
    this.ready = this.sourceMode ? this.hydrateFromSupabase() : Promise.resolve();
  }

  private loadData(): LocalDatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        // Merge missing collections if schema updated
        return { ...DEFAULT_INITIAL_DATA, ...parsed };
      }
    } catch (e) {
      console.error('[JSON DB] Error reading DB file, re-initializing...', e);
    }
    this.saveData(DEFAULT_INITIAL_DATA);
    return DEFAULT_INITIAL_DATA;
  }

  public saveData(dataToSave?: LocalDatabaseSchema): void {
    if (this.sourceMode) return;
    try {
      const data = dataToSave || this.data;
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('[JSON DB] Error saving data to db.json:', e);
    }
  }

  /**
   * SUPABASE_SYNC_MODE=source: replace local collections from Supabase at boot.
   * Parallel whitelist hydrate — tables that do not exist (PGRST205) keep local data.
   */
  private async hydrateFromSupabase(): Promise<void> {
    const started = Date.now();
    const names = HYDRATE_COLLECTIONS;
    let loaded = 0;
    let skipped = 0;
    let failed = 0;
    let rows = 0;

    const hydrateOne = async (name: string): Promise<void> => {
      try {
        const { data, error } = await supabase.from(name).select('*').limit(10000);
        if (error) {
          if (
            String(error.code || '').includes('PGRST205') ||
            /does not exist|could not find/i.test(String(error.message))
          ) {
            skipped += 1;
            return;
          }
          failed += 1;
          console.error(`[Supabase] hydrate "${name}" failed:`, error.message);
          return;
        }
        if (Array.isArray(data)) {
          (this.data as any)[name] =
            name === 'orders' ? data.map((row) => normalizeOrderRow(row)) : data;
          loaded += 1;
          rows += data.length;
        }
      } catch (e) {
        failed += 1;
        console.error(`[Supabase] hydrate "${name}" threw:`, e);
      }
    };

    for (let i = 0; i < names.length; i += HYDRATE_CONCURRENCY) {
      const batch = names.slice(i, i + HYDRATE_CONCURRENCY);
      await Promise.all(batch.map((name) => hydrateOne(name)));
    }

    this.lastHydrateMs = Date.now() - started;
    console.info(
      `[Supabase] hydrated ${loaded}/${names.length} collections in ${this.lastHydrateMs}ms ` +
        `(rows=${rows}, skipped=${skipped}, failed=${failed}, concurrency=${HYDRATE_CONCURRENCY})`,
    );
  }

  /**
   * Re-fetch catalog collections from Supabase on a throttle so records added
   * directly in the Supabase dashboard (products, categories, banners, …) surface
   * in the API without a process restart. No-op outside source mode.
   */
  public async refreshCatalogThrottled(): Promise<void> {
    if (!this.sourceMode) return;
    const now = Date.now();
    const due = CATALOG_REFRESH_COLLECTIONS.filter(
      (name) => (this.lastRefreshAt.get(name) ?? 0) + CATALOG_REFRESH_TTL_MS <= now,
    );
    if (due.length === 0) return;

    await Promise.all(
      due.map(async (name) => {
        try {
          const { data, error } = await supabase.from(name).select('*').limit(10000);
          if (error) return;
          if (Array.isArray(data)) {
            (this.data as any)[name] = data;
            this.lastRefreshAt.set(name, now);
          }
        } catch (e) {
          console.error(`[Supabase] catalog refresh "${name}" failed:`, e);
        }
      }),
    );
  }

  /** Force one full refresh pass of the catalog collections (bypasses throttle). */
  public async refreshCatalogNow(): Promise<void> {
    this.lastRefreshAt.clear();
    await this.refreshCatalogThrottled();
  }

  private logMirrorError(name: string, operation: string, message: string): void {
    const line = `[${new Date().toISOString()}] ${operation} "${name}" failed: ${message}`;
    if (!this.warned.has(name)) {
      this.warned.add(name);
      console.error(`[Supabase] ${line}`);
    }
    try {
      appendFileSync('mirror-errors.log', line + '\n');
    } catch {
      /* ignore */
    }
  }

  private async mirrorInsert(name: string, item: any): Promise<void> {
    const payload = sanitizeMirrorPayload(name, item, 'insert');
    const looksLikeMissingColumn = (message: string) =>
      /PGRST204|could not find the column|could not find the '[^']+' column|column .* does not exist/i.test(message);
    const extractMissingColumn = (message: string): string | null => {
      const postgrest = /Could not find the '([^']+)' column/i.exec(message);
      if (postgrest) return postgrest[1];
      const pg = /column "?([^"]+)"? of relation/i.exec(message);
      return pg ? pg[1] : null;
    };

    try {
      // PostgREST rejects the whole insert if ANY key is an unknown column.
      // Self-heal: strip unknown keys one at a time and retry (e.g. users.role_id
      // before the RBAC migration, or emi_schedules.paidAmount), so the row still
      // persists and a cold start does not lose it.
      let attemptPayload = payload;
      let { error } = await supabase.from(name).upsert([attemptPayload], {
        onConflict: 'id',
      });

      let iterations = 0;
      while (error && looksLikeMissingColumn(error.message) && iterations < 8) {
        const missing = extractMissingColumn(error.message);
        if (!missing || attemptPayload[missing] === undefined) break;
        console.error(
          `[Supabase] insert "${name}" missing column "${missing}" — retrying without it. ` +
            `Apply the matching migration (see backend/emi-payment-durability.sql) to persist this field.`,
        );
        attemptPayload = { ...attemptPayload };
        delete attemptPayload[missing];
        ({ error } = await supabase.from(name).upsert([attemptPayload], {
          onConflict: 'id',
        }));
        iterations += 1;
      }

      if (error) {
        // Table without a unique "id" constraint: fall back to a plain insert.
        const { error: fallbackError } = await supabase.from(name).insert([attemptPayload]);
        if (fallbackError) {
          this.logMirrorError(
            name,
            'insert',
            `${fallbackError.message} | keys: ${Object.keys(attemptPayload).join(',')}`,
          );
          throw fallbackError;
        }
      }
    } catch (e) {
      this.logMirrorError(name, 'insert', String(e));
      throw e;
    }
  }

  private async mirrorUpdate(name: string, where: Record<string, any>, data: any): Promise<void> {
    const payload = sanitizeMirrorPayload(name, data, 'update');
    const looksLikeMissingColumn = (message: string) =>
      /PGRST204|could not find the column|could not find the '[^']+' column|column .* does not exist/i.test(message);

    // PostgREST rejects an update if ANY key is an unknown column — dropping
    // just the offending key keeps the rest of the write alive (e.g. an EMI
    // payment still persists `paymentStatus = PAID` even when the schema lacks
    // `paidAmount`/`lastPaymentDate`, so a cold start does not revert it).
    const extractMissingColumn = (message: string): string | null => {
      const postgrest = /Could not find the '([^']+)' column/i.exec(message);
      if (postgrest) return postgrest[1];
      const pg = /column "?([^"]+)"? of relation/i.exec(message);
      return pg ? pg[1] : null;
    };

    const run = (payloadToSend: Record<string, any>) => {
      let query = supabase.from(name).update(payloadToSend);
      for (const [key, value] of Object.entries(where)) {
        if (value === undefined) continue;
        query = query.eq(key, value);
      }
      return query;
    };

    try {
      let attemptPayload = payload;
      let attempt = await run(attemptPayload);
      let { error } = attempt;

      // Self-heal: strip missing columns (users.role_id, emi_schedules
      // paidAmount/transactionId, loanAccount.lastPaymentDate, …) one at a
      // time and retry — a single unknown key makes PostgREST reject the whole
      // update, silently reverting e.g. an EMI payment on the next cold start.
      let iterations = 0;
      while (error && looksLikeMissingColumn(error.message) && iterations < 8) {
        const missing = extractMissingColumn(error.message);
        if (!missing || attemptPayload[missing] === undefined) break;
        console.error(
          `[Supabase] update "${name}" missing column "${missing}" — retrying without it. ` +
            `Apply the matching migration (see backend/emi-payment-durability.sql) to persist this field.`,
        );
        attemptPayload = { ...attemptPayload };
        delete attemptPayload[missing];
        attempt = await run(attemptPayload);
        error = attempt.error;
        iterations += 1;
      }

      if (error) {
        this.logMirrorError(
          name,
          'update',
          `${error.message} | payload keys: ${Object.keys(attemptPayload).join(',')} | payload: ${JSON.stringify(attemptPayload).slice(0, 2000)}`,
        );
        throw error;
      }
    } catch (e) {
      this.logMirrorError(name, 'update', String(e));
      throw e;
    }
  }

  private async mirrorDelete(name: string, where: Record<string, any>): Promise<void> {
    try {
      let query = supabase.from(name).delete();
      for (const [key, value] of Object.entries(where)) {
        if (value === undefined) continue;
        query = query.eq(key, value);
      }
      const { error } = await query;
      if (error) this.logMirrorError(name, 'delete', error.message);
    } catch (e) {
      this.logMirrorError(name, 'delete', String(e));
    }
  }

  public getCollection(name: string): any[] {
    if (!this.data[name as keyof LocalDatabaseSchema]) {
      (this.data as any)[name] = [];
    }
    return (this.data as any)[name];
  }

  public findMany(collectionName: string, where?: Record<string, any>, options?: { orderBy?: string; take?: number }): any[] {
    const list = this.getCollection(collectionName);
    let result = list;

    if (where && Object.keys(where).length > 0) {
      result = list.filter((item) => {
        return Object.keys(where).every((key) => {
          if (where[key] === undefined) return true;
          return item[key] === where[key];
        });
      });
    }

    if (options?.take && options.take > 0) {
      result = result.slice(0, options.take);
    }

    return cloneRows(result);
  }

  public findOne(collectionName: string, where: Record<string, any>): any | null {
    const results = this.findMany(collectionName, where, { take: 1 });
    return results[0] || null;
  }

  public insert(collectionName: string, itemData: any): any {
    const collection = this.getCollection(collectionName);
    // Always use UUID so serverless mirror/hydrate keeps the same id across instances.
    // The old `id_${Date.now()}_…` format was stripped by sanitize (UUID-only) and
    // caused checkout 404s after cold start ("Product not found").
    const id = itemData.id || randomUUID();
    const now = new Date().toISOString();

    const newItem = {
      id,
      ...itemData,
      createdAt: itemData.createdAt || now,
      updatedAt: now,
    };

    collection.push(newItem);
    this.saveData();
    // Fire-and-forget for non-auth tables; auth uses insertAwaited.
    void this.mirrorInsert(collectionName, newItem).catch(() => {
      /* logged in mirrorInsert */
    });
    return cloneValue(newItem);
  }

  /**
   * Insert and wait for Supabase mirror — required for auth durability
   * (password hash must survive cold starts / other serverless instances).
   */
  public async insertAwaited(collectionName: string, itemData: any): Promise<any> {
    const collection = this.getCollection(collectionName);
    const id = itemData.id || randomUUID();
    const now = new Date().toISOString();

    const newItem = {
      id,
      ...itemData,
      createdAt: itemData.createdAt || now,
      updatedAt: now,
    };

    collection.push(newItem);
    this.saveData();
    await this.mirrorInsert(collectionName, newItem);
    return cloneValue(newItem);
  }

  public update(collectionName: string, where: Record<string, any>, updateData: any): any {
    const collection = this.getCollection(collectionName);
    const index = collection.findIndex((item) => {
      return Object.keys(where).every((key) => item[key] === where[key]);
    });

    if (index === -1) {
      return null;
    }

    const updatedItem = {
      ...collection[index],
      ...updateData,
      updatedAt: new Date().toISOString(),
    };

    collection[index] = updatedItem;
    this.saveData();
    void this.mirrorUpdate(collectionName, where, {
      ...updateData,
      updatedAt: updatedItem.updatedAt,
    }).catch(() => {
      /* logged in mirrorUpdate */
    });
    return cloneValue(updatedItem);
  }

  public async updateAwaited(
    collectionName: string,
    where: Record<string, any>,
    updateData: any,
  ): Promise<any> {
    const collection = this.getCollection(collectionName);
    const index = collection.findIndex((item) => {
      return Object.keys(where).every((key) => item[key] === where[key]);
    });

    if (index === -1) {
      return null;
    }

    const updatedItem = {
      ...collection[index],
      ...updateData,
      updatedAt: new Date().toISOString(),
    };

    collection[index] = updatedItem;
    this.saveData();
    await this.mirrorUpdate(collectionName, where, {
      ...updateData,
      updatedAt: updatedItem.updatedAt,
    });
    return cloneValue(updatedItem);
  }

  /**
   * Update a row in memory + local file WITHOUT mirroring to Supabase.
   *
   * Used by paths that own their own awaited Supabase write (e.g. the durable
   * inventory decrement), so the change is persisted exactly once instead of
   * being mirrored fire-and-forget (which can be lost on a serverless freeze
   * and would double-write when the durable path already wrote it).
   */
  public updateLocal(collectionName: string, where: Record<string, any>, updateData: any): any {
    const collection = this.getCollection(collectionName);
    const index = collection.findIndex((item) => {
      return Object.keys(where).every((key) => item[key] === where[key]);
    });

    if (index === -1) {
      return null;
    }

    const updatedItem = {
      ...collection[index],
      ...updateData,
      updatedAt: new Date().toISOString(),
    };

    collection[index] = updatedItem;
    this.saveData();
    return cloneValue(updatedItem);
  }

  public upsert(collectionName: string, where: Record<string, any>, updateData: any, createData: any): any {
    const existing = this.findOne(collectionName, where);
    if (existing) {
      return this.update(collectionName, where, updateData);
    }
    return this.insert(collectionName, createData || { ...where, ...updateData });
  }

  public delete(collectionName: string, where: Record<string, any>): any {
    const collection = this.getCollection(collectionName);
    const index = collection.findIndex((item) => {
      return Object.keys(where).every((key) => item[key] === where[key]);
    });

    if (index === -1) return null;

    const [removed] = collection.splice(index, 1);
    this.saveData();
    void this.mirrorDelete(collectionName, where);
    return cloneValue(removed);
  }

  public async deleteAwaited(collectionName: string, where: Record<string, any>): Promise<any> {
    const collection = this.getCollection(collectionName);
    const index = collection.findIndex((item) => {
      return Object.keys(where).every((key) => item[key] === where[key]);
    });

    if (index === -1) return null;

    const [removed] = collection.splice(index, 1);
    this.saveData();
    await this.mirrorDelete(collectionName, where);
    return cloneValue(removed);
  }

  public deleteMany(collectionName: string, where?: Record<string, any>): number {
    const collection = this.getCollection(collectionName);
    if (!where || Object.keys(where).length === 0) {
      const count = collection.length;
      (this.data as any)[collectionName] = [];
      this.saveData();
      void this.mirrorDelete(collectionName, {});
      return count;
    }

    const initialCount = collection.length;
    (this.data as any)[collectionName] = collection.filter((item) => {
      return !Object.keys(where).every((key) => item[key] === where[key]);
    });
    const removedCount = initialCount - (this.data as any)[collectionName].length;
    this.saveData();
    void this.mirrorDelete(collectionName, where);
    return removedCount;
  }

  public count(collectionName: string, where?: Record<string, any>): number {
    const list = this.getCollection(collectionName);
    if (!where || Object.keys(where).length === 0) {
      return list.length;
    }
    return list.filter((item) =>
      Object.keys(where).every((key) => {
        if (where[key] === undefined) return true;
        return item[key] === where[key];
      }),
    ).length;
  }
}

export const jsonDb = new LocalDatabaseEngine();
