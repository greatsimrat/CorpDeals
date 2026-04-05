import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Loader2,
  MapPin,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import OfferActionModal from '../components/OfferActionModal';
import OfferDynamicSectionRenderer from '../components/offers/OfferDynamicSectionRenderer';
import OfferHighlightsSection from '../components/offers/OfferHighlightsSection';
import {
  getCoverageLabel,
  normalizeDetailSections,
  normalizeDetailTemplateType,
  normalizeHighlights,
  orderDetailSections,
  type DetailTemplateType,
  type OfferDetailSection,
} from '../lib/offer-details';

const DEFAULT_OFFER_IMAGE = '/default-offer-card.png';

interface OfferDetails {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  discountValue: string;
  originalPrice?: string | null;
  discountedPrice?: string | null;
  termsText?: string | null;
  termsUrl?: string | null;
  cancellationPolicyText?: string | null;
  cancellationPolicyUrl?: string | null;
  restrictionsText?: string | null;
  howToClaim?: string[];
  image?: string | null;
  imageUrl?: string | null;
  expiryDate?: string | null;
  coverageType?: 'COMPANY_WIDE' | 'PROVINCE_SPECIFIC' | 'CITY_SPECIFIC';
  provinceCode?: string | null;
  cityName?: string | null;
  locationApplicability?: 'ALL_LOCATIONS' | 'PROVINCE_SPECIFIC' | 'CITY_SPECIFIC';
  detailTemplateType?: DetailTemplateType;
  highlightsJson?: unknown;
  detailSectionsJson?: unknown;
  isEligible?: boolean;
  eligibilityMessage?: string;
  vendor: {
    id: string;
    companyName: string;
    logo?: string | null;
    website?: string | null;
  };
  company: {
    id: string;
    slug: string;
    name: string;
    domain?: string | null;
    logo?: string | null;
  };
  category?: {
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
  } | null;
  subcategory?: {
    id: string;
    name: string;
    slug: string;
    icon?: string | null;
  } | null;
}

