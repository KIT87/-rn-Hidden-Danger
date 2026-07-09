import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_EXPIRES_KEY = 'auth_expires_at';
const AUTH_NICKNAME_KEY = 'auth_nickname';
const LAST_APP_OPEN_KEY = 'last_app_open_date';

const webStore = {
  getItemAsync: (key: string) => Promise.resolve(localStorage.getItem(key)),
  setItemAsync: (key: string, value: string) => { localStorage.setItem(key, value); return Promise.resolve(); },
  deleteItemAsync: (key: string) => { localStorage.removeItem(key); return Promise.resolve(); },
};

const store = Platform.OS === 'web' ? webStore : SecureStore;

export const storage = {
  getToken: () => store.getItemAsync(AUTH_TOKEN_KEY),
  setToken: (token: string) => store.setItemAsync(AUTH_TOKEN_KEY, token),
  deleteToken: () => store.deleteItemAsync(AUTH_TOKEN_KEY),

  getExpiresAt: () => store.getItemAsync(AUTH_EXPIRES_KEY),
  setExpiresAt: (expiresAt: string) => store.setItemAsync(AUTH_EXPIRES_KEY, expiresAt),
  deleteExpiresAt: () => store.deleteItemAsync(AUTH_EXPIRES_KEY),

  getNickname: () => store.getItemAsync(AUTH_NICKNAME_KEY),
  setNickname: (nickname: string) => store.setItemAsync(AUTH_NICKNAME_KEY, nickname),
  deleteNickname: () => store.deleteItemAsync(AUTH_NICKNAME_KEY),

  // Local calendar-day guard so `app_open` is recorded at most once per day.
  getLastAppOpen: () => store.getItemAsync(LAST_APP_OPEN_KEY),
  setLastAppOpen: (date: string) => store.setItemAsync(LAST_APP_OPEN_KEY, date),

  clear: async () => {
    await store.deleteItemAsync(AUTH_TOKEN_KEY);
    await store.deleteItemAsync(AUTH_EXPIRES_KEY);
    await store.deleteItemAsync(AUTH_NICKNAME_KEY);
    await store.deleteItemAsync(LAST_APP_OPEN_KEY);
  },
};
