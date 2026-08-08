import dns from 'dns';
import { MongoClient, Db, Collection, Document } from 'mongodb';
import { env } from './env';

/**
 * Local/dev only: some ISP resolvers return querySrv ECONNREFUSED for Atlas.
 * Never override DNS on Vercel/serverless — use the runtime resolver.
 */
if (env.NODE_ENV !== 'production') {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch {
    /* ignore if restricted */
  }
}

let client: MongoClient | null = null;
let db: Db | null = null;
let connecting: Promise<Db> | null = null;

export function isMongoConfigured(): boolean {
  return Boolean(env.MONGODB_URI && env.MONGODB_DB_NAME);
}

export async function getMongoDb(): Promise<Db> {
  if (db) return db;
  if (!env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured');
  }
  if (!connecting) {
    connecting = (async () => {
      // Production: default MongoClient options (no family/DNS overrides).
      // Local/dev: optional IPv4 hint for broken dual-stack ISP paths.
      const options: ConstructorParameters<typeof MongoClient>[1] = {
        serverSelectionTimeoutMS: 20_000,
      };
      if (env.NODE_ENV !== 'production') {
        options!.family = 4;
      }

      const c = new MongoClient(env.MONGODB_URI!, options);
      await c.connect();
      client = c;
      db = c.db(env.MONGODB_DB_NAME || 'loanex');
      await db.command({ ping: 1 });
      console.info(`[MongoDB] connected to database "${env.MONGODB_DB_NAME || 'loanex'}"`);
      return db;
    })().catch((err) => {
      connecting = null;
      throw err;
    });
  }
  return connecting;
}

export async function getCollection<T extends Document = Document>(
  name: string,
): Promise<Collection<T>> {
  const database = await getMongoDb();
  return database.collection<T>(name);
}

export async function closeMongo(): Promise<void> {
  if (client) {
    await client.close().catch(() => undefined);
    client = null;
    db = null;
    connecting = null;
  }
}
