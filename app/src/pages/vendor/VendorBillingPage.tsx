import { useEffect, useState } from 'react';
import api from '../../services/api';

type BillingPayload = {
  vendor: { id: string; companyName: string; email: string };
  billingProfile?: {
    billingMode?: string;
    postTrialMode?: string | null;
    trialEndsAt?: string | null;
    currency?: string;
  } | null;
  activePlan: any | null;
  latestPlan?: any | null;
  planStatus?: 'ACTIVE' | 'EXPIRED' | 'SCHEDULED' | 'INACTIVE' | 'NONE';
  planDisplayName?: string;
  offerLimit?: number | null;
  managedOfferCount?: number;
  liveOfferCount?: number;
  remainingOfferSlots?: number | null;
  canCreateOffer?: boolean;
  canPublishOffer?: boolean;
  createOfferMessage?: string;
  publishOfferMessage?: string;
  hiddenLeadCount?: number;
  walletBalance?: string;
  currencyCode?: string;
  includedLeadsTotal?: number;
  includedLeadsUsed?: number;
  walletTransactions?: any[];
  invoices: any[];
};

type BillingPlanTier = 'FREE' | 'GOLD' | 'PREMIUM';

const BILLING_PLAN_OPTIONS: Record<
  BillingPlanTier,
  {
    label: string;
    monthlyFee: number;
    offerLimit: number | null;
    description: string;
  }
> = {
  FREE: {
    label: 'Free',
    monthlyFee: 0,
    offerLimit: 50,
    description: 'Best for testing and small catalogs.',
  },
  GOLD: {
    label: 'Gold',
    monthlyFee: 100,
    offerLimit: 100,
    description: 'For growing vendors that need higher active offer capacity.',
  },
  PREMIUM: {
    label: 'Premium',
    monthlyFee: 300,
    offerLimit: null,
    description: 'Unlimited active offers for high-scale catalogs.',
  },
};

const formatCurrency = (value: number, currency = 'CAD') =>
  new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
  }).format(value || 0);

const asNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString() : 'Open-ended';

const inferBillingPlanTier = (payload: BillingPayload | null): BillingPlanTier => {
  const monthlyFee = Number(payload?.activePlan?.monthlyFee ?? payload?.latestPlan?.monthlyFee ?? 0);
  if (Number.isFinite(monthlyFee) && monthlyFee >= BILLING_PLAN_OPTIONS.PREMIUM.monthlyFee) return 'PREMIUM';
  if (Number.isFinite(monthlyFee) && monthlyFee >= BILLING_PLAN_OPTIONS.GOLD.monthlyFee) return 'GOLD';
  return 'FREE';
};

const planStatusLabel = (status?: BillingPayload['planStatus']) => {
  switch (status) {
    case 'ACTIVE':
      return 'Active';
    case 'EXPIRED':
      return 'Expired';
    case 'SCHEDULED':
      return 'Scheduled';
    case 'INACTIVE':
      return 'Inactive';
    default:
      return 'No plan';
  }
};

const planStatusClass = (status?: BillingPayload['planStatus']) => {
  switch (status) {
    case 'ACTIVE':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'EXPIRED':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    case 'SCHEDULED':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'INACTIVE':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    default:
      return 'border-slate-200 bg-slate-100 text-slate-700';
  }
};

