import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVER_URL } from '../constants/config';

const ACCESS_TOKEN_KEY = '@loanex_access_token';

async function getHeaders() {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  get: async (endpoint: string) => {
    const res = await fetch(`${SERVER_URL}/api/v1${endpoint}`, {
      headers: await getHeaders(),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    return json;
  },
  post: async (endpoint: string, body: any) => {
    const res = await fetch(`${SERVER_URL}/api/v1${endpoint}`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    return json;
  },
  put: async (endpoint: string, body: any) => {
    const res = await fetch(`${SERVER_URL}/api/v1${endpoint}`, {
      method: 'PUT',
      headers: await getHeaders(),
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    return json;
  },
  delete: async (endpoint: string) => {
    const res = await fetch(`${SERVER_URL}/api/v1${endpoint}`, {
      method: 'DELETE',
      headers: await getHeaders(),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    return json;
  }
};
