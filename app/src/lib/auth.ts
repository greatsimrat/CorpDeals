export const APP_ROLES = ['USER', 'VENDOR', 'FINANCE', 'ADMIN'] as const;

export type AppRole = (typeof APP_ROLES)[number];

export type CompanySummary = {
  id: string;
  slug: string;
  name: string;
  domain?: string | null;
  logo?: string | null;
};

export type AuthUserSummary = {
  email: string;
  loginEmail?: string | null;
  workEmail?: string | null;
  name?: string | null;
};

export const normalizeRole = (role: unknown): AppRole => {
  const normalized = String(role || '').trim().toUpperCase();
  switch (normalized) {
    case 'ADMIN':
    case 'FINANCE':
    case 'VENDOR':
    case 'USER':
      return normalized;
    case 'EMPLOYEE':
      return 'USER';
    default:
      return 'USER';
  }
};

export const getDefaultRouteForRole = (user: {
  role: AppRole;
  activeVerification?: { company: CompanySummary } | null;
  activeCompany?: CompanySummary | null;
  employeeCompany?: CompanySummary | null;
} | null) => {
  if (!user) return '/';

  if (user.role === 'ADMIN') return '/admin';
  if (user.role === 'FINANCE') return '/finance';
  if (user.role === 'VENDOR') return '/vendor/dashboard';

  const companySlug =
    user.activeVerification?.company.slug ||
    user.activeCompany?.slug ||
    user.employeeCompany?.slug;

  return companySlug ? `/c/${companySlug}` : '/';
};

export const canAccessPathForRole = (role: AppRole, pathname: string) => {
  if (pathname.startsWith('/admin')) return role === 'ADMIN';
  if (pathname.startsWith('/finance')) return role === 'ADMIN' || role === 'FINANCE';
  if (pathname.startsWith('/vendor')) return role === 'VENDOR';
  if (pathname === '/my-applications' || pathname === '/confirmation') return role === 'USER';
  return true;
};

export const getUserDisplayName = (user: AuthUserSummary | null | undefined) => {
  const explicitName = user?.name?.trim();
  if (explicitName) return explicitName;

  const loginEmail = user?.loginEmail || user?.email || '';
  if (!loginEmail.includes('@')) return 'Account';

  return loginEmail
    .split('@')[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

export const getUserInitials = (user: AuthUserSummary | null | undefined) => {
  const displayName = getUserDisplayName(user);
  const parts = displayName
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
};
