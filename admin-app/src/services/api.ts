import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from './config';
import { clearRbac } from '../auth/rbacStore';

// Create Axios instance with base configuration
const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

type SessionExpiredListener = () => void;
const sessionExpiredListeners = new Set<SessionExpiredListener>();

/** Subscribe to 401 events so the app can navigate back to Login. */
export function onSessionExpired(listener: SessionExpiredListener): () => void {
  sessionExpiredListeners.add(listener);
  return () => sessionExpiredListeners.delete(listener);
}

// Request interceptor — attach JWT token to every request
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem(API_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('[API] Failed to retrieve auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor — handle errors globally
api.interceptors.response.use(
  (response) => {
    // Return the response data directly for convenience
    return response;
  },
  async (error) => {
    const status = error.response?.status;

    if (status === 401) {
      // Token expired or invalid — clear the session and notify listeners
      // so the app can navigate back to Login.
      console.warn('[API] 401 Unauthorized — clearing session');
      await AsyncStorage.multiRemove([
        API_CONFIG.STORAGE_KEYS.AUTH_TOKEN,
        API_CONFIG.STORAGE_KEYS.USER_DATA,
      ]);
      clearRbac();
      sessionExpiredListeners.forEach((listener) => listener());
    }

    if (status === 429) {
      console.warn('[API] 429 Rate Limited — too many requests');
    }

    // Extract error message from backend response
    const message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';

    return Promise.reject({
      status,
      message,
      code: error.response?.data?.code,
      originalError: error,
    });
  }
);

export default api;
