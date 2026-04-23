import * as SecureStore from 'expo-secure-store';

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_EXPIRES_KEY = 'auth_expires_at';

export const storage = {
  getToken: () => SecureStore.getItemAsync(AUTH_TOKEN_KEY),
  setToken: (token: string) => SecureStore.setItemAsync(AUTH_TOKEN_KEY, token),
  deleteToken: () => SecureStore.deleteItemAsync(AUTH_TOKEN_KEY),

  getExpiresAt: () => SecureStore.getItemAsync(AUTH_EXPIRES_KEY),
  setExpiresAt: (expiresAt: string) => SecureStore.setItemAsync(AUTH_EXPIRES_KEY, expiresAt),
  deleteExpiresAt: () => SecureStore.deleteItemAsync(AUTH_EXPIRES_KEY),

  clear: async () => {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(AUTH_EXPIRES_KEY);
  },
};
