import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from '../services/api';
import { AuthContext } from './auth-context';
import type { User } from './auth-context';
import { getDefaultRouteForRole, hasVendorWorkspaceAccess, normalizeRole } from '../lib/auth';

const normalizeUser = (user: User): User => ({
  ...user,
  loginEmail: user.loginEmail || user.email,
  role: normalizeRole(user.role),
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      if (api.getToken()) {
        const userData = await api.getCurrentUser();
        setUser(normalizeUser(userData));
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      api.logout();
      setUser(null);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (api.getToken()) {
          const userData = await api.getCurrentUser();
          setUser(normalizeUser(userData));
        }
      } catch (error) {
        console.error('Auth init error:', error);
        api.logout();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const result = await api.login(email, password);
    const nextUser = normalizeUser(result.user);
    setUser(nextUser);
    return nextUser;
  };

  const register = async (data: { email: string; password: string; name?: string }) => {
    const result = await api.register(data);
    const nextUser = normalizeUser(result.user);
    setUser(nextUser);
    return nextUser;
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'ADMIN',
        isFinance: user?.role === 'FINANCE',
        isSales: user?.role === 'SALES',
        isAdminOrFinance: user?.role === 'ADMIN' || user?.role === 'FINANCE',
        isAdminOrSales: user?.role === 'ADMIN' || user?.role === 'SALES',
        isVendor: !!user && hasVendorWorkspaceAccess(user),
        isUser: user?.role === 'USER',
        hasVendorAccess: !!user && hasVendorWorkspaceAccess(user),
        role: user?.role || null,
        defaultRoute: getDefaultRouteForRole(user),
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
