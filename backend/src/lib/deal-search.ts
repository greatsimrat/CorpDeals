import { normalizeCityName, normalizeProvinceCode } from './offer-coverage';

type CategoryLike = {
  name?: string | null;
  slug?: string | null;
  parent?: {
    name?: string | null;
    slug?: string | null;
  } | null;
} | null;

export type SearchableOffer = {
  id: string;
  title?: string | null;
  description?: string | null;
  coverageType?: string | null;
  provinceCode?: string | null;
  cityName?: string | null;
  vendor?: {
    companyName?: string | null;
  } | null;
  category?: CategoryLike;
};

export type DealSearchIntent = {
  rawQuery: string;
  normalizedQuery: string;
  terms: string[];
  requestedProvinceCode: string | null;
  requestedCityName: string | null;
  requestedMarketKey: string | null;
  categoryHints: string[];
};

export type DealSearchMatch = {
  matched: boolean;
  score: number;
  matchedTerms: string[];
  matchedCategoryHints: string[];
  locationMatch:
    | 'none'
    | 'query-city'
    | 'query-nearby-city'
    | 'query-province'
    | 'company-wide';
};

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'at',
  'by',
  'for',
  'from',
  'in',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with',
  'your',
]);

const PROVINCE_ALIASES: Record<string, string> = {
  bc: 'BC',
  britishcolumbia: 'BC',
  on: 'ON',
  ontario: 'ON',
  ab: 'AB',
  alberta: 'AB',
  qc: 'QC',
  quebec: 'QC',
};

const CITY_MARKETS: Array<{
  key: string;
  provinceCode: string;
  names: string[];
}> = [
  {
    key: 'metro-vancouver',
    provinceCode: 'BC',
    names: [
      'burnaby',
      'coquitlam',
      'delta',
      'langley',
      'newwestminster',
      'northvancouver',
      'richmond',
      'surrey',
      'vancouver',
      'westvancouver',
      'white rock',
      'whiterock',
    ],
  },
  {
    key: 'greater-toronto',
    provinceCode: 'ON',
    names: [
      'brampton',
      'markham',
      'mississauga',
      'north york',
      'northyork',
      'scarborough',
      'toronto',
      'vaughan',
    ],
  },
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  automotive: ['auto', 'automotive', 'car', 'cars', 'lease', 'leasing', 'vehicle'],
  banking: ['bank', 'banking', 'credit', 'finance', 'financial', 'loan', 'loans', 'mortgage'],
  dining: ['dining', 'food', 'meal', 'meals', 'restaurant', 'restaurants'],
  entertainment: ['concert', 'entertainment', 'event', 'movie', 'movies', 'streaming', 'ticket'],
  insurance: ['auto insurance', 'coverage', 'health insurance', 'insurance', 'life insurance'],
  retail: ['retail', 'shopping', 'store', 'stores'],
  technology: ['device', 'devices', 'hardware', 'laptop', 'software', 'tech', 'technology'],
  telecom: [
    'broadband',
    'cell',
    'data',
    'fibre',
    'fiber',
    'internet',
    'mobile',
    'phone',
    'phones',
    'plan',
    'plans',
    'telecom',
    'tv',
    'wifi',
    'wireless',
  ],
  travel: ['flight', 'flights', 'hotel', 'hotels', 'travel', 'vacation'],
  wellness: ['fitness', 'gym', 'health', 'wellness'],
};

const normalizeSearchText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeAliasToken = (value: string) =>
  normalizeSearchText(value).replace(/\s+/g, '');

const resolveRequestedProvinceCode = (query: string) => {
  const compact = normalizeAliasToken(query);
  for (const [alias, provinceCode] of Object.entries(PROVINCE_ALIASES)) {
    if (compact.includes(alias)) {
      return provinceCode;
    }
  }
  return null;
};

const resolveRequestedCityName = (query: string) => {
  const compact = normalizeAliasToken(query);
  for (const market of CITY_MARKETS) {
    for (const name of market.names) {
      if (compact.includes(normalizeAliasToken(name))) {
        return normalizeCityName(name);
      }
    }
  }
  return null;
};

