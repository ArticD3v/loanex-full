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

  await jsonDb.ready;

  try {
    const res = await pool.query('SELECT NOW()');
    console.info('[Native PG DB] Connected to PostgreSQL at', res.rows[0].now);
  } catch (error) {
    console.error('[DB] Failed to connect to PostgreSQL', error);
    process.exit(1);
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