export default function OfferPage() {
  const { offerSlug } = useParams<{ offerSlug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [offer, setOffer] = useState<OfferDetails | null>(null);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [claimSuccessMessage, setClaimSuccessMessage] = useState('');
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [verification, setVerification] = useState<{
    status: string;
    expiresAt: string;
    verifiedAt: string;
  } | null>(null);

  useEffect(() => {
    if (!offerSlug) return;
    if (authLoading) return;

    if (!isAuthenticated) {
      navigate('/login', { state: { from: location }, replace: true });
      return;
    }

    let cancelled = false;
    const loadOffer = async () => {
      setIsLoading(true);
      setError('');
      try {
        const access = await api.getOfferAccess(offerSlug);
        if (cancelled) return;

        if (!access.canAccess) {
          const companySlug = access.company?.slug || access.company?.id;
          navigate(`/verify?company=${encodeURIComponent(companySlug)}`, {
            state: { redirectTo: location.pathname },
            replace: true,
          });
          return;
        }

        setOffer(
          access.offer
            ? {
                ...access.offer,
                isEligible: access.isEligible,
                eligibilityMessage: access.eligibilityMessage,
              }
            : null
        );
        setVerification(access.verification || null);

        if (access.isEligible) {
          const claimStatus = await api.getOfferClaimStatus(offerSlug);
          if (cancelled) return;
          setHasClaimed(!!claimStatus.hasClaimed);
          if (claimStatus.hasClaimed) {
            setClaimSuccessMessage('You already applied for this offer.');
          }
        } else {
          setHasClaimed(false);
        }
      } catch (err: any) {
        if (cancelled) return;
        if (err.code === 'NOT_VERIFIED') {
          const companySlug = err.company?.slug || offer?.company?.slug;
          navigate(`/verify?company=${encodeURIComponent(companySlug || '')}`, {
            state: { redirectTo: location.pathname },
            replace: true,
          });
          return;
        }
        setError(err.message || 'Failed to load offer');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadOffer();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, location, navigate, offerSlug, offer?.company?.slug]);

  const handleOpenApply = () => {
    if (!offer || !offer.isEligible) return;
    setIsApplyModalOpen(true);
  };

  const primaryCategory = offer?.category?.parent || offer?.category || null;
  const secondaryCategory = offer?.subcategory || (offer?.category?.parent ? offer.category : null);
  const offerImage = offer?.imageUrl || offer?.image || DEFAULT_OFFER_IMAGE;
  const locationLabel = offer ? getCoverageLabel(offer) : 'All locations';
  const highlights = useMemo(() => normalizeHighlights(offer?.highlightsJson), [offer?.highlightsJson]);
  const detailTemplateType = normalizeDetailTemplateType(offer?.detailTemplateType);
  const dynamicSections = useMemo<OfferDetailSection[]>(
    () => orderDetailSections(detailTemplateType, normalizeDetailSections(offer?.detailSectionsJson)),
    [detailTemplateType, offer?.detailSectionsJson]
  );

  const fallbackSections = useMemo<OfferDetailSection[]>(() => {
    if (dynamicSections.length > 0) return dynamicSections;
    if (!offer?.description) return [];
    return [
      {
        type: 'fine_print',
        title: 'Offer details',
        description: 'Everything you need to know about this offer.',
        content: offer.description,
        items: [],
      },
    ];
  }, [dynamicSections, offer?.description]);

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <h1 className="text-xl font-semibold text-slate-900">Offer not found</h1>
            <Link to="/" className="mt-4 inline-block text-blue-600 hover:text-blue-700">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const termsHref = offer.termsUrl || '#terms';
  const cancellationHref = offer.cancellationPolicyUrl || '#cancellation-policy';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <Link to={`/c/${offer.company.slug}`} className="text-slate-600 hover:text-slate-900">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{offer.title}</h1>
              <p className="text-sm text-slate-600">{offer.company.name} employee deal</p>
            </div>
          </div>
          {verification?.expiresAt ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
              <ShieldCheck className="w-4 h-4" />
              Verified until {new Date(verification.expiresAt).toLocaleDateString()}
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <section className="grid gap-6 lg:grid-cols-[1.7fr_0.9fr]">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <img src={offerImage} alt={offer.title} className="h-72 w-full object-cover lg:h-96" />
            <div className="p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  <Tag className="w-3.5 h-3.5" />
                  {offer.discountValue}
                </span>
                {primaryCategory ? (
                  <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                    {primaryCategory.name}
                  </span>
                ) : null}
                {secondaryCategory ? (
                  <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-700">
                    {secondaryCategory.name}
                  </span>
                ) : null}
                <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                  {locationLabel}
                </span>
              </div>

              <h2 className="mt-4 text-3xl font-bold text-slate-900">{offer.title}</h2>
              <p className="mt-2 text-sm text-slate-600">
                Offered by <span className="font-semibold text-slate-900">{offer.vendor.companyName}</span>
              </p>
              <p className="mt-4 text-sm leading-6 text-slate-700">
                {offer.description || 'No offer description available.'}
              </p>
            </div>
          </div>

          <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">Apply for this deal</h2>
            <p className="mt-2 text-sm text-slate-600">
              Deal provided by {offer.vendor.companyName} for verified {offer.company.name} employees.
            </p>

            {offer.expiryDate ? (
              <div className="mt-4 inline-flex items-center gap-2 text-xs text-slate-600">
                <Calendar className="w-4 h-4" />
                Expires {new Date(offer.expiryDate).toLocaleDateString()}
              </div>
            ) : null}

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-2 text-sm font-medium text-slate-900">
                <MapPin className="mt-0.5 w-4 h-4" />
                <div>
                  <p>{offer.eligibilityMessage || locationLabel}</p>
                  <p className="mt-2 text-xs text-slate-500">Offer location: {locationLabel}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Your location:{' '}
                    {user?.cityName && user?.provinceCode
                      ? `${user.cityName}, ${user.provinceCode}`
                      : user?.provinceCode
                      ? user.provinceCode
                      : 'Not set'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              <a
                href={termsHref}
                target={offer.termsUrl ? '_blank' : undefined}
                rel={offer.termsUrl ? 'noreferrer' : undefined}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                View terms
              </a>
              <a
                href={cancellationHref}
                target={offer.cancellationPolicyUrl ? '_blank' : undefined}
                rel={offer.cancellationPolicyUrl ? 'noreferrer' : undefined}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                View cancellation policy
              </a>
            </div>

            <div className="mt-6">
              {hasClaimed ? (
                <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                  <CheckCircle2 className="w-4 h-4 mt-0.5" />
                  <span>{claimSuccessMessage || 'You already applied for this offer.'}</span>
                </div>
              ) : (
                <button
                  onClick={handleOpenApply}
                  disabled={!offer.isEligible}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 text-white font-semibold hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {offer.isEligible ? 'Apply for this offer' : 'Not available in your location'}
                </button>
              )}
            </div>

            {error ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="mt-6 flex items-center gap-2 text-xs text-slate-500">
              <Building2 className="w-4 h-4" />
              One application per user per offer.
            </div>
          </aside>
        </section>

        <div className="mt-8 space-y-6">
          <OfferHighlightsSection items={highlights} />
          <OfferDynamicSectionRenderer sections={fallbackSections} />

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">Policies and restrictions</h2>
            <div className="mt-4 space-y-3">
              <details id="terms" className="rounded-lg border border-slate-200 bg-slate-50 p-3" open>
                <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                  Terms &amp; Conditions
                </summary>
                <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                  {offer.termsText || 'See the linked terms for the latest details.'}
                </pre>
              </details>

              <details
                id="cancellation-policy"
                className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                open
              >
                <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                  Cancellation/Refund Policy
                </summary>
                <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                  {offer.cancellationPolicyText || 'See the linked cancellation policy for the latest details.'}
                </pre>
              </details>

              {offer.restrictionsText ? (
                <details className="rounded-lg border border-slate-200 bg-slate-50 p-3" open>
                  <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                    Restrictions
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                    {offer.restrictionsText}
                  </pre>
                </details>
              ) : null}
            </div>
          </section>
        </div>
      </main>

      <OfferActionModal
        open={isApplyModalOpen}
        offer={
          offer
            ? {
                id: offer.id,
                slug: offer.slug,
                title: offer.title,
                description: offer.description,
                vendor: offer.vendor,
              }
            : null
        }
        company={offer?.company || null}
        onClose={() => setIsApplyModalOpen(false)}
      />
    </div>
  );
}
