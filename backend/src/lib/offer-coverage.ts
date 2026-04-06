export type CoverageTypeValue = 'COMPANY_WIDE' | 'PROVINCE_SPECIFIC' | 'CITY_SPECIFIC';
export type LocationApplicabilityValue = 'ALL_LOCATIONS' | 'PROVINCE_SPECIFIC' | 'CITY_SPECIFIC';

export type NormalizedLocation = {
  provinceCode: string | null;
  cityName: string | null;
};

export const normalizeProvinceCode = (value: unknown): string | null => {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
};

export const normalizeCityName = (value: unknown): string | null => {
  const normalized = String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
  return normalized ? normalized : null;
};

export const getNormalizedUserLocation = (user?: {
  provinceCode?: string | null;
  cityName?: string | null;
} | null): NormalizedLocation => ({
  provinceCode: normalizeProvinceCode(user?.provinceCode),
  cityName: normalizeCityName(user?.cityName),
});

export const resolveCoverageInput = (input: {
  coverageType?: unknown;
  provinceCode?: unknown;
  cityName?: unknown;
}): {
  coverageType: CoverageTypeValue;
  provinceCode: string | null;
  cityName: string | null;
  error: string | null;
} => {
  const rawType = String(input.coverageType || 'COMPANY_WIDE')
    .trim()
    .toUpperCase();
  const normalizedType = (rawType === 'ALL_LOCATIONS' ? 'COMPANY_WIDE' : rawType) as CoverageTypeValue;
  const coverageType: CoverageTypeValue = [
    'COMPANY_WIDE',
    'PROVINCE_SPECIFIC',
    'CITY_SPECIFIC',
  ].includes(normalizedType)
    ? normalizedType
    : 'COMPANY_WIDE';
  const provinceCode = normalizeProvinceCode(input.provinceCode);
  const cityName = normalizeCityName(input.cityName);

  if (coverageType === 'COMPANY_WIDE') {
    return {
      coverageType,
      provinceCode: null,
      cityName: null,
      error: null,
    };
  }

  if (!provinceCode) {
    return {
      coverageType,
      provinceCode: null,
      cityName: null,
      error: 'Province code is required for location-specific offers',
    };
  }

  if (coverageType === 'PROVINCE_SPECIFIC') {
    return {
      coverageType,
      provinceCode,
      cityName: null,
      error: null,
    };
  }

  if (!cityName) {
    return {
      coverageType,
      provinceCode,
      cityName: null,
      error: 'City name is required for city-specific offers',
    };
  }

  return {
    coverageType,
    provinceCode,
    cityName,
    error: null,
  };
};

export const coverageTypeToLocationApplicability = (
  value: CoverageTypeValue | string | null | undefined
): LocationApplicabilityValue => {
  const coverageType = String(value || 'COMPANY_WIDE').toUpperCase() as CoverageTypeValue;
  if (coverageType === 'PROVINCE_SPECIFIC') return 'PROVINCE_SPECIFIC';
  if (coverageType === 'CITY_SPECIFIC') return 'CITY_SPECIFIC';
  return 'ALL_LOCATIONS';
};

export const getCoverageBadgeLabel = (offer: {
  coverageType?: CoverageTypeValue | string | null;
  provinceCode?: string | null;
  cityName?: string | null;
}) => {
  const coverageType = String(offer.coverageType || 'COMPANY_WIDE').toUpperCase() as CoverageTypeValue;
  const provinceCode = normalizeProvinceCode(offer.provinceCode);
  const cityName = normalizeCityName(offer.cityName);

  if (coverageType === 'CITY_SPECIFIC' && provinceCode && cityName) {
    return `${cityName}, ${provinceCode} only`;
  }
  if (coverageType === 'PROVINCE_SPECIFIC' && provinceCode) {
    return `${provinceCode} only`;
  }
  return 'All locations';
};

export const isOfferEligibleForLocation = (
  offer: {
    coverageType?: CoverageTypeValue | string | null;
    provinceCode?: string | null;
    cityName?: string | null;
  },
  location: NormalizedLocation
) => {
  const coverageType = String(offer.coverageType || 'COMPANY_WIDE').toUpperCase() as CoverageTypeValue;
  if (coverageType === 'COMPANY_WIDE') return true;

  const offerProvinceCode = normalizeProvinceCode(offer.provinceCode);
  if (!location.provinceCode || !offerProvinceCode || offerProvinceCode !== location.provinceCode) {
    return false;
  }

  if (coverageType === 'PROVINCE_SPECIFIC') return true;

  const offerCityName = normalizeCityName(offer.cityName);
  if (!offerCityName || !location.cityName) return false;
  return offerCityName.toLowerCase() === location.cityName.toLowerCase();
};

export const buildEligibilityMessage = (
  offer: {
    coverageType?: CoverageTypeValue | string | null;
    provinceCode?: string | null;
    cityName?: string | null;
  },
  companyName: string,
  isEligible: boolean
) => {
  if (!isEligible) {
    return 'This offer is not available for your current location';
  }

  const coverageType = String(offer.coverageType || 'COMPANY_WIDE').toUpperCase() as CoverageTypeValue;
  const provinceCode = normalizeProvinceCode(offer.provinceCode);
  const cityName = normalizeCityName(offer.cityName);

  if (coverageType === 'CITY_SPECIFIC' && provinceCode && cityName) {
    return `Available to ${companyName} employees in ${cityName}, ${provinceCode}`;
  }
  if (coverageType === 'PROVINCE_SPECIFIC' && provinceCode) {
    return `Available to ${companyName} employees in ${provinceCode}`;
  }
  return `Available to ${companyName} employees in all eligible locations`;
};
