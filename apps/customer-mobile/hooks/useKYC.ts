import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { getKYC } from '../services/kycService';
import { CustomerKYC } from '../types';

export function useKYC() {
  const { user } = useAuth();
  const [kyc, setKYC] = useState<CustomerKYC | null>(null);
  const [kycLoading, setKycLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setKYC(null); setKycLoading(false); return; }
    setKycLoading(true);
    try {
      const data = await getKYC(user.id);
      setKYC(data);
    } catch { setKYC(null); }
    setKycLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const isKYCComplete = kyc?.kycCompleted === true;

  return { kyc, kycLoading, isKYCComplete, refresh };
}