export default function VendorBillingPage() {
  const [data, setData] = useState<BillingPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExportingId, setIsExportingId] = useState<string | null>(null);
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);
  const [selectedPlanTier, setSelectedPlanTier] = useState<BillingPlanTier>('FREE');
  const [planSuccess, setPlanSuccess] = useState('');
  const [topUpAmount, setTopUpAmount] = useState('100');
  const [isToppingUp, setIsToppingUp] = useState(false);
  const [error, setError] = useState('');

  const loadBilling = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await api.getVendorBilling();
      setData(response);
      setSelectedPlanTier(inferBillingPlanTier(response));
    } catch (err: any) {
      setError(err.message || 'Failed to load billing data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBilling();
  }, []);

  const exportInvoiceCsv = async (invoiceId: string) => {
    try {
      setIsExportingId(invoiceId);
      const csv = await api.exportVendorInvoiceCsv(invoiceId);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoiceId}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Failed to export invoice CSV');
    } finally {
      setIsExportingId(null);
    }
  };

  const updatePlan = async () => {
    try {
      setIsUpdatingPlan(true);
      setError('');
      setPlanSuccess('');
      await api.updateVendorBillingPlan({ planTier: selectedPlanTier });
      await loadBilling();
      setPlanSuccess(`Plan updated to ${BILLING_PLAN_OPTIONS[selectedPlanTier].label}.`);
    } catch (err: any) {
      setError(err.message || 'Failed to update billing plan');
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  const topUpWallet = async () => {
    const amount = Number(topUpAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Top-up amount must be greater than 0');
      return;
    }
    try {
      setIsToppingUp(true);
      setError('');
      setPlanSuccess('');
      await api.topUpVendorWallet(amount);
      await loadBilling();
      setPlanSuccess(`Wallet topped up by ${formatCurrency(amount, data?.currencyCode || 'CAD')}.`);
    } catch (err: any) {
      setError(err.message || 'Failed to top up wallet');
    } finally {
      setIsToppingUp(false);
    }
  };

  if (isLoading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6">Loading billing...</div>;
  }

  const plan = data?.activePlan;
  const latestPlan = data?.latestPlan || plan;
  const billingProfile = data?.billingProfile;
  const planCurrency = latestPlan?.currency || plan?.currency || 'CAD';
  const currentPlanTier = inferBillingPlanTier(data);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">Billing</h2>
        <p className="text-sm text-slate-600">View your current plan, offer capacity, and invoice history.</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      ) : null}
      {planSuccess ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">{planSuccess}</div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Billing Plans</h3>
            <p className="mt-1 text-sm text-slate-500">
              Free supports 50 active offers, Gold supports 100, and Premium supports unlimited active offers.
            </p>
          </div>
          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
            Current: {BILLING_PLAN_OPTIONS[currentPlanTier].label}
          </span>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {(Object.keys(BILLING_PLAN_OPTIONS) as BillingPlanTier[]).map((tier) => {
            const planOption = BILLING_PLAN_OPTIONS[tier];
            const selected = selectedPlanTier === tier;
            return (
              <button
                key={tier}
                type="button"
                onClick={() => setSelectedPlanTier(tier)}
                className={`rounded-2xl border p-4 text-left transition ${
                  selected
                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                }`}
              >
                <p className="text-sm font-semibold text-slate-900">{planOption.label}</p>
                <p className="mt-1 text-sm text-slate-700">{formatCurrency(planOption.monthlyFee, 'CAD')} / month</p>
                <p className="mt-1 text-xs text-slate-600">
                  {planOption.offerLimit == null ? 'Unlimited active offers' : `${planOption.offerLimit} active offers`}
                </p>
                <p className="mt-2 text-xs text-slate-500">{planOption.description}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={updatePlan}
            disabled={isUpdatingPlan}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isUpdatingPlan ? 'Updating plan...' : `Switch to ${BILLING_PLAN_OPTIONS[selectedPlanTier].label}`}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Current Plan</h3>
            <p className="mt-1 text-sm text-slate-500">
              Billing controls when offers can be created, submitted, and kept live.
            </p>
          </div>
          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${planStatusClass(data?.planStatus)}`}>
            {planStatusLabel(data?.planStatus)}
          </span>
        </div>

        {!latestPlan && !billingProfile ? (
          <p className="mt-4 text-sm text-slate-600">
            Billing setup is not configured yet. An active plan is required before a vendor can create
            or launch offers.
          </p>
        ) : !latestPlan && billingProfile ? (
          <div className="mt-4 space-y-2 text-sm text-slate-700">
            <p>
              Billing is configured under{' '}
              <span className="font-semibold text-slate-900">
                {String(billingProfile.billingMode || 'manual').replace('_', ' ')}
              </span>
              .
            </p>
            <p>
              A commercial plan is not active yet, so offer creation and launch are blocked until plan
              setup is complete.
            </p>
            {billingProfile.trialEndsAt ? (
              <p className="text-xs text-slate-500">
                Trial ends on {new Date(billingProfile.trialEndsAt).toLocaleDateString()}.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Plan</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{data?.planDisplayName || 'Paid'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Plan Window</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {formatDate(latestPlan?.startsAt)} - {formatDate(latestPlan?.endsAt)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Offer Capacity</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {data?.offerLimit == null
                    ? `${data?.managedOfferCount || 0} offers in catalog`
                    : `${data?.managedOfferCount || 0} / ${data.offerLimit} offers used`}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Remaining Slots</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {data?.remainingOfferSlots == null ? 'Unlimited' : data.remainingOfferSlots}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Included Leads Used</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {data?.includedLeadsUsed ?? 0} / {data?.includedLeadsTotal ?? 0}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Locked Leads</p>
                <p className="mt-2 text-sm font-semibold text-amber-700">{data?.hiddenLeadCount ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Wallet Balance</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {formatCurrency(asNumber(data?.walletBalance), data?.currencyCode || planCurrency)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Quick top-up</p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={topUpAmount}
                    onChange={(event) => setTopUpAmount(event.target.value)}
                    className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={topUpWallet}
                    disabled={isToppingUp}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {isToppingUp ? 'Saving...' : 'Top up'}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Create Offer</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {data?.canCreateOffer ? 'Available' : 'Blocked'}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {data?.canCreateOffer
                    ? 'You can create another offer under the current plan.'
                    : data?.createOfferMessage || 'A current billing plan is required.'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Go Live</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {data?.canPublishOffer ? 'Available' : 'Blocked'}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {data?.canPublishOffer
                    ? 'Submitted and approved offers can stay live while the plan remains active.'
                    : data?.publishOfferMessage || 'An active billing plan is required.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div>
                <p className="text-xs uppercase text-slate-500">Plan Type</p>
                <p className="text-sm font-medium text-slate-900">{String(latestPlan.planType).replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Currency</p>
                <p className="text-sm font-medium text-slate-900">{planCurrency}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Live Offers</p>
                <p className="text-sm font-medium text-slate-900">{data?.liveOfferCount || 0}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Price Per Lead</p>
                <p className="text-sm font-medium text-slate-900">
                  {latestPlan.pricePerLead !== null && latestPlan.pricePerLead !== undefined
                    ? formatCurrency(asNumber(latestPlan.pricePerLead), planCurrency)
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Monthly Fee</p>
                <p className="text-sm font-medium text-slate-900">
                  {latestPlan.monthlyFee !== null && latestPlan.monthlyFee !== undefined
                    ? formatCurrency(asNumber(latestPlan.monthlyFee), planCurrency)
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Included Leads / Month</p>
                <p className="text-sm font-medium text-slate-900">{latestPlan.includedLeadsPerMonth ?? '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Overage Price / Lead</p>
                <p className="text-sm font-medium text-slate-900">
                  {latestPlan.overagePricePerLead !== null && latestPlan.overagePricePerLead !== undefined
                    ? formatCurrency(asNumber(latestPlan.overagePricePerLead), planCurrency)
                    : '-'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <h3 className="text-lg font-semibold text-slate-900">Invoices</h3>
        </div>
        <table className="w-full min-w-[760px]">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Invoice ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Period</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Subtotal</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Tax</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Total</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data?.invoices || []).map((invoice: any) => (
              <tr key={invoice.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 text-sm text-slate-800">{invoice.id}</td>
                <td className="px-4 py-3 text-sm text-slate-700">
                  {new Date(invoice.periodStart).toLocaleDateString()} -{' '}
                  {new Date(invoice.periodEnd).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right text-sm text-slate-700">
                  {formatCurrency(asNumber(invoice.subtotal), planCurrency)}
                </td>
                <td className="px-4 py-3 text-right text-sm text-slate-700">
                  {formatCurrency(asNumber(invoice.tax), planCurrency)}
                </td>
                <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">
                  {formatCurrency(asNumber(invoice.total), planCurrency)}
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">{invoice.status}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => exportInvoiceCsv(invoice.id)}
                    disabled={isExportingId === invoice.id}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {isExportingId === invoice.id ? 'Exporting...' : 'CSV'}
                  </button>
                </td>
              </tr>
            ))}
            {(data?.invoices || []).length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                  No invoices yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
