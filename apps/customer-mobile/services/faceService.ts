import { SERVER_URL } from '../constants/config';

export async function matchFace(personBase64: string, cardBase64: string): Promise<any> {
  const response = await fetch(`${SERVER_URL}/api/kyc/face-match`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ personBase64, cardBase64 }),
  });

  const data = await response.json();
  if (!response.ok || data.status?.code !== 200) {
    throw new Error(data.message || data.status?.message || 'Face match failed');
  }

  return data;
}
