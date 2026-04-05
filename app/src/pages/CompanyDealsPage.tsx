import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  Star,
} from 'lucide-react';
import api from '../services/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { useAuth } from '../hooks/useAuth';
import { categories as categoryCatalog } from '../data/categories';
import { getUserDisplayName } from '../lib/auth';

const DEFAULT_OFFER_IMAGE = '/default-offer-card.png';

interface CompanyData {
  id: string;
  slug: string;
  name: string;
  domain?: string | null;
  logo?: string | null;
  description?: string | null;
  headquarters?: string | null;
}

interface OfferCategoryData {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  parent?: {
    id: string;
    name: string;
    slug: string;
    icon?: string | null;
  } | null;
}

interface SearchMatchData {
  score: number;
  matchedTerms: string[];
  matchedCategoryHints: string[];
  locationMatch: 'none' | 'query-city' | 'query-nearby-city' | 'query-province' | 'company-wide';
}

interface OfferData {
  id: string;
  slug?: string;
  title: string;
  description?: string | null;
  discountValue: string;
  image?: string | null;
  featured?: boolean;
  offerType?: string | null;
  offer_type?: string | null;
  config?: Record<string, any> | null;
  configJson?: Record<string, any> | null;
  coverageType?: 'COMPANY_WIDE' | 'PROVINCE_SPECIFIC' | 'CITY_SPECIFIC';
  provinceCode?: string | null;
  cityName?: string | null;
  isEligible?: boolean;
  eligibilityMessage?: string;
  searchMatch?: SearchMatchData;
  vendor: {
    id: string;
    companyName: string;
    logo?: string | null;
  };
  category?: OfferCategoryData | null;
}

type CategorySummary = {
  id: string;
  slug: string;
  name: string;
  count: number;
  description: string;
  image: string;
  color: string;
  bgColor: string;
  subcategories: string[];
};

const categoryMetaBySlug = new Map(
  categoryCatalog.map((category) => [category.id, category])
);

const getPrimaryCategory = (category?: OfferCategoryData | null) => category?.parent || category || null;
const getPrimaryCategoryId = (category?: OfferCategoryData | null) => getPrimaryCategory(category)?.id || null;
const getSecondaryCategoryName = (category?: OfferCategoryData | null) =>
  category?.parent ? category.name : null;

const getCategoryDisplayMeta = (category?: OfferCategoryData | null) => {
  const primaryCategory = getPrimaryCategory(category);
  const meta = primaryCategory?.slug ? categoryMetaBySlug.get(primaryCategory.slug) : undefined;

  return {
    name: primaryCategory?.name || category?.name || 'General',
    slug: primaryCategory?.slug || category?.slug || 'general',
    description:
      meta?.description || 'Verified employee offers curated for your company.',
    image: meta?.image || '/featured_deal.jpg',
    color: meta?.color || 'text-slate-700',
    bgColor: meta?.bgColor || 'bg-slate-100',
  };
};

const getOfferImageSrc = (offer?: Pick<OfferData, 'image'> | null) =>
  offer?.image || DEFAULT_OFFER_IMAGE;

