import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from '../services/api';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'FINANCE' | 'VENDOR' | 'EMPLOYEE';
  employmentVerifiedAt?: string | null;
  employeeCompany?: {
    id: string;
    slug: string;
    name: string;
    domain?: string | null;
  } | null;
  vendor?: {
    id: string;
    companyName: string;
    status: string;
  };
  activeVerification?: {
    id: string;
    status: string;
    verifiedAt: string;
    expiresAt: string;
    verificationMethod: string;
    company: {
      id: string;
      slug: string;
      name: string;
      domain?: string | null;
      logo?: string | null;
    };
  } | null;
  latestVerification?: {
    id: string;
    status: string;
    verifiedAt: string;
    expiresAt: string;
    verificationMethod: string;
    company: {
      id: string;
      slug: string;
      name: string;
      domain?: string | null;
      logo?: string | null;
    };
  } | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isFinance: boolean;
  isAdminOrFinance: boolean;
  isVendor: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name?: string }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      if (api.getToken()) {
        const userData = await api.getCurrentUser();
        setUser(userData);
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
          setUser(userData);
        }
      } catch (error) {
        console.error('Auth init error:', error);
        api.logout();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const result = await api.login(email, password);
    setUser(result.user);
  };

  const register = async (data: { email: string; password: string; name?: string }) => {
    const result = await api.register(data);
    setUser(result.user);
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
        isAdminOrFinance: user?.role === 'ADMIN' || user?.role === 'FINANCE',
        isVendor: user?.role === 'VENDOR',
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
