export type DetailTemplateType =
  | 'GENERIC'
  | 'TELECOM'
  | 'RESTAURANT'
  | 'FUN_PARK'
  | 'TRAVEL'
  | 'BANKING';

export type DetailSectionType =
  | 'highlights'
  | 'specs'
  | 'pricing'
  | 'eligibility'
  | 'how_it_works'
  | 'fine_print'
  | 'timing_rules'
  | 'booking_rules'
  | 'included_items'
  | 'faq';

export type DetailItem = {
  label?: string;
  value?: string;
  title?: string;
  body?: string;
};

export type OfferDetailSection = {
  type: DetailSectionType;
  title?: string;
  description?: string;
  content?: string;
  items: DetailItem[];
};

const VALID_SECTION_TYPES: DetailSectionType[] = [
  'highlights',
  'specs',
  'pricing',
  'eligibility',
  'how_it_works',
  'fine_print',
  'timing_rules',
  'booking_rules',
  'included_items',
  'faq',
];

const SECTION_ORDER: Record<DetailTemplateType, DetailSectionType[]> = {
  GENERIC: [
    'highlights',
    'pricing',
    'specs',
    'eligibility',
    'how_it_works',
    'included_items',
    'timing_rules',
    'booking_rules',
    'fine_print',
    'faq',
  ],
  TELECOM: [
    'highlights',
    'specs',
    'pricing',
    'eligibility',
    'how_it_works',
    'fine_print',
    'faq',
  ],
  RESTAURANT: [
    'highlights',
    'timing_rules',
    'pricing',
    'how_it_works',
    'fine_print',
    'faq',
  ],
  FUN_PARK: [
    'highlights',
    'included_items',
    'timing_rules',
    'pricing',
    'how_it_works',
    'fine_print',
    'faq',
  ],
  TRAVEL: [
    'highlights',
    'included_items',
    'booking_rules',
    'pricing',
    'timing_rules',
    'fine_print',
    'faq',
  ],
  BANKING: [
    'highlights',
    'pricing',
    'eligibility',
    'how_it_works',
    'fine_print',
    'faq',
  ],
};

const DEFAULT_TITLES: Record<DetailSectionType, string> = {
  highlights: 'Highlights',
  specs: 'Offer details',
  pricing: 'Pricing',
  eligibility: 'Eligibility',
  how_it_works: 'How it works',
  fine_print: 'Fine print',
  timing_rules: 'Timing rules',
  booking_rules: 'Booking rules',
  included_items: 'What is included',
  faq: 'Frequently asked questions',
};

const normalizeItem = (value: unknown): DetailItem | null => {
  if (typeof value === 'string' && value.trim()) {
    return { value: value.trim() };
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const label = typeof candidate.label === 'string' ? candidate.label.trim() : '';
  const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
  const valueText =
    typeof candidate.value === 'string'
      ? candidate.value.trim()
      : typeof candidate.text === 'string'
      ? candidate.text.trim()
      : '';
  const body = typeof candidate.body === 'string' ? candidate.body.trim() : '';

  if (!label && !title && !valueText && !body) return null;

  return {
    label: label || undefined,
    title: title || undefined,
    value: valueText || undefined,
    body: body || undefined,
  };
};

const normalizeItems = (value: unknown): DetailItem[] => {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeItem).filter((item): item is DetailItem => Boolean(item));
};

export const normalizeDetailTemplateType = (value: unknown): DetailTemplateType => {
  const normalized = String(value || 'GENERIC').trim().toUpperCase() as DetailTemplateType;
  return normalized in SECTION_ORDER ? normalized : 'GENERIC';
};

export const normalizeHighlights = (value: unknown) => normalizeItems(value);

export const normalizeDetailSections = (value: unknown): OfferDetailSection[] => {
  if (!Array.isArray(value)) return [];

  const sections: OfferDetailSection[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const section = entry as Record<string, unknown>;
    const type = String(section.type || '').trim().toLowerCase() as DetailSectionType;
    if (!VALID_SECTION_TYPES.includes(type)) continue;

    sections.push({
      type,
      title:
        typeof section.title === 'string' && section.title.trim()
          ? section.title.trim()
          : DEFAULT_TITLES[type],
      description:
        typeof section.description === 'string' && section.description.trim()
          ? section.description.trim()
          : undefined,
      content:
        typeof section.content === 'string' && section.content.trim()
          ? section.content.trim()
          : undefined,
      items: normalizeItems(section.items ?? section.rows ?? section.questions ?? section.points),
    });
  }

  return sections;
};

export const orderDetailSections = (
  templateType: DetailTemplateType,
  sections: OfferDetailSection[]
) => {
  const order = SECTION_ORDER[templateType];
  return [...sections].sort((left, right) => {
    return order.indexOf(left.type) - order.indexOf(right.type);
  });
};

export const getCoverageLabel = (offer: {
  coverageType?: 'COMPANY_WIDE' | 'PROVINCE_SPECIFIC' | 'CITY_SPECIFIC';
  provinceCode?: string | null;
  cityName?: string | null;
}) => {
  if (offer.coverageType === 'CITY_SPECIFIC' && offer.cityName && offer.provinceCode) {
    return `${offer.cityName}, ${offer.provinceCode} only`;
  }
  if (offer.coverageType === 'PROVINCE_SPECIFIC' && offer.provinceCode) {
    return `${offer.provinceCode} only`;
  }
  return 'All locations';
};
