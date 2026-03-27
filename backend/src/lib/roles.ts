export const APP_ROLES = ['USER', 'VENDOR', 'FINANCE', 'SALES', 'ADMIN'] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const DEFAULT_USER_ROLE: AppRole = 'USER';

const LEGACY_ROLE_ALIASES: Record<string, AppRole> = {
  EMPLOYEE: 'USER',
  USER: 'USER',
  VENDOR: 'VENDOR',
  FINANCE: 'FINANCE',
  SALES: 'SALES',
  ADMIN: 'ADMIN',
};

export const normalizeRole = (role: unknown): AppRole => {
  const normalized = String(role || '').trim().toUpperCase();
  return LEGACY_ROLE_ALIASES[normalized] || DEFAULT_USER_ROLE;
};

export const isAppRole = (role: unknown): role is AppRole => {
  const normalized = String(role || '').trim().toUpperCase();
  return APP_ROLES.includes(normalized as AppRole);
};
