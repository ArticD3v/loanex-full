import { createApp } from './app';
import { pool } from './config/database';
import { jsonDb } from './config/json-db';
import { env } from './config/env';
import {
  startNotificationReminderEngine,
  stopNotificationReminderEngine,
} from './modules/notifications';

async function bootstrap() {
  const app = createApp();

  try {
    await jsonDb.ready;
  } catch (error) {
    // Fail fast: MongoDB is the single source of truth — never boot on a
    // stale local/bootstrap snapshot when Mongo is unreachable.
    console.error(
      '[BOOT-FAIL] Could not hydrate data from MongoDB — refusing to start. ' +
        'Check MONGODB_URI / network access and restart.',
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }

  try {
    const res = await pool.query('SELECT NOW()');
    const now = res.rows?.[0]?.now;
    console.info('[Native PG DB] Connected to PostgreSQL at', now ?? 'n/a');
  } catch (error) {
    console.warn('[DB] Native PostgreSQL unavailable (using Supabase/jsonDb), continuing:', error?.message);
  }

  const server = app.listen(env.PORT, () => {
    console.info(`[Server] ${env.APP_NAME} listening on http://localhost:${env.PORT}`);
    console.info(`[Server] Auth base: http://localhost:${env.PORT}${env.API_PREFIX}/auth`);
    startNotificationReminderEngine();
    console.info('[Reminders] EMI reminder engine started');
  });

  const shutdown = async (signal: string) => {
    console.info(`[Server] Received ${signal}, shutting down...`);
    stopNotificationReminderEngine();
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void bootstrap();
