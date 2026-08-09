import { env } from '../../config/env';
import { BadRequestError } from '../../common/errors/app-error';
import { settingsRepository } from './settings.repository';

const COD_MAX_AMOUNT_KEY = 'COD_MAX_AMOUNT';

export class SettingsService {
  /**
   * Effective COD cap: the persisted admin setting wins, the env value is the
   * default. Sync read — jsonDb is in-memory, so the change is live for every
   * checkout the moment an admin saves it (no restart needed).
   */
  getCodMaxAmount(): number {
    const row = settingsRepository.get(COD_MAX_AMOUNT_KEY);
    if (row) {
      const stored = Number(row.value);
      if (Number.isFinite(stored) && stored >= 0) return stored;
    }
    return Number(env.COD_MAX_AMOUNT) || 0;
  }

  getCodSettings() {
    const row = settingsRepository.get(COD_MAX_AMOUNT_KEY);
    return {
      codMaxAmount: this.getCodMaxAmount(),
      source: row ? 'db' : 'env',
    };
  }

  async updateCodMaxAmount(value: number) {
    if (!Number.isFinite(value) || value < 0) {
      throw new BadRequestError('COD max amount must be a non-negative number.');
    }
    const rounded = Math.round(value);
    await settingsRepository.set(COD_MAX_AMOUNT_KEY, rounded);
    return { codMaxAmount: rounded, source: 'db' as const };
  }
}

export const settingsService = new SettingsService();
