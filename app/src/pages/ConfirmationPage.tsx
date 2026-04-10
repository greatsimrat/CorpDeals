import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import api from '../services/api';

interface OfferSummary {
  id: string;
  title: string;
  company: {
    id: string;
    slug: string;
    name: string;
  };
  vendor: {
    companyName: string;
  };
}

export default function ConfirmationPage() {
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const offerId = searchParams.get('offerId') || '';
  const companyId = searchParams.get('companyId') || '';

  const [offer, setOffer] = useState<OfferSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!offerId) return;
    let cancelled = false;
    const loadOffer = async () => {
      setIsLoading(true);
      try {
        const data = await api.getOffer(offerId);
        if (cancelled) return;
        setOffer({
          id: data.id,
          title: data.title,
          company: {
            id: data.company?.id,
            slug: data.company?.slug,
            name: data.company?.name,
          },
          vendor: {
            companyName: data.vendor?.companyName,
          },
        });
      } catch (error) {
        console.error('Failed to load offer for confirmation', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadOffer();
    return () => {
      cancelled = true;
    };
  }, [offerId]);

  const backDealsPath = offer?.company?.slug
    ? `/c/${offer.company.slug}`
    : companyId
    ? `/c/${companyId}`
    : '/';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
          <Link to={backDealsPath} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" />
            Back to deals
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8">
          <div className="flex items-center gap-3 text-green-700">
            <CheckCircle2 className="w-6 h-6" />
            <h1 className="text-2xl font-bold text-slate-900">Submitted successfully</h1>
          </div>

          {isLoading && (
            <div className="mt-4 inline-flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading details...
            </div>
          )}

          <div className="mt-5 space-y-3 text-slate-700">
            <p>
              Your request has been submitted{offer?.title ? ` for "${offer.title}"` : ''}.
            </p>
            <p>
              {offer?.vendor?.companyName ? `${offer.vendor.companyName} ` : 'The vendor '}
              will contact you in 2-3 business days.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to={backDealsPath}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Back to deals
            </Link>
            <Link
              to="/my-applications"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              View My Applications
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
