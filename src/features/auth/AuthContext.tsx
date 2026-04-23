import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { storage } from '@/lib/storage/secure';

interface AuthContextValue {
  token: string | null;
  isLoading: boolean;
  signIn: (token: string, expiresAt: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    storage.getToken().then((t) => {
      setToken(t);
      setIsLoading(false);
    });
  }, []);

  async function signIn(newToken: string, expiresAt: string) {
    await storage.setToken(newToken);
    await storage.setExpiresAt(expiresAt);
    setToken(newToken);
  }

  async function signOut() {
    await storage.clear();
    setToken(null);
  }

  return (
    <AuthContext.Provider value={{ token, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
