import { createContext } from 'react';

export interface User {
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

export interface AuthContextType {
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

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
