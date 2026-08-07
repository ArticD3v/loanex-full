import { jsonDb } from './json-db';

export const pool = {
  async query(text: string, params?: any[]) {
    return query(text, params);
  },
  async connect() {
    return {
      query: (t: string, p?: any[]) => query(t, p),
      release: () => {},
    };
  },
  on: () => {},
  end: async () => {},
};

const TABLE_NAME_MAP: Record<string, string> = {
  product: 'products',
  category: 'categories',
  subCategory: 'sub_categories',
  brand: 'brands',
  dealer: 'dealers',
  supplier: 'suppliers',
  manufacturer: 'manufacturers',
  warehouse: 'warehouses',
  user: 'users',
  profile: 'profiles',
  address: 'addresses',
  order: 'orders',
  orderItem: 'order_items',
  cartItem: 'cart_items',
  wishlistItem: 'wishlist_items',
  productEmiPlan: 'product_emi_plans',
  emiPlan: 'product_emi_plans',
  emiDetail: 'emi_details',
  emiApplication: 'emi_details',
  customerKyc: 'customer_kyc',
  experianReport: 'experian_reports',
  digilockerReport: 'digilocker_reports',
  banner: 'banners',
  notification: 'notifications',
  review: 'reviews',
};

function resolveCollectionName(name: string): string {
  return TABLE_NAME_MAP[name] || name;
}

export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // Handle simple COUNT queries
  if (lower.startsWith('select count(')) {
    const match = trimmed.match(/from\s+["']?([a-zA-Z0-9_]+)["']?/i);
    const tableName = match ? resolveCollectionName(match[1]) : 'products';
    const total = jsonDb.count(tableName);
    return { rows: [{ count: total }] as any, rowCount: 1 };
  }

  // Handle SELECT queries
  if (lower.startsWith('select')) {
    const match = trimmed.match(/from\s+["']?([a-zA-Z0-9_]+)["']?/i);
    const tableName = match ? resolveCollectionName(match[1]) : 'products';
    const where: Record<string, any> = {};

    if (params && params.length > 0) {
      if (lower.includes('where "id" =') || lower.includes('where id =') || lower.includes('where p.id =')) {
        where.id = params[0];
      } else if (lower.includes('where "productid" =') || lower.includes('where productid =') || lower.includes('where "productId" =')) {
        where.productId = params[0];
      } else if (lower.includes('where "slug" =') || lower.includes('where slug =') || lower.includes('where p.slug =')) {
        where.slug = params[0];
      } else if (lower.includes('where "mobile_number" =') || lower.includes('where mobile_number =')) {
        where.mobile_number = params[0];
      } else if (lower.includes('where "phone" =') || lower.includes('where phone =')) {
        where.phone = params[0];
      } else if (lower.includes('where "name" =') || lower.includes('where name =')) {
        where.name = params[0];
      }
    }

    const rows = jsonDb.findMany(tableName, where);
    return { rows: rows as T[], rowCount: rows.length };
  }

  // Handle INSERT queries
  if (lower.startsWith('insert into')) {
    const match = trimmed.match(/insert\s+into\s+["']?([a-zA-Z0-9_]+)["']?/i);
    const tableName = match ? resolveCollectionName(match[1]) : 'products';
    const newItem = jsonDb.insert(tableName, params ? { id: params[0] } : {});
    return { rows: [newItem] as any, rowCount: 1 };
  }

  // Handle UPDATE queries
  if (lower.startsWith('update')) {
    const match = trimmed.match(/update\s+["']?([a-zA-Z0-9_]+)["']?/i);
    const tableName = match ? resolveCollectionName(match[1]) : 'products';
    const updated = jsonDb.update(tableName, { id: params?.[params.length - 1] }, {});
    return { rows: [updated] as any, rowCount: 1 };
  }

  // Handle DELETE queries
  if (lower.startsWith('delete from')) {
    const match = trimmed.match(/from\s+["']?([a-zA-Z0-9_]+)["']?/i);
    const tableName = match ? resolveCollectionName(match[1]) : 'products';
    const deleted = jsonDb.delete(tableName, params ? { id: params[0] } : {});
    return { rows: [deleted] as any, rowCount: 1 };
  }

  // Default empty result for raw SQL fallbacks
  return { rows: [], rowCount: 0 };
}

export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const res = await query<T>(text, params);
  return res.rows[0] || null;
}

export async function transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
  return callback({
    query: (t: string, p?: any[]) => query(t, p),
  });
}

function createJsonDbProxy(rawName: string) {
  const collectionName = resolveCollectionName(rawName);

  return {
    async findMany(args: any = {}) {
      return jsonDb.findMany(collectionName, args.where, {
        orderBy: args.orderBy,
        take: args.take,
      });
    },
    async findUnique(args: any) {
      return jsonDb.findOne(collectionName, args.where || {});
    },
    async findFirst(args: any = {}) {
      return jsonDb.findOne(collectionName, args.where || {});
    },
    async create(args: any) {
      return jsonDb.insert(collectionName, args.data || args);
    },
    async update(args: any) {
      return jsonDb.update(collectionName, args.where || {}, args.data || {});
    },
    async upsert(args: any) {
      return jsonDb.upsert(collectionName, args.where || {}, args.update || {}, args.create || {});
    },
    async delete(args: any) {
      return jsonDb.delete(collectionName, args.where || {});
    },
    async deleteMany(args: any = {}) {
      return jsonDb.deleteMany(collectionName, args.where || {});
    },
    async count(args: any = {}) {
      return jsonDb.count(collectionName, args.where || {});
    },
  };
}

export const prisma: any = new Proxy({}, {
  get(_target, prop: string) {
    if (prop === '$queryRaw' || prop === '$executeRaw') {
      return (sql: string, ...params: any[]) => query(sql, params);
    }
    if (prop === '$transaction') {
      return (cb: any) => transaction(cb);
    }
    return createJsonDbProxy(prop);
  },
});

export default pool;
