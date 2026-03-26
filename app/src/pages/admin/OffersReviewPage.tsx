import { useEffect, useState } from 'react';
import api from '../../services/api';

type OfferReviewRow = {
  id: string;
  title: string;
  active: boolean;
  complianceStatus: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  complianceNotes?: string | null;
  termsText: string;
  cancellationPolicyText: string;
  redemptionInstructionsText?: string | null;
  restrictionsText?: string | null;
  vendorAttestationAcceptedAt?: string | null;
  vendorAttestationAcceptedIp?: string | null;
  updatedAt: string;
  vendor: {
    id: string;
    companyName: string;
    contactName: string;
    email: string;
  };
  company: {
    id: string;
    name: string;
    slug: string;
  };
};

export default function OffersReviewPage() {
  const [offers, setOffers] = useState<OfferReviewRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedOffer, setSelectedOffer] = useState<OfferReviewRow | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');

  const loadOffers = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await api.getAdminOffersReview({ status: 'SUBMITTED' });
      setOffers(data as OfferReviewRow[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load offer review queue');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOffers();
  }, []);

  const approveOffer = async (offerId: string) => {
    try {
      setIsSaving(true);
      setError('');
      await api.approveAdminOfferReview(offerId);
      setSelectedOffer(null);
      setRejectionNotes('');
      await loadOffers();
    } catch (err: any) {
      setError(err.message || 'Failed to approve offer');
    } finally {
      setIsSaving(false);
    }
  };

  const rejectOffer = async (offerId: string) => {
    if (!rejectionNotes.trim()) {
      setError('Rejection notes are required');
      return;
    }
    try {
      setIsSaving(true);
      setError('');
      await api.rejectAdminOfferReview(offerId, rejectionNotes.trim());
      setSelectedOffer(null);
      setRejectionNotes('');
      await loadOffers();
    } catch (err: any) {
      setError(err.message || 'Failed to reject offer');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-slate-900">Offers Review</h1>
        <p className="mt-1 text-sm text-slate-600">
          Review submitted offers before they can go live.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      ) : null}

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
          Loading submitted offers...
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[900px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Offer
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Vendor
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Company
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Submitted
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {offers.map((offer) => (
                <tr key={offer.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{offer.title}</p>
                    <p className="text-xs text-slate-500">ID: {offer.id}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    <p>{offer.vendor.companyName}</p>
                    <p className="text-xs text-slate-500">{offer.vendor.email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{offer.company.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {offer.vendorAttestationAcceptedAt
                      ? new Date(offer.vendorAttestationAcceptedAt).toLocaleString()
                      : new Date(offer.updatedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOffer(offer);
                        setRejectionNotes('');
                      }}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
              {offers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                    No submitted offers are waiting for review.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      {selectedOffer ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{selectedOffer.title}</h2>
                <p className="text-sm text-slate-600">
                  {selectedOffer.vendor.companyName} for {selectedOffer.company.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedOffer(null);
                  setRejectionNotes('');
                }}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p>
                  <strong>Attested at:</strong>{' '}
                  {selectedOffer.vendorAttestationAcceptedAt
                    ? new Date(selectedOffer.vendorAttestationAcceptedAt).toLocaleString()
                    : 'N/A'}
                </p>
                <p>
                  <strong>Attested IP:</strong> {selectedOffer.vendorAttestationAcceptedIp || 'N/A'}
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-700">Terms & Conditions</h3>
                <pre className="whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  {selectedOffer.termsText}
                </pre>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-700">
                  Cancellation/Refund Policy
                </h3>
                <pre className="whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  {selectedOffer.cancellationPolicyText}
                </pre>
              </div>

              {selectedOffer.restrictionsText ? (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-slate-700">Restrictions</h3>
                  <pre className="whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    {selectedOffer.restrictionsText}
                  </pre>
                </div>
              ) : null}

              {selectedOffer.redemptionInstructionsText ? (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-slate-700">
                    Redemption Instructions
                  </h3>
                  <pre className="whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    {selectedOffer.redemptionInstructionsText}
                  </pre>
                </div>
              ) : null}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Rejection notes (required for reject)
                </label>
                <textarea
                  rows={4}
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                  placeholder="Explain what needs to be fixed before resubmission"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => rejectOffer(selectedOffer.id)}
                className="rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Reject'}
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => approveOffer(selectedOffer.id)}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Approve & Go Live'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
