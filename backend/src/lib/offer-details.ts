import prisma from './prisma';

export type OfferDetailTemplateTypeValue =
  | 'GENERIC'
  | 'TELECOM'
  | 'RESTAURANT'
  | 'FUN_PARK'
  | 'TRAVEL'
  | 'BANKING';

const DETAIL_TEMPLATE_TYPES: OfferDetailTemplateTypeValue[] = [
  'GENERIC',
  'TELECOM',
  'RESTAURANT',
  'FUN_PARK',
  'TRAVEL',
  'BANKING',
];

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'offer';

export const normalizeOfferDetailTemplateType = (
  value: unknown
): OfferDetailTemplateTypeValue => {
  const normalized = String(value || 'GENERIC').trim().toUpperCase() as OfferDetailTemplateTypeValue;
  return DETAIL_TEMPLATE_TYPES.includes(normalized) ? normalized : 'GENERIC';
};

export const normalizeJsonField = (value: unknown) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return value;
  return null;
};

export const normalizeOptionalUrl = (value: unknown) => {
  const normalized = String(value || '').trim();
  return normalized || null;
};

export const buildOfferSlug = (title: string) => slugify(title);

export const getUniqueOfferSlug = async (
  title: string,
  excludeOfferId?: string
) => {
  const baseSlug = buildOfferSlug(title);
  let candidate = baseSlug;
  let suffix = 2;

  while (
    await prisma.offer.findFirst({
      where: {
        slug: candidate,
        ...(excludeOfferId ? { id: { not: excludeOfferId } } : {}),
      },
      select: { id: true },
    })
  ) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
};
