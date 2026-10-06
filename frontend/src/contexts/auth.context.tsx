'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import {
  AuthUser,
  clearToken,
  getMe,
  getToken,
  loginUser,
  registerUser,
  saveToken,
} from '@/services/auth.service';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithToken: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    getMe()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user: authUser } = await loginUser({ email, password });
    saveToken(token);
    setUser(authUser);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { token, user: authUser } = await registerUser({ name, email, password });
    saveToken(token);
    setUser(authUser);
  }, []);

  const loginWithToken = useCallback(async (token: string) => {
    saveToken(token);
    const authUser = await getMe();
    setUser(authUser);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        loginWithToken,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
