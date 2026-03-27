import { createContext } from 'react';
import type { AppRole, CompanySummary } from '../lib/auth';

export interface User {
  id: string;
  email: string;
  loginEmail?: string | null;
  workEmail?: string | null;
  workEmailVerifiedAt?: string | null;
  name: string | null;
  role: AppRole;
  employmentVerifiedAt?: string | null;
  activeCompany?: CompanySummary | null;
  employeeCompany?: CompanySummary | null;
  vendor?: {
    id: string;
    companyName: string;
    status: string;
  } | null;
  activeVerification?: {
    id: string;
    status: string;
    verifiedAt: string;
    expiresAt: string;
    verificationMethod: string;
    company: CompanySummary;
  } | null;
  latestVerification?: {
    id: string;
    status: string;
    verifiedAt: string;
    expiresAt: string;
    verificationMethod: string;
    company: CompanySummary;
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
  isUser: boolean;
  role: AppRole | null;
  defaultRoute: string;
  login: (email: string, password: string) => Promise<User>;
  register: (data: { email: string; password: string; name?: string }) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
