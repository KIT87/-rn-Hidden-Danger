import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { storage } from '@/lib/storage/secure';

interface AuthContextValue {
  token: string | null;
  nickname: string | null;
  isLoading: boolean;
  signIn: (token: string, expiresAt: string, nickname: string | null) => Promise<void>;
  setNickname: (nickname: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [nickname, setNicknameState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([storage.getToken(), storage.getNickname()]).then(([t, n]) => {
      setToken(t);
      setNicknameState(n);
      setIsLoading(false);
    });
  }, []);

  async function signIn(newToken: string, expiresAt: string, newNickname: string | null) {
    await storage.setToken(newToken);
    await storage.setExpiresAt(expiresAt);
    if (newNickname) {
      await storage.setNickname(newNickname);
      setNicknameState(newNickname);
    } else {
      await storage.deleteNickname();
      setNicknameState(null);
    }
    setToken(newToken);
  }

  async function setNickname(newNickname: string) {
    await storage.setNickname(newNickname);
    setNicknameState(newNickname);
  }

  async function signOut() {
    await storage.clear();
    setToken(null);
    setNicknameState(null);
  }

  return (
    <AuthContext.Provider value={{ token, nickname, isLoading, signIn, setNickname, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
