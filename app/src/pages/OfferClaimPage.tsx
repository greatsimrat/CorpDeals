import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

export default function OfferClaimPage() {
  const { offerId } = useParams<{ offerId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [offerTitle, setOfferTitle] = useState('');
  const [companySlug, setCompanySlug] = useState('');

  useEffect(() => {
    if (!offerId) return;
    if (authLoading) return;

    if (!isAuthenticated) {
      navigate('/login', { state: { from: location }, replace: true });
      return;
    }

    let cancelled = false;
    const runClaim = async () => {
      setIsLoading(true);
      setError('');
      try {
        const access = await api.getOfferAccess(offerId);
        if (cancelled) return;

        const slug = access.company?.slug || access.company?.id || '';
        setCompanySlug(slug);
        setOfferTitle(access.offer?.title || 'Offer');

        if (!access.canAccess) {
          navigate(`/verify?company=${encodeURIComponent(slug)}`, {
            state: { redirectTo: location.pathname },
            replace: true,
          });
          return;
        }

        await api.claimOffer(offerId);
      } catch (err: any) {
        if ((err.message || '').toLowerCase().includes('already claimed')) {
          return;
        }
        if (err.code === 'NOT_VERIFIED') {
          const slug = err.company?.slug || companySlug || '';
          navigate(`/verify?company=${encodeURIComponent(slug)}`, {
            state: { redirectTo: location.pathname },
            replace: true,
          });
          return;
        }
        setError(err.message || 'Failed to claim offer');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    runClaim();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, location, navigate, offerId]);

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-xl border border-slate-200 bg-white p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-7 w-7 text-green-600" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900">Deal claimed</h1>
        <p className="mt-2 text-sm text-slate-600">
          {offerTitle ? `You have claimed "${offerTitle}".` : 'Your claim has been recorded.'}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            to={offerId ? `/offers/${offerId}` : '/'}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            View offer
          </Link>
          {companySlug && (
            <Link
              to={`/c/${companySlug}`}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              More deals
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

