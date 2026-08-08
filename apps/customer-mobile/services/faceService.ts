import { api } from '../lib/apiClient';

/** Face match via Backend API (uses stored DigiLocker profile image). */
export async function matchFace(personBase64: string, _cardBase64?: string): Promise<any> {
  const res = await api.post('/verification/face-match', {
    capturedImage: personBase64,
  });
  // Normalize to shape expected by kyc-verification UI
  const data = res.data || {};
  return {
    ...data,
    status: { code: data.match_status || data.verified ? 200 : 400 },
    data: {
      match_status: Boolean(data.match_status ?? data.verified ?? data.same_face),
      ...(data.data || data),
    },
  };
}
