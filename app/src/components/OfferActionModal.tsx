import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Building2, Loader2, X } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

interface OfferModalData {
  id: string;
  title: string;
  description?: string | null;
  vendor: {
    id: string;
    companyName: string;
    logo?: string | null;
  };
}

interface CompanyContext {
  id: string;
  slug?: string;
  name?: string;
}

interface OfferActionModalProps {
  open: boolean;
  offer: OfferModalData | null;
  company: CompanyContext | null;
  onClose: () => void;
}

export default function OfferActionModal({ open, offer, company, onClose }: OfferActionModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showActiveCompanyMismatch, setShowActiveCompanyMismatch] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setIsSubmitting(false);
    setShowActiveCompanyMismatch(false);
    setName(user?.name || '');
    setEmail(user?.email || '');
    setPhone('');
    setConsent(false);
  }, [open, user?.email, user?.name, offer?.id]);

  if (!open || !offer) return null;

  const companyIdForGuard = company?.id || '';

  const openVerify = (companyId?: string) => {
    const resolvedCompanyId = companyId || companyIdForGuard;
    onClose();
    navigate(`/verify?companyId=${encodeURIComponent(resolvedCompanyId)}`, {
      state: { redirectTo: `${location.pathname}${location.search}` },
    });
  };

  const goToConfirmation = () => {
    const params = new URLSearchParams({
      type: 'lead',
      offerId: offer.id,
      companyId: companyIdForGuard,
    });
    onClose();
    navigate(`/confirmation?${params.toString()}`);
  };

  const handleSubmit = async () => {
    if (!offer) return;
    setIsSubmitting(true);
    setError('');
    setShowActiveCompanyMismatch(false);

    try {
      await api.performOfferAction(offer.id, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        consent,
      });
      goToConfirmation();
    } catch (err: any) {
      if (err.code === 'VERIFY_REQUIRED') {
        openVerify(err.companyId || companyIdForGuard);
        return;
      }
      if (err.code === 'ACTIVE_COMPANY_MISMATCH') {
        setShowActiveCompanyMismatch(true);
        setError('Your active company does not match this offer. Switch active company to continue.');
        return;
      }
      setError(err.message || 'Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{offer.title}</h2>
            <p className="mt-1 text-sm text-slate-600 flex items-center gap-1">
              <Building2 className="w-4 h-4" />
              {offer.vendor.companyName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-600">
            Complete this form and the vendor will contact you directly.
          </p>
          <div className="space-y-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
            />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
            />
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1"
              />
              <span>I consent to share my details with this vendor for follow-up.</span>
            </label>
          </div>

          {error && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                <span>{error}</span>
              </div>
              {showActiveCompanyMismatch && (
                <button
                  onClick={() => openVerify(companyIdForGuard)}
                  className="mt-3 rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                >
                  Switch active company
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

