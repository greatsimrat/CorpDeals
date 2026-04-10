export type BillingReasonCode =
  | 'VENDOR_PLAN_REQUIRED'
  | 'VENDOR_BILLING_BLOCKED'
  | 'VENDOR_PLAN_LIMIT_REACHED';

type ErrorLike = {
  code?: string;
  message?: string;
  responseBody?: {
    detail?: string;
  };
};

const BILLING_REASON_COPY: Record<BillingReasonCode, string> = {
  VENDOR_PLAN_REQUIRED:
    'A valid billing plan is required before you can create, submit, or keep offers live.',
  VENDOR_BILLING_BLOCKED:
    'Your vendor billing status is blocked. Update billing or contact admin to continue.',
  VENDOR_PLAN_LIMIT_REACHED:
    'Your plan offer limit has been reached. Upgrade plan or free up capacity to continue.',
};

export const getBillingReasonMessage = (
  code?: string | null,
  fallback?: string | null
) => {
  if (!code) return fallback || 'Billing eligibility requirements are not met.';
  const normalized = code.trim().toUpperCase() as BillingReasonCode;
  return BILLING_REASON_COPY[normalized] || fallback || 'Billing eligibility requirements are not met.';
};

export const getBillingErrorMessage = (error: ErrorLike, fallback: string) => {
  const code = String(error?.code || '').trim().toUpperCase();
  const detail = error?.responseBody?.detail || error?.message || '';
  const looksLikeBillingError =
    code === 'VENDOR_PLAN_REQUIRED' ||
    code === 'VENDOR_BILLING_BLOCKED' ||
    code === 'VENDOR_PLAN_LIMIT_REACHED';

  if (!looksLikeBillingError) return error?.message || fallback;
  return detail || getBillingReasonMessage(code, fallback);
};

export const getBillingBlockedTag = (complianceNotes?: string | null) => {
  const raw = String(complianceNotes || '').trim();
  if (!raw) return null;

  const match = raw.match(/\[BILLING_BLOCKED:([A-Z_]+)\]\s*(.*)/);
  if (!match) return null;

  return {
    reasonCode: match[1] || 'VENDOR_BILLING_BLOCKED',
    message: match[2] || getBillingReasonMessage(match[1]),
  };
};
