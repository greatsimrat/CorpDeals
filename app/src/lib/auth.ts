export const APP_ROLES = ['USER', 'VENDOR', 'FINANCE', 'ADMIN'] as const;

export type AppRole = (typeof APP_ROLES)[number];

export type CompanySummary = {
  id: string;
  slug: string;
  name: string;
  domain?: string | null;
  logo?: string | null;
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
