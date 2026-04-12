type BillingPlanType = 'SUBSCRIPTION' | 'PAY_PER_LEAD';

export type BillingPlanConfigInput = {
  code?: string | null;
  name?: string | null;
  description?: string | null;
  planType: BillingPlanType;
  pricePerLead?: number | string | null;
  monthlyFee?: number | string | null;
  includedLeadsPerCycle?: number | null;
  overagePricePerLead?: number | string | null;
  maxActiveOffers?: number | null;
  overageEnabled?: boolean;
  currencyCode?: string | null;
  isSystemPreset?: boolean;
};

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toMoney = (value: number | null) => (value === null ? null : value.toFixed(2));

const normalizePlanCode = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const normalizeCurrencyCode = (value: string | null | undefined) => {
  const normalized = String(value || '').trim().toUpperCase();
  return normalized || 'CAD';
};

const derivePlanCode = (input: BillingPlanConfigInput) => {
  const candidate = normalizePlanCode(String(input.code || ''));
  if (candidate) return candidate;

  const monthlyFee = toNumber(input.monthlyFee);
  if (input.planType === 'PAY_PER_LEAD') return 'PAY_PER_LEAD';
  if ((monthlyFee ?? 0) <= 0) return 'FREE';
  if ((monthlyFee ?? 0) >= 250) return 'PREMIUM';
  if ((monthlyFee ?? 0) >= 100) return 'GOLD';
  return '';
};

const buildCustomCode = (input: BillingPlanConfigInput) => {
  const fingerprint = createHash('sha1')
    .update(
      JSON.stringify({
        name: String(input.name || '').trim().toLowerCase(),
        description: String(input.description || '').trim().toLowerCase(),
        planType: input.planType,
        pricePerLead: toNumber(input.pricePerLead),
        monthlyFee: toNumber(input.monthlyFee),
        includedLeadsPerCycle: input.includedLeadsPerCycle ?? null,
        overagePricePerLead: toNumber(input.overagePricePerLead),
        maxActiveOffers: input.maxActiveOffers ?? null,
        currencyCode: normalizeCurrencyCode(input.currencyCode),
      })
    )
    .digest('hex')
    .slice(0, 12)
    .toUpperCase();
  return `CUSTOM_${fingerprint}`;
};

const buildConfigId = (code: string, input: BillingPlanConfigInput) => {
  const base = code || `CUSTOM_${Date.now()}`;
  const suffix = input.isSystemPreset ? '' : '-custom';
  return `plan-config-${base.toLowerCase().replace(/_/g, '-')}${suffix}`.slice(0, 63);
};

export const ensureBillingPlanConfig = async (
  tx: any,
  input: BillingPlanConfigInput
): Promise<{ id: string; code: string; name: string }> => {
  const baseCode = derivePlanCode(input);
  const normalizedCode = baseCode || buildCustomCode(input);
  const monthlyFee = toNumber(input.monthlyFee);
  const pricePerLead = toNumber(input.pricePerLead);
  const includedLeadsPerCycle =
    input.includedLeadsPerCycle === null || input.includedLeadsPerCycle === undefined
      ? null
      : Math.max(0, Number(input.includedLeadsPerCycle));
  const overagePricePerLead = toNumber(input.overagePricePerLead);
  const maxActiveOffers =
    input.maxActiveOffers === null || input.maxActiveOffers === undefined
      ? null
      : Math.max(0, Number(input.maxActiveOffers));

  const defaultName =
    input.name?.trim() ||
    (normalizedCode === 'FREE'
      ? 'Free'
      : normalizedCode === 'GOLD'
      ? 'Gold'
      : normalizedCode === 'PREMIUM'
      ? 'Premium'
      : normalizedCode === 'PAY_PER_LEAD'
      ? 'Pay Per Lead'
      : normalizedCode
          .toLowerCase()
          .split('_')
          .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
          .join(' '));
  const normalizedDescription =
    input.description === undefined || input.description === null
      ? null
      : String(input.description).trim() || null;

  const upserted = await (tx as any).billingPlanConfig.upsert({
    where: { code: normalizedCode },
    update: {
      name: defaultName,
      description: normalizedDescription,
      planType: input.planType,
      pricePerLead: toMoney(pricePerLead),
      monthlyFee: toMoney(monthlyFee),
      includedLeadsPerCycle,
      overagePricePerLead: toMoney(overagePricePerLead),
      maxActiveOffers,
      overageEnabled: input.overageEnabled ?? true,
      currencyCode: normalizeCurrencyCode(input.currencyCode),
      isSystemPreset: input.isSystemPreset ?? false,
      isActive: true,
    },
    create: {
      id: buildConfigId(normalizedCode, input),
      code: normalizedCode,
      name: defaultName,
      description: normalizedDescription,
      planType: input.planType,
      pricePerLead: toMoney(pricePerLead),
      monthlyFee: toMoney(monthlyFee),
      includedLeadsPerCycle,
      overagePricePerLead: toMoney(overagePricePerLead),
      maxActiveOffers,
      overageEnabled: input.overageEnabled ?? true,
      currencyCode: normalizeCurrencyCode(input.currencyCode),
      isSystemPreset: input.isSystemPreset ?? false,
      isActive: true,
    },
    select: {
      id: true,
      code: true,
      name: true,
    },
  });

  return upserted;
};
import { createHash } from 'crypto';
