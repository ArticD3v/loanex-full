import api from './api';

export interface CodSettings {
  codMaxAmount: number;
  /** 'db' when an admin has saved an override, 'env' for the default. */
  source: 'db' | 'env';
}

/** Fetch the current portal settings (COD cap). */
export const getCodSettings = async (): Promise<CodSettings> => {
  const response = await api.get('/admin/settings');
  return response.data.data as CodSettings;
};

/** Persist a new COD max amount — takes effect without a backend restart. */
export const updateCodMaxAmount = async (codMaxAmount: number): Promise<CodSettings> => {
  const response = await api.patch('/admin/settings/cod', { codMaxAmount });
  return response.data.data as CodSettings;
};
