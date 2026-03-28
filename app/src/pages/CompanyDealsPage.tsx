import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, Loader2, Search, ShieldCheck, Star } from 'lucide-react';
import api from '../services/api';
import OfferActionModal from '../components/OfferActionModal';

interface CompanyData {
  id: string;
  slug: string;
  name: string;
  domain?: string | null;
  logo?: string | null;
  description?: string | null;
  headquarters?: string | null;
}

interface OfferData {
  id: string;
  title: string;
  description?: string | null;
  discountValue: string;
  image?: string | null;
  featured?: boolean;
  offerType?: string | null;
  offer_type?: string | null;
  config?: Record<string, any> | null;
  configJson?: Record<string, any> | null;
  vendor: {
    id: string;
    companyName: string;
    logo?: string | null;
  };
  category?: {
    id: string;
    name: string;
    slug: string;
    icon?: string | null;
  } | null;
}

export default function CompanyDealsPage() {
  const { companySlug, companyId } = useParams<{ companySlug?: string; companyId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const companyIdOrSlug = companySlug || companyId || '';

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [offers, setOffers] = useState<OfferData[]>([]);
  const [verification, setVerification] = useState<{
    status: string;
    expiresAt: string;
    verifiedAt: string;
  } | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<OfferData | null>(null);

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

  const filteredOffers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return offers.filter((offer) => {
      const matchesCategory = selectedCategory ? offer.category?.id === selectedCategory : true;
      if (!q) return matchesCategory;
      return (
        matchesCategory &&
        (
          offer.title.toLowerCase().includes(q) ||
          (offer.description || '').toLowerCase().includes(q) ||
          offer.vendor.companyName.toLowerCase().includes(q) ||
          (offer.category?.name || '').toLowerCase().includes(q)
        )
      );
    });
  }, [offers, search, selectedCategory]);

  const featuredOffers = useMemo(
    () => offers.filter((offer) => offer.featured).slice(0, 3),
    [offers]
  );

  const categorySummaries = useMemo(() => {
    const grouped = new Map<string, { id: string; name: string; count: number }>();

    for (const offer of offers) {
      if (!offer.category?.id || !offer.category?.name) continue;
      const existing = grouped.get(offer.category.id);
      if (existing) {
        existing.count += 1;
      } else {
        grouped.set(offer.category.id, {
          id: offer.category.id,
          name: offer.category.name,
          count: 1,
        });
      }
    }

    return Array.from(grouped.values()).sort((left, right) => right.count - left.count);
  }, [offers]);

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
          {verification?.expiresAt && (
            <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
              <ShieldCheck className="w-4 h-4" />
              Verified until {new Date(verification.expiresAt).toLocaleDateString()}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-sm text-slate-700">
              {company.description || `Browse all offers available to verified ${company.name} employees.`}
            </div>
          </div>
        </div>

        {featuredOffers.length > 0 && (
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
                  {offer.image && (
                    <img
                      src={offer.image}
                      alt={offer.title}
                      className="h-44 w-full object-cover"
                    />
                  )}
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
                    <div className="mt-4 text-xs text-slate-500">
                      {offer.vendor.companyName}
                      {offer.category?.name ? ` | ${offer.category.name}` : ''}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedOffer(offer)}
                      className="mt-4 inline-flex rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Apply now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {categorySummaries.length > 0 && (
          <section className="mb-8">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Browse by category
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                Explore the savings that matter to {company.name} employees
              </h2>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  !selectedCategory
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <p className="text-sm font-semibold">All deals</p>
                <p className={`mt-1 text-xs ${!selectedCategory ? 'text-slate-300' : 'text-slate-500'}`}>
                  {offers.length} available
                </p>
              </button>

              {categorySummaries.map((category) => {
                const isActive = selectedCategory === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategory(category.id)}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      isActive
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <p className="text-sm font-semibold">{category.name}</p>
                    <p className={`mt-1 text-xs ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                      {category.count} deals
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">All {company.name} deals</h2>
            <p className="mt-1 text-sm text-slate-500">
              {selectedCategory
                ? `Showing ${filteredOffers.length} deals in the selected category`
                : `Showing ${filteredOffers.length} available deals`}
            </p>
          </div>

          <div className="relative max-w-md flex-1 lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search deals by title, vendor, or category"
              className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
            />
          </div>
        </div>

        {filteredOffers.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
            No deals found for this search.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredOffers.map((offer) => (
              <div
                key={offer.id}
                className="rounded-xl border border-slate-200 bg-white hover:shadow-md transition-shadow overflow-hidden text-left"
              >
                {offer.image && (
                  <img
                    src={offer.image}
                    alt={offer.title}
                    className="h-40 w-full object-cover"
                  />
                )}
                <div className="p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                      {offer.discountValue}
                    </span>
                    {offer.featured && (
                      <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                        Featured
                      </span>
                    )}
                  </div>
                  <h2 className="font-semibold text-slate-900 line-clamp-2">{offer.title}</h2>
                  <p className="mt-2 text-sm text-slate-600 line-clamp-2">
                    {offer.description || 'No description provided.'}
                  </p>
                  <div className="mt-4 text-xs text-slate-500">
                    {offer.vendor.companyName}
                    {offer.category?.name ? ` | ${offer.category.name}` : ''}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedOffer(offer)}
                    className="mt-4 inline-flex rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Apply
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <OfferActionModal
        open={!!selectedOffer}
        offer={selectedOffer}
        company={company}
        onClose={() => setSelectedOffer(null)}
      />
    </div>
  );
}