export default function CompanyDealsPage() {
  const { companySlug, companyId } = useParams<{ companySlug?: string; companyId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const companyIdOrSlug = companySlug || companyId || '';

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchError, setSearchError] = useState('');
  const [search, setSearch] = useState('');
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [nearbyExplanation, setNearbyExplanation] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [offers, setOffers] = useState<OfferData[]>([]);
  const [searchResults, setSearchResults] = useState<OfferData[]>([]);
  const [verification, setVerification] = useState<{
    status: string;
    expiresAt: string;
    verifiedAt: string;
  } | null>(null);
  const [viewerLocation, setViewerLocation] = useState<{
    provinceCode?: string | null;
    cityName?: string | null;
  } | null>(null);
  const [emptyCategory, setEmptyCategory] = useState<CategorySummary | null>(null);

  useEffect(() => {
    if (!companyIdOrSlug) return;

    let cancelled = false;
    const loadDeals = async () => {
      setIsLoading(true);
      setError('');
      try {
        const data = await api.getCompanyDeals(companyIdOrSlug);
        if (cancelled) return;
        setCompany(data.company || null);
        setOffers(data.offers || []);
        setVerification(data.verification || null);
        setViewerLocation(data.viewerLocation || null);
      } catch (err: any) {
        if (cancelled) return;
        if (err.code === 'NOT_VERIFIED' || err.status === 401) {
          navigate(`/verify?company=${encodeURIComponent(companyIdOrSlug)}`, {
            state: { redirectTo: location.pathname },
            replace: true,
          });
          return;
        }
        setError(err.message || 'Failed to load company deals');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadDeals();
    return () => {
      cancelled = true;
    };
  }, [companyIdOrSlug, location.pathname, navigate]);

  useEffect(() => {
    const query = search.trim();
    if (!query) {
      setSearchResults([]);
      setSearchError('');
      setNearbyExplanation(null);
      setIsSearchLoading(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setIsSearchLoading(true);
      setSearchError('');
      try {
        const data = await api.searchCompanyDeals(companyIdOrSlug, query);
        if (cancelled) return;
        setSearchResults(data.results || []);
        setNearbyExplanation(data.nearbyExplanation || null);
      } catch (err: any) {
        if (cancelled) return;
        setSearchResults([]);
        setNearbyExplanation(null);
        setSearchError(err.message || 'Unable to search company deals right now');
      } finally {
        if (!cancelled) setIsSearchLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [companyIdOrSlug, search]);

  const featuredOffers = useMemo(
    () => offers.filter((offer) => offer.featured).slice(0, 3),
    [offers]
  );

  const resolvedLocation = viewerLocation || {
    provinceCode: user?.provinceCode || null,
    cityName: user?.cityName || null,
  };
  const welcomeName = getUserDisplayName(user);
  const heroLocationText =
    resolvedLocation?.cityName && resolvedLocation?.provinceCode
      ? `${resolvedLocation.cityName}, ${resolvedLocation.provinceCode}`
      : resolvedLocation?.provinceCode || 'Location not set';
  const verificationStatusText = verification?.expiresAt
    ? `Verified until ${new Date(verification.expiresAt).toLocaleDateString()}`
    : 'Verification required for local deal access';
  const heroCompanyLine =
    resolvedLocation?.cityName && resolvedLocation?.provinceCode
      ? `Great offers for ${company?.name || 'your company'} employees in ${resolvedLocation.cityName}, ${resolvedLocation.provinceCode}`
      : resolvedLocation?.provinceCode
      ? `Great offers for ${company?.name || 'your company'} employees in ${resolvedLocation.provinceCode}`
      : `Great offers for ${company?.name || 'your company'} employees`;

  const getCoverageLabel = (offer: OfferData) => {
    if (offer.coverageType === 'CITY_SPECIFIC' && offer.cityName && offer.provinceCode) {
      return `${offer.cityName}, ${offer.provinceCode} only`;
    }
    if (offer.coverageType === 'PROVINCE_SPECIFIC' && offer.provinceCode) {
      return `${offer.provinceCode} only`;
    }
    return 'All locations';
  };

  const categorySummaries = useMemo<CategorySummary[]>(() => {
    const grouped = new Map<string, CategorySummary>();

    for (const offer of offers) {
      const primaryCategory = getPrimaryCategory(offer.category);
      if (!primaryCategory?.id || !primaryCategory.slug) continue;
      const displayMeta = getCategoryDisplayMeta(offer.category);
      const secondaryCategoryName = getSecondaryCategoryName(offer.category);
      const existing = grouped.get(primaryCategory.id);

      if (existing) {
        existing.count += 1;
        if (secondaryCategoryName && !existing.subcategories.includes(secondaryCategoryName)) {
          existing.subcategories.push(secondaryCategoryName);
        }
        continue;
      }

      grouped.set(primaryCategory.id, {
        id: primaryCategory.id,
        slug: displayMeta.slug,
        name: displayMeta.name,
        count: 1,
        description: displayMeta.description,
        image: displayMeta.image,
        color: displayMeta.color,
        bgColor: displayMeta.bgColor,
        subcategories: secondaryCategoryName ? [secondaryCategoryName] : [],
      });
    }

    return Array.from(grouped.values())
      .sort((left, right) => right.count - left.count)
      .map((category) => ({
        ...category,
        subcategories: category.subcategories.sort((left, right) => left.localeCompare(right)),
      }));
  }, [offers]);

  const allCategorySummaries = useMemo<CategorySummary[]>(() => {
    return categoryCatalog.map((category) => {
      const seededCategory = categorySummaries.find(
        (summary) => summary.slug === category.id
      );

      if (seededCategory) {
        return seededCategory;
      }

      return {
        id: category.id,
        slug: category.id,
        name: category.name,
        count: 0,
        description: category.description,
        image: category.image,
        color: category.color,
        bgColor: category.bgColor,
        subcategories: [],
      };
    });
  }, [categorySummaries]);

  const visibleOffers = useMemo(() => {
    const base = search.trim() ? searchResults : offers;
    return base.filter((offer) => {
      if (!selectedCategory) return true;
      return getPrimaryCategoryId(offer.category) === selectedCategory;
    });
  }, [offers, search, searchResults, selectedCategory]);

  const listHeadingText = search.trim()
    ? `Search results for "${search.trim()}"`
    : `All ${company?.name || ''} deals`;

  const listSubheadingText = search.trim()
    ? `Showing ${visibleOffers.length} matching deals`
    : selectedCategory
    ? `Showing ${visibleOffers.length} deals in the selected category`
    : `Showing ${visibleOffers.length} available deals`;

  const handlePrimaryAction = (offer: OfferData) => {
    navigate(`/offer/${encodeURIComponent(offer.slug || offer.id)}`);
  };

  const handleCategorySelect = (category: CategorySummary) => {
    if (category.count === 0) {
      setEmptyCategory(category);
      return;
    }

    setSelectedCategory(category.id);
  };

  const renderOfferCard = (offer: OfferData) => {
    const primaryCategory = getPrimaryCategory(offer.category);
    const secondaryCategoryName = getSecondaryCategoryName(offer.category);
    const isNearbyMatch = offer.searchMatch?.locationMatch === 'query-nearby-city';
    const isProvinceMatch = offer.searchMatch?.locationMatch === 'query-province';

    return (
      <div
        key={offer.id}
        className="rounded-xl border border-slate-200 bg-white hover:shadow-md transition-shadow overflow-hidden text-left"
      >
        <img
          src={getOfferImageSrc(offer)}
          alt={offer.title}
          className="h-40 w-full object-cover"
        />
        <div className="p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
              {offer.discountValue}
            </span>
            {offer.featured && (
              <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                Featured
              </span>
            )}
            {primaryCategory?.name && (
              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                {primaryCategory.name}
              </span>
            )}
            {secondaryCategoryName && (
              <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                {secondaryCategoryName}
              </span>
            )}
          </div>
          <h2 className="font-semibold text-slate-900 line-clamp-2">{offer.title}</h2>
          <p className="mt-2 text-sm text-slate-600 line-clamp-2">
            {offer.description || 'No description provided.'}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
              {getCoverageLabel(offer)}
            </span>
            {isNearbyMatch && (
              <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
                Nearby city match
              </span>
            )}
            {!isNearbyMatch && isProvinceMatch && (
              <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
                Province match
              </span>
            )}
          </div>
          <div className="mt-4 text-xs text-slate-500">
            {offer.vendor.companyName}
            {primaryCategory?.name ? ` | ${primaryCategory.name}` : ''}
          </div>
          {offer.searchMatch?.matchedTerms?.length ? (
            <div className="mt-2 text-xs text-slate-500">
              Matched on {offer.searchMatch.matchedTerms.slice(0, 3).join(', ')}
            </div>
          ) : null}
          {offer.isEligible === false && offer.eligibilityMessage ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {offer.eligibilityMessage}
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => handlePrimaryAction(offer)}
            className="mt-4 inline-flex rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            View deal
          </button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <h1 className="text-xl font-semibold text-slate-900">Company not found</h1>
            <Link to="/" className="mt-4 inline-block text-blue-600 hover:text-blue-700">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-slate-600 hover:text-slate-900">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{company.name} Deals</h1>
              <p className="text-sm text-slate-600">
                Verified employee offers for {company.name}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <section className="mb-8 overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 text-white">
          <div className="px-6 py-8 lg:px-8 lg:py-10">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
              Welcome {welcomeName}
            </p>
            <h2 className="mt-3 max-w-4xl text-3xl font-bold leading-tight lg:text-5xl">
              {heroCompanyLine}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
              {company.description ||
                `Browse all offers available to verified ${company.name} employees.`}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90">
                <Building2 className="h-4 w-4 text-slate-300" />
                {company.name}
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90">
                <MapPin className="h-4 w-4 text-slate-300" />
                {heroLocationText}
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
                <ShieldCheck className="h-4 w-4" />
                {verificationStatusText}
              </div>
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
              Search directly by deal or vendor, or browse categories to find perks picked for your company.
            </p>
          </div>
        </section>

        <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Search A Deal Directly
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                Search by deal, vendor, category, subcategory, or location
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Example: search for <span className="font-semibold text-slate-900">internet Surrey BC</span> or
                <span className="font-semibold text-slate-900"> banking Toronto</span>. Nearby city matches stay visible when they are relevant.
              </p>
            </div>
            <div className="w-full lg:max-w-md">
              <label htmlFor="company-deal-search" className="sr-only">
                Search company deals
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="company-deal-search"
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search deals, vendors, categories, or locations"
                  className="w-full rounded-2xl border border-slate-300 bg-white pl-10 pr-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                />
                {isSearchLoading ? (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-600" />
                ) : null}
              </div>
            </div>
          </div>

          {nearbyExplanation ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700">
              <MapPin className="h-3.5 w-3.5" />
              {nearbyExplanation}
            </div>
          ) : null}

          {searchError ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {searchError}
            </div>
          ) : null}
        </section>

        <section className="mb-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Browse by category
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                Explore perks by category
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                !selectedCategory
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
              }`}
            >
              All categories
            </button>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2">
            {allCategorySummaries.map((category) => {
              const isActive = selectedCategory === category.id;
              const isEmpty = category.count === 0;

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleCategorySelect(category)}
                  className={`group relative min-w-[280px] overflow-hidden rounded-3xl border text-left transition ${
                    isActive
                      ? 'border-slate-900 ring-2 ring-slate-900/10'
                      : 'border-slate-200 hover:border-slate-300'
                  } ${isEmpty ? 'opacity-85' : ''}`}
                >
                  <img
                    src={category.image}
                    alt={`${category.name} deals`}
                    className="h-44 w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div
                    className={`absolute inset-0 ${
                      isEmpty
                        ? 'bg-gradient-to-t from-slate-950 via-slate-900/70 to-slate-800/30'
                        : 'bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent'
                    }`}
                  />
                  <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                    <div className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur">
                      {category.count} deals
                    </div>
                    <h3 className="mt-3 text-xl font-bold">{category.name}</h3>
                    <p className="mt-2 line-clamp-2 text-sm text-white/80">
                      {category.description}
                    </p>
                    {category.subcategories.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {category.subcategories.slice(0, 3).map((subcategory) => (
                          <span
                            key={subcategory}
                            className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white/90 backdrop-blur"
                          >
                            {subcategory}
                          </span>
                        ))}
                      </div>
                    ) : isEmpty ? (
                      <div className="mt-3 inline-flex rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white/90 backdrop-blur">
                        Coming soon
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {featuredOffers.length > 0 && !search.trim() && !selectedCategory && (
          <section className="mb-8">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Featured for {company.name}
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  Start with the top employee picks
                </h2>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
                <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                Featured deals
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              {featuredOffers.map((offer) => (
                <div
                  key={offer.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <img
                    src={getOfferImageSrc(offer)}
                    alt={offer.title}
                    className="h-44 w-full object-cover"
                  />
                  <div className="p-5">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                        {offer.discountValue}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                        <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                        Featured
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 line-clamp-2">
                      {offer.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600 line-clamp-2">
                      {offer.description || 'No description provided.'}
                    </p>
                    <div className="mt-3 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {getCoverageLabel(offer)}
                    </div>
                    <div className="mt-4 text-xs text-slate-500">
                      {offer.vendor.companyName}
                      {offer.category?.name ? ` | ${getCategoryDisplayMeta(offer.category).name}` : ''}
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePrimaryAction(offer)}
                      className="mt-4 inline-flex rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      View deal
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{listHeadingText}</h2>
            <p className="mt-1 text-sm text-slate-500">{listSubheadingText}</p>
          </div>
        </div>

        {visibleOffers.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
            {search.trim()
              ? 'No deals matched this search. Try a vendor name, category, subcategory, or nearby city.'
              : 'No deals found for this category.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleOffers.map((offer) => renderOfferCard(offer))}
          </div>
        )}
      </main>

      <Dialog open={!!emptyCategory} onOpenChange={(open) => (!open ? setEmptyCategory(null) : null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>No deals in {emptyCategory?.name} yet</DialogTitle>
            <DialogDescription className="text-sm leading-6 text-slate-600">
              We do not have deals in this category or its subcategories right now, but our team is
              working to bring these offers to you.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setEmptyCategory(null)}
              className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Continue browsing
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