export const resolveCityMarketKey = (
  cityName: string | null | undefined,
  provinceCode: string | null | undefined
) => {
  const normalizedCity = normalizeAliasToken(String(cityName || ''));
  const normalizedProvinceCode = normalizeProvinceCode(provinceCode);
  if (!normalizedCity || !normalizedProvinceCode) return null;

  for (const market of CITY_MARKETS) {
    if (market.provinceCode !== normalizedProvinceCode) continue;
    if (market.names.some((name) => normalizeAliasToken(name) === normalizedCity)) {
      return market.key;
    }
  }

  return null;
};

const extractCategoryHints = (normalizedQuery: string) => {
  const hints = new Set<string>();
  for (const [slug, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => normalizedQuery.includes(normalizeSearchText(keyword)))) {
      hints.add(slug);
    }
  }
  return Array.from(hints);
};

export const parseDealSearchIntent = (rawQuery: string): DealSearchIntent => {
  const normalizedQuery = normalizeSearchText(rawQuery);
  const terms = normalizedQuery
    .split(' ')
    .map((term) => term.trim())
    .filter((term) => term.length >= 2 && !STOP_WORDS.has(term));
  const requestedProvinceCode = resolveRequestedProvinceCode(rawQuery);
  const requestedCityName = resolveRequestedCityName(rawQuery);

  return {
    rawQuery,
    normalizedQuery,
    terms,
    requestedProvinceCode,
    requestedCityName,
    requestedMarketKey: resolveCityMarketKey(requestedCityName, requestedProvinceCode),
    categoryHints: extractCategoryHints(normalizedQuery),
  };
};

export const scoreOfferForDealSearch = (
  offer: SearchableOffer,
  intent: DealSearchIntent
): DealSearchMatch => {
  const searchableFields = [
    offer.title || '',
    offer.description || '',
    offer.vendor?.companyName || '',
    offer.category?.name || '',
    offer.category?.slug || '',
    offer.category?.parent?.name || '',
    offer.category?.parent?.slug || '',
  ]
    .map((value) => normalizeSearchText(value))
    .filter(Boolean);

  const matchedTerms = intent.terms.filter((term) =>
    searchableFields.some((field) => field.includes(term))
  );
  const matchedCategoryHints = intent.categoryHints.filter((hint) =>
    [offer.category?.slug, offer.category?.parent?.slug]
      .map((value) => String(value || '').trim())
      .includes(hint)
  );

  let score = 0;
  if (intent.normalizedQuery && searchableFields.some((field) => field.includes(intent.normalizedQuery))) {
    score += 10;
  }
  score += matchedTerms.length * 4;
  score += matchedCategoryHints.length * 5;

  const offerProvinceCode = normalizeProvinceCode(offer.provinceCode);
  const offerCityName = normalizeCityName(offer.cityName);
  const offerMarketKey = resolveCityMarketKey(offerCityName, offerProvinceCode);

  let locationMatch: DealSearchMatch['locationMatch'] = 'none';
  if (String(offer.coverageType || 'COMPANY_WIDE').toUpperCase() === 'COMPANY_WIDE') {
    locationMatch = 'company-wide';
    score += 1;
  } else if (
    intent.requestedProvinceCode &&
    offerProvinceCode &&
    intent.requestedProvinceCode === offerProvinceCode
  ) {
    locationMatch = 'query-province';
    score += 2;
    if (
      intent.requestedCityName &&
      offerCityName &&
      intent.requestedCityName.toLowerCase() === offerCityName.toLowerCase()
    ) {
      locationMatch = 'query-city';
      score += 4;
    } else if (
      intent.requestedMarketKey &&
      offerMarketKey &&
      intent.requestedMarketKey === offerMarketKey
    ) {
      locationMatch = 'query-nearby-city';
      score += 3;
    }
  }

  const matched =
    score > 0 &&
    (matchedTerms.length > 0 ||
      matchedCategoryHints.length > 0 ||
      (intent.requestedProvinceCode !== null && locationMatch !== 'none'));

  return {
    matched,
    score,
    matchedTerms,
    matchedCategoryHints,
    locationMatch,
  };
};
