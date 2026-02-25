import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

interface OfferDetails {
  id: string;
  title: string;
  description?: string | null;
  discountValue: string;
  originalPrice?: string | null;
  discountedPrice?: string | null;
  termsText?: string | null;
  cancellationPolicyText?: string | null;
  restrictionsText?: string | null;
  howToClaim?: string[];
  image?: string | null;
  expiryDate?: string | null;
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
  } | null;
}

export default function OfferPage() {
  const { offerId } = useParams<{ offerId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState('');
  const [offer, setOffer] = useState<OfferDetails | null>(null);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [claimSuccessMessage, setClaimSuccessMessage] = useState('');
  const [verification, setVerification] = useState<{
    status: string;
    expiresAt: string;
    verifiedAt: string;
  } | null>(null);

  useEffect(() => {
    if (!offerId) return;
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
        const access = await api.getOfferAccess(offerId);
        if (cancelled) return;

        if (!access.canAccess) {
          const companySlug = access.company?.slug || access.company?.id;
          navigate(`/verify?company=${encodeURIComponent(companySlug)}`, {
            state: { redirectTo: location.pathname },
            replace: true,
          });
          return;
        }

        setOffer(access.offer || null);
        setVerification(access.verification || null);

        const claimStatus = await api.getOfferClaimStatus(offerId);
        if (cancelled) return;
        setHasClaimed(!!claimStatus.hasClaimed);
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
  }, [authLoading, isAuthenticated, location, navigate, offerId]);

  const handleClaim = async () => {
    if (!offer) return;
    setIsClaiming(true);
    setError('');
    try {
      const result = await api.claimOffer(offer.id);
      setHasClaimed(true);
      setClaimSuccessMessage(result.message || 'Offer claimed successfully');
    } catch (err: any) {
      if (err.code === 'NOT_VERIFIED') {
        navigate(`/verify?company=${encodeURIComponent(offer.company.slug)}`, {
          state: { redirectTo: location.pathname },
          replace: true,
        });
        return;
      }
      if ((err.message || '').toLowerCase().includes('already claimed')) {
        setHasClaimed(true);
        setClaimSuccessMessage('You have already claimed this offer.');
        return;
      }
      setError(err.message || 'Failed to claim offer');
    } finally {
      setIsClaiming(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to={`/c/${offer.company.slug}`}
              className="text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{offer.title}</h1>
              <p className="text-sm text-slate-600">{offer.company.name} employee deal</p>
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

      <main className="mx-auto max-w-6xl px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 rounded-xl border border-slate-200 bg-white overflow-hidden">
          {offer.image && (
            <img src={offer.image} alt={offer.title} className="w-full h-64 object-cover" />
          )}
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                <Tag className="w-3.5 h-3.5" />
                {offer.discountValue}
              </span>
              {offer.category?.name && (
                <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                  {offer.category.name}
                </span>
              )}
            </div>

            <p className="text-slate-700 leading-relaxed">
              {offer.description || 'No offer description available.'}
            </p>

            {(offer.originalPrice || offer.discountedPrice) && (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {offer.originalPrice && (
                  <div className="rounded-lg border border-slate-200 p-4">
                    <p className="text-xs text-slate-500">Original Price</p>
                    <p className="mt-1 text-lg font-semibold text-slate-500 line-through">
                      {offer.originalPrice}
                    </p>
                  </div>
                )}
                {offer.discountedPrice && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs text-emerald-700">Employee Price</p>
                    <p className="mt-1 text-lg font-semibold text-emerald-800">
                      {offer.discountedPrice}
                    </p>
                  </div>
                )}
              </div>
            )}

            {offer.howToClaim && offer.howToClaim.length > 0 && (
              <div className="mt-8">
                <h2 className="text-base font-semibold text-slate-900 mb-3">How to claim</h2>
                <ol className="space-y-2">
                  {offer.howToClaim.map((item, index) => (
                    <li key={`${index}-${item}`} className="text-sm text-slate-700">
                      {index + 1}. {item}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="mt-8 space-y-3">
              <details className="rounded-lg border border-slate-200 bg-slate-50 p-3" open>
                <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                  Terms &amp; Conditions
                </summary>
                <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                  {offer.termsText || ''}
                </pre>
              </details>

              <details className="rounded-lg border border-slate-200 bg-slate-50 p-3" open>
                <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                  Cancellation/Refund Policy
                </summary>
                <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                  {offer.cancellationPolicyText || ''}
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
          </div>
        </section>

        <aside className="rounded-xl border border-slate-200 bg-white p-6 h-fit">
          <h2 className="text-lg font-semibold text-slate-900">Claim this deal</h2>
          <p className="mt-2 text-sm text-slate-600">
            Deal provided by {offer.vendor.companyName} for verified {offer.company.name} employees.
          </p>

          {offer.expiryDate && (
            <div className="mt-4 inline-flex items-center gap-2 text-xs text-slate-600">
              <Calendar className="w-4 h-4" />
              Expires {new Date(offer.expiryDate).toLocaleDateString()}
            </div>
          )}

          <div className="mt-6">
            {hasClaimed ? (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 text-sm flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5" />
                <span>{claimSuccessMessage || 'You already claimed this offer.'}</span>
              </div>
            ) : (
              <button
                onClick={handleClaim}
                disabled={isClaiming}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                {isClaiming ? 'Claiming...' : 'Claim offer'}
              </button>
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6 text-xs text-slate-500 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            One claim per user per offer.
          </div>
        </aside>
      </main>
    </div>
  );
}
