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

async function parse(res: Response) {
  const json = await res.json();
  if (!json.success) throw new Error(json.message || `Request failed (${res.status})`);
  return json;
}

export const api = {
  get: async (endpoint: string) => {
    const res = await fetch(`${SERVER_URL}/api/v1${endpoint}`, {
      headers: await getHeaders(),
    });
    return parse(res);
  },
  post: async (endpoint: string, body: any) => {
    const res = await fetch(`${SERVER_URL}/api/v1${endpoint}`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(body),
    });
    return parse(res);
  },
  put: async (endpoint: string, body: any) => {
    const res = await fetch(`${SERVER_URL}/api/v1${endpoint}`, {
      method: 'PUT',
      headers: await getHeaders(),
      body: JSON.stringify(body),
    });
    return parse(res);
  },
  patch: async (endpoint: string, body?: any) => {
    const res = await fetch(`${SERVER_URL}/api/v1${endpoint}`, {
      method: 'PATCH',
      headers: await getHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return parse(res);
  },
  delete: async (endpoint: string) => {
    const res = await fetch(`${SERVER_URL}/api/v1${endpoint}`, {
      method: 'DELETE',
      headers: await getHeaders(),
    });
    return parse(res);
  },
};
