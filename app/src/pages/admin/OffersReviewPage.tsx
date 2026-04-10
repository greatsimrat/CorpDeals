import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { getBillingErrorMessage, getBillingReasonMessage } from '../../lib/billing-access';

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

type BillingBlockedOfferRow = {
  offerId: string;
  slug?: string | null;
  title: string;
  offerStatus: string;
  active: boolean;
  complianceStatus?: string | null;
  complianceNotes?: string | null;
  vendorId: string;
  vendorName?: string | null;
  company?: { id: string; name: string } | null;
  blockingAccess?: {
    reasonCode?: string;
    message?: string;
    planName?: string;
  } | null;
};

export default function OffersReviewPage() {
  const [offers, setOffers] = useState<OfferReviewRow[]>([]);
  const [billingBlockedOffers, setBillingBlockedOffers] = useState<BillingBlockedOfferRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedOffer, setSelectedOffer] = useState<OfferReviewRow | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [billingOverride, setBillingOverride] = useState(false);
  const [billingOverrideReason, setBillingOverrideReason] = useState('');

  const loadOffers = async () => {
    try {
      setIsLoading(true);
      setError('');
      const [data, blockedData] = await Promise.all([
        api.getAdminOffersReview({ status: 'SUBMITTED' }),
        api.getAdminBillingBlockedOffers({
          limit: 250,
          statuses: ['SUBMITTED', 'APPROVED', 'LIVE', 'PAUSED'],
        }),
      ]);
      setOffers(data as OfferReviewRow[]);
      setBillingBlockedOffers((blockedData?.results || []) as BillingBlockedOfferRow[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load offer review queue');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOffers();
  }, []);

  const blockedOfferById = useMemo(
    () =>
      Object.fromEntries(
        billingBlockedOffers.map((offer) => [offer.offerId, offer])
      ) as Record<string, BillingBlockedOfferRow>,
    [billingBlockedOffers]
  );

  const approveOffer = async (offerId: string) => {
    if (billingOverride && billingOverrideReason.trim().length < 8) {
      setError('Billing override reason must be at least 8 characters.');
      return;
    }

    try {
      setIsSaving(true);
      setError('');
      await api.approveAdminOfferReview(
        offerId,
        billingOverride
          ? {
              billingOverride: true,
              billingOverrideReason: billingOverrideReason.trim(),
            }
          : undefined
      );
      setSelectedOffer(null);
      setRejectionNotes('');
      setBillingOverride(false);
      setBillingOverrideReason('');
      await loadOffers();
    } catch (err: any) {
      const hint = String(err?.responseBody?.overrideHint || '').trim();
      const base = getBillingErrorMessage(err, 'Failed to approve offer');
      setError(hint ? `${base} ${hint}` : base);
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
      setBillingOverride(false);
      setBillingOverrideReason('');
      await loadOffers();
    } catch (err: any) {
      setError(getBillingErrorMessage(err, 'Failed to reject offer'));
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

      {billingBlockedOffers.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-amber-200 bg-amber-50">
          <div className="border-b border-amber-200 p-4">
            <h2 className="text-lg font-semibold text-amber-900">Offers blocked by billing</h2>
            <p className="mt-1 text-sm text-amber-800">
              These offers cannot stay live until vendor billing eligibility is restored.
            </p>
          </div>
          <table className="w-full min-w-[920px]">
            <thead className="border-b border-amber-200 bg-amber-100/60">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-amber-900">Offer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-amber-900">Vendor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-amber-900">Reason</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-amber-900">Action</th>
              </tr>
            </thead>
            <tbody>
              {billingBlockedOffers.slice(0, 10).map((offer) => (
                <tr key={offer.offerId} className="border-b border-amber-200 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{offer.title}</p>
                    <p className="text-xs text-slate-600">
                      {offer.company?.name || 'Unknown company'} | {offer.offerStatus}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{offer.vendorName || 'Unknown vendor'}</td>
                  <td className="px-4 py-3 text-sm text-amber-900">
                    {getBillingReasonMessage(offer.blockingAccess?.reasonCode, offer.blockingAccess?.message)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/admin/vendors/${offer.vendorId}/billing-plan`}
                      className="rounded-md border border-amber-400 px-3 py-1.5 text-sm font-semibold text-amber-900 hover:bg-amber-100"
                    >
                      Fix billing
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
                    {blockedOfferById[offer.id] ? (
                      <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                        Billing blocked
                      </span>
                    ) : null}
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
                        setBillingOverride(false);
                        setBillingOverrideReason('');
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
              {blockedOfferById[selectedOffer.id] ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <p className="font-semibold">Billing warning</p>
                  <p className="mt-1">
                    {getBillingReasonMessage(
                      blockedOfferById[selectedOffer.id]?.blockingAccess?.reasonCode,
                      blockedOfferById[selectedOffer.id]?.blockingAccess?.message
                    )}
                  </p>
                  <Link
                    to={`/admin/vendors/${selectedOffer.vendor.id}/billing-plan`}
                    className="mt-2 inline-flex font-semibold underline"
                  >
                    Open vendor billing plan
                  </Link>
                </div>
              ) : null}

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

              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <label className="inline-flex items-start gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={billingOverride}
                    onChange={(event) => setBillingOverride(event.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    Allow billing override for this approval (admin only). Use this only when there is
                    a justified exception.
                  </span>
                </label>
                {billingOverride ? (
                  <label className="mt-3 block text-sm font-medium text-slate-700">
                    Override reason (required, 8+ chars)
                    <textarea
                      rows={3}
                      value={billingOverrideReason}
                      onChange={(event) => setBillingOverrideReason(event.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                      placeholder="Document why this offer is approved despite billing restrictions"
                    />
                  </label>
                ) : null}
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
