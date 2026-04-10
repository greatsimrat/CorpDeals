import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import api from '../../services/api';
import { getBillingBlockedTag, getBillingErrorMessage, getBillingReasonMessage } from '../../lib/billing-access';

type Company = {
  id: string;
  name: string;
  slug: string;
};

type OfferState = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'CANCELLED' | 'REJECTED';

type VendorOffer = {
  id: string;
  title: string;
  description?: string | null;
  active: boolean;
  offerState?: OfferState;
  offerStatus?: string;
  complianceStatus?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  complianceNotes?: string | null;
  expiryDate?: string | null;
  company: { id: string; name: string; slug: string };
  productName?: string | null;
  productModel?: string | null;
  productUrl?: string | null;
  cancelReason?: string | null;
  _count?: { leads: number };
};

type PendingAction = 'pause' | 'resume' | 'cancel' | 'delete';

const lifecycleBadgeClass = (status: OfferState | undefined) => {
  switch (status) {
    case 'CANCELLED':
      return 'bg-rose-50 text-rose-700';
    case 'SUBMITTED':
      return 'bg-blue-50 text-blue-700';
    case 'APPROVED':
      return 'bg-teal-50 text-teal-700';
    case 'REJECTED':
      return 'bg-red-50 text-red-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

const lifecycleStatusLabel = (status: OfferState | undefined) => {
  switch (status) {
    case 'SUBMITTED':
      return 'Pending Approval';
    case 'CANCELLED':
      return 'Cancelled';
    case 'REJECTED':
      return 'Changes Required';
    case 'APPROVED':
      return 'Approved';
    case 'DRAFT':
    default:
      return 'Draft';
  }
};

const normalizeOfferState = (offer: VendorOffer): OfferState => {
  const state = String(offer.offerState || '').toUpperCase();
  if (['DRAFT', 'SUBMITTED', 'APPROVED', 'CANCELLED', 'REJECTED'].includes(state)) {
    return state as OfferState;
  }

  const legacyStatus = String(offer.offerStatus || '').toUpperCase();
  if (legacyStatus === 'LIVE' || legacyStatus === 'PAUSED' || legacyStatus === 'APPROVED') return 'APPROVED';
  if (legacyStatus === 'SUBMITTED') return 'SUBMITTED';
  if (legacyStatus === 'REJECTED') return 'REJECTED';
  if (legacyStatus === 'CANCELLED') return 'CANCELLED';
  return 'DRAFT';
};

const statusSupportingNote = (offer: VendorOffer) => {
  const billingBlocked = getBillingBlockedTag(offer.complianceNotes);
  if (billingBlocked) {
    return billingBlocked.message;
  }

  if (offer.cancelReason) {
    return offer.cancelReason;
  }

  if (normalizeOfferState(offer) === 'REJECTED') {
    return offer.complianceNotes || 'Update the offer and submit it again for approval.';
  }

  if (normalizeOfferState(offer) === 'SUBMITTED') {
    return 'Waiting for admin approval.';
  }

  switch (offer.complianceStatus) {
    case 'REJECTED':
      return offer.complianceNotes || 'Update the offer and submit it again for approval.';
    default:
      return '';
  }
};

export default function VendorOffersPage() {
  const [offers, setOffers] = useState<VendorOffer[]>([]);
  const [billing, setBilling] = useState<any | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [replicateSourceOffer, setReplicateSourceOffer] = useState<VendorOffer | null>(null);
  const [replicateCompanyId, setReplicateCompanyId] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [replicateError, setReplicateError] = useState('');
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [isReplicating, setIsReplicating] = useState(false);
  const [actionOffer, setActionOffer] = useState<VendorOffer | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionError, setActionError] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [isMutating, setIsMutating] = useState(false);

  const loadOffers = async () => {
    try {
      setIsLoading(true);
      setError('');
      const [offerData, billingData] = await Promise.all([api.getVendorOffers(), api.getVendorBilling()]);
      setOffers(offerData as VendorOffer[]);
      setBilling(billingData);
    } catch (err: any) {
      setError(err.message || 'Failed to load offers');
    } finally {
      setIsLoading(false);
    }
  };

  const ensureCompanies = async () => {
    if (companies.length > 0) return;

    try {
      setIsLoadingCompanies(true);
      const data = await api.getCompanies();
      setCompanies(data as Company[]);
    } catch (err: any) {
      setReplicateError(err.message || 'Failed to load companies');
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  const openReplicateDialog = async (offer: VendorOffer) => {
    setReplicateSourceOffer(offer);
    setReplicateCompanyId('');
    setCompanySearch('');
    setReplicateError('');
    await ensureCompanies();
  };

  const closeReplicateDialog = () => {
    setReplicateSourceOffer(null);
    setReplicateCompanyId('');
    setCompanySearch('');
    setReplicateError('');
  };

  const openActionDialog = (offer: VendorOffer, action: PendingAction) => {
    setNotice('');
    setActionOffer(offer);
    setPendingAction(action);
    setActionError('');
    setCancelReason('');
  };

  const closeActionDialog = () => {
    setActionOffer(null);
    setPendingAction(null);
    setActionError('');
    setCancelReason('');
  };

  const handleReplicateOffer = async () => {
    if (!replicateSourceOffer) return;
    if (!replicateCompanyId) {
      setReplicateError('Select a target company');
      return;
    }

    setReplicateError('');
    setIsReplicating(true);
    try {
      const response = await api.replicateVendorOffer(replicateSourceOffer.id, {
        targetCompanyId: replicateCompanyId,
      });
      setNotice(response.message || 'Created a draft offer copy');
      closeReplicateDialog();
      await loadOffers();
    } catch (err: any) {
      setReplicateError(getBillingErrorMessage(err, 'Failed to replicate offer'));
    } finally {
      setIsReplicating(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!actionOffer || !pendingAction) return;

    setActionError('');
    setIsMutating(true);

    try {
      if (pendingAction === 'resume' && billing && !billing.canPublishOffer) {
        throw new Error(
          billing.publishOfferMessage ||
            getBillingReasonMessage('VENDOR_BILLING_BLOCKED', 'Billing must be valid before resuming offers.')
        );
      }

      if (pendingAction === 'pause') {
        await api.pauseVendorOffer(actionOffer.id);
        setNotice('Offer paused');
      } else if (pendingAction === 'resume') {
        await api.resumeVendorOffer(actionOffer.id);
        setNotice('Offer resumed');
      } else if (pendingAction === 'cancel') {
        await api.cancelVendorOffer(actionOffer.id, {
          cancelReason: cancelReason.trim() || undefined,
        });
        setNotice('Offer cancelled');
      } else if (pendingAction === 'delete') {
        await api.deleteVendorOffer(actionOffer.id);
        setNotice('Draft offer deleted');
      }

      closeActionDialog();
      await loadOffers();
    } catch (err: any) {
      setActionError(getBillingErrorMessage(err, 'Failed to update offer'));
    } finally {
      setIsMutating(false);
    }
  };

  const filteredCompanies = useMemo(() => {
    const sourceCompanyId = replicateSourceOffer?.company.id;
    const normalizedQuery = companySearch.trim().toLowerCase();

    return companies
      .filter((company) => company.id !== sourceCompanyId)
      .filter((company) =>
        normalizedQuery ? company.name.toLowerCase().includes(normalizedQuery) : true
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [companies, companySearch, replicateSourceOffer]);

  const actionTitle =
    pendingAction === 'pause'
      ? 'Pause offer'
      : pendingAction === 'resume'
      ? 'Resume offer'
      : pendingAction === 'cancel'
      ? 'Cancel offer'
      : pendingAction === 'delete'
      ? 'Delete draft offer'
      : '';

  const actionDescription =
    pendingAction === 'pause'
      ? 'Employees will no longer see this offer until you resume it.'
      : pendingAction === 'resume'
      ? 'The offer will become live again for eligible employees.'
      : pendingAction === 'cancel'
      ? 'Cancellation is permanent. The offer will be removed from employee discovery and cannot be resumed.'
      : pendingAction === 'delete'
      ? 'This draft will be permanently removed. Draft delete is only available when there is no activity on the offer.'
      : '';

  useEffect(() => {
    loadOffers();
  }, []);

  if (isLoading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6">Loading offers...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Offers</h2>
          <p className="text-sm text-slate-600">
            Create, replicate, pause, cancel, and submit offers for compliance review.
          </p>
        </div>
        {billing?.canCreateOffer ? (
          <Link
            to="/vendor/offers/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            New Offer
          </Link>
        ) : (
          <Link
            to="/vendor/billing"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Review Billing
          </Link>
        )}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      ) : null}
      {billing && !billing.canCreateOffer ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          {billing.createOfferMessage || 'An active billing plan is required before you can create another offer.'}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
          {notice}
        </div>
      ) : null}
      {billing ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Current Plan</p>
              <p className="text-sm font-semibold text-slate-900">
                {billing.planDisplayName || 'Not configured'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Plan Status</p>
              <p className="text-sm font-semibold text-slate-900">{billing.planStatus || 'NONE'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Offer Capacity</p>
              <p className="text-sm font-semibold text-slate-900">
                {billing.offerLimit == null
                  ? `${billing.managedOfferCount || 0} managed`
                  : `${billing.managedOfferCount || 0}/${billing.offerLimit}`}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[860px]">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Title</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Company</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Product</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Leads</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((offer) => {
              const lifecycleStatus = normalizeOfferState(offer);
              const supportingNote = statusSupportingNote(offer);
              const billingBlockedTag = getBillingBlockedTag(offer.complianceNotes);
              const canEdit = lifecycleStatus !== 'CANCELLED';
              const canPause = lifecycleStatus === 'APPROVED' && offer.active;
              const canResume = lifecycleStatus === 'APPROVED' && !offer.active && (billing?.canPublishOffer ?? true);
              const canCancel = lifecycleStatus !== 'CANCELLED';
              const canDelete = lifecycleStatus === 'DRAFT';

              return (
                <tr key={offer.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{offer.title}</p>
                    <p className="line-clamp-1 text-xs text-slate-500">
                      {offer.description || 'No description'}
                    </p>
                    <p className="text-xs text-slate-500">
                      End date:{' '}
                      {offer.expiryDate
                        ? new Date(offer.expiryDate).toLocaleDateString()
                        : 'No end date'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{offer.company.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    <p>{offer.productName || '-'}</p>
                    <p className="text-xs text-slate-500">{offer.productModel || ''}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{offer._count?.leads || 0}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${lifecycleBadgeClass(
                            lifecycleStatus
                          )}`}
                        >
                          {lifecycleStatusLabel(lifecycleStatus)}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            offer.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {offer.active ? 'Active' : 'Inactive'}
                        </span>
                        {billingBlockedTag ? (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                            Billing blocked
                          </span>
                        ) : null}
                      </div>
                      {supportingNote ? (
                        <p
                          className={`max-w-[240px] text-xs ${
                            billingBlockedTag
                              ? 'text-amber-700'
                              : lifecycleStatus === 'CANCELLED' || lifecycleStatus === 'REJECTED'
                              ? 'text-rose-600'
                              : 'text-slate-500'
                          }`}
                        >
                          {supportingNote}
                        </p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <div className="inline-flex items-center gap-2">
                      {canEdit ? (
                        <Link
                          to={`/vendor/offers/${offer.id}/edit`}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                        >
                          {offer.complianceStatus === 'REJECTED' ? 'Fix & Resubmit' : 'Edit'}
                        </Link>
                      ) : (
                        <span className="rounded-md border border-slate-200 px-3 py-1.5 text-slate-400">
                          Closed
                        </span>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="rounded-md border border-slate-300 px-2.5 py-1.5 text-slate-700 hover:bg-slate-50"
                            aria-label={`Manage ${offer.title}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Manage Offer
                          </DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => {
                              setNotice('');
                              void openReplicateDialog(offer);
                            }}
                          >
                            Replicate
                          </DropdownMenuItem>
                          {canPause ? (
                            <DropdownMenuItem onClick={() => openActionDialog(offer, 'pause')}>
                              Pause
                            </DropdownMenuItem>
                          ) : null}
                          {canResume ? (
                            <DropdownMenuItem onClick={() => openActionDialog(offer, 'resume')}>
                              Resume
                            </DropdownMenuItem>
                          ) : lifecycleStatus === 'APPROVED' && !offer.active ? (
                            <DropdownMenuItem disabled>
                              {billing?.publishOfferMessage || 'Resume blocked by billing'}
                            </DropdownMenuItem>
                          ) : null}
                          {canCancel ? (
                            <DropdownMenuItem onClick={() => openActionDialog(offer, 'cancel')}>
                              Cancel
                            </DropdownMenuItem>
                          ) : null}
                          {canDelete ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => openActionDialog(offer, 'delete')}
                                className="text-red-600 focus:text-red-700"
                              >
                                Delete draft
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              );
            })}
            {offers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                  No offers found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Dialog open={!!replicateSourceOffer} onOpenChange={(open) => (!open ? closeReplicateDialog() : null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Replicate offer</DialogTitle>
            <DialogDescription className="text-sm leading-6 text-slate-600">
              Create a new draft copy of{' '}
              <span className="font-medium text-slate-900">{replicateSourceOffer?.title}</span> for
              another company. The current company cannot be selected.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Current company</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {replicateSourceOffer?.company.name}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="replicate-company-search">
                Search companies
              </label>
              <input
                id="replicate-company-search"
                type="text"
                value={companySearch}
                onChange={(event) => setCompanySearch(event.target.value)}
                placeholder="Search target company"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="replicate-company">
                Target company
              </label>
              <select
                id="replicate-company"
                value={replicateCompanyId}
                onChange={(event) => setReplicateCompanyId(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                disabled={isLoadingCompanies || isReplicating}
              >
                <option value="">Select a company</option>
                {filteredCompanies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">
                The replicated offer will be created as a new draft so you can adjust company-specific
                copy before submitting it for review.
              </p>
            </div>

            {isLoadingCompanies ? (
              <p className="text-sm text-slate-500">Loading companies...</p>
            ) : null}

            {!isLoadingCompanies && filteredCompanies.length === 0 ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                No other companies match your search.
              </p>
            ) : null}

            {replicateError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {replicateError}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={closeReplicateDialog}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              disabled={isReplicating}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleReplicateOffer()}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              disabled={isReplicating || isLoadingCompanies || !filteredCompanies.length}
            >
              {isReplicating ? 'Creating draft...' : 'Create draft copy'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!actionOffer && !!pendingAction} onOpenChange={(open) => (!open ? closeActionDialog() : null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{actionTitle}</DialogTitle>
            <DialogDescription className="text-sm leading-6 text-slate-600">
              {actionDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Offer</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{actionOffer?.title}</p>
              <p className="text-xs text-slate-500">{actionOffer?.company.name}</p>
            </div>

            {pendingAction === 'cancel' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="cancel-reason">
                  Cancellation reason
                </label>
                <textarea
                  id="cancel-reason"
                  rows={3}
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  placeholder="Optional internal reason for cancelling this offer"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            ) : null}

            {actionError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {actionError}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={closeActionDialog}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              disabled={isMutating}
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmAction()}
              className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={isMutating}
            >
              {isMutating ? 'Saving...' : actionTitle}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
