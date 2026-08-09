import { jsonDb } from '../../config/json-db';

export interface SettingRow {
  id: string;
  key: string;
  value: unknown;
  updatedAt: string;
}

/**
 * Key-value settings store (Mongo `settings` collection, hydrated at boot).
 * The awaited mirror guarantees an admin's change survives cold starts —
 * same durability pattern as the auth/admin user writes.
 */
export class SettingsRepository {
  /** Sync read — jsonDb is in-memory. */
  get(key: string): SettingRow | null {
    return jsonDb.findOne('settings', { key });
  }

  /** Upsert with an awaited Mongo mirror. */
  async set(key: string, value: unknown): Promise<SettingRow> {
    const existing = jsonDb.findOne('settings', { key });
    if (existing) {
      const updated = await jsonDb.updateAwaited('settings', { key }, { value });
      return updated ?? existing;
    }
    return jsonDb.insertAwaited('settings', { key, value });
  }
}

export const settingsRepository = new SettingsRepository();
