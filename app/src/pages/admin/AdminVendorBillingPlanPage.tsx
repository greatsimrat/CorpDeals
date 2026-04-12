import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../services/api';

type VendorPlanResponse = {
  vendor: {
    id: string;
    companyName: string;
    email: string;
    status: string;
  };
  activePlan: any | null;
  plans: any[];
};

type SubscriptionTier = 'FREE' | 'GOLD' | 'PREMIUM';

const SUBSCRIPTION_TIERS: Record<
  SubscriptionTier,
  {
    label: string;
    monthlyFee: number;
    includedLeadsPerMonth: number;
    overagePricePerLead: number;
  }
> = {
  FREE: {
    label: 'Free',
    monthlyFee: 0,
    includedLeadsPerMonth: 10,
    overagePricePerLead: 5,
  },
  GOLD: {
    label: 'Gold',
    monthlyFee: 100,
    includedLeadsPerMonth: 20,
    overagePricePerLead: 3,
  },
  PREMIUM: {
    label: 'Premium',
    monthlyFee: 250,
    includedLeadsPerMonth: 50,
    overagePricePerLead: 2,
  },
};

const inferSubscriptionTier = (activePlan: any): SubscriptionTier => {
  const monthlyFee = Number(activePlan?.monthlyFee);
  if (Number.isFinite(monthlyFee)) {
    if (monthlyFee === SUBSCRIPTION_TIERS.FREE.monthlyFee) return 'FREE';
    if (monthlyFee === SUBSCRIPTION_TIERS.PREMIUM.monthlyFee) return 'PREMIUM';
    if (monthlyFee === SUBSCRIPTION_TIERS.GOLD.monthlyFee) return 'GOLD';
  }
  return 'GOLD';
};

export default function AdminVendorBillingPlanPage() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const [data, setData] = useState<VendorPlanResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [planType, setPlanType] = useState<'PAY_PER_LEAD' | 'SUBSCRIPTION'>('PAY_PER_LEAD');
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('GOLD');
  const [pricePerLead, setPricePerLead] = useState('');
  const [billingCycleDay, setBillingCycleDay] = useState('1');
  const [currency, setCurrency] = useState('CAD');

  const load = async () => {
    if (!vendorId) return;
    try {
      setIsLoading(true);
      setError('');
      setSuccess('');
      const response = await api.getAdminVendorBillingPlan(vendorId);
      setData(response);

      const activePlan = response.activePlan;
      if (activePlan) {
        setPlanType(activePlan.planType || 'PAY_PER_LEAD');
        setPricePerLead(activePlan.pricePerLead != null ? String(activePlan.pricePerLead) : '');
        if (activePlan.planType === 'SUBSCRIPTION') {
          setSubscriptionTier(inferSubscriptionTier(activePlan));
        }
        setBillingCycleDay(String(activePlan.billingCycleDay ?? 1));
        setCurrency(activePlan.currency || 'CAD');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load vendor billing plan');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [vendorId]);

  const canSave = useMemo(() => {
    if (planType === 'PAY_PER_LEAD') return pricePerLead.trim().length > 0;
    return true;
  }, [planType, pricePerLead]);

  useEffect(() => {
    if (planType === 'SUBSCRIPTION') {
      setCurrency('CAD');
    }
  }, [planType]);

  const save = async () => {
    if (!vendorId) return;
    try {
      setIsSaving(true);
      setError('');
      setSuccess('');
      const subscriptionPreset = SUBSCRIPTION_TIERS[subscriptionTier];
      await api.setAdminVendorBillingPlan(vendorId, {
        planType,
        subscriptionTier: planType === 'SUBSCRIPTION' ? subscriptionTier : undefined,
        pricePerLead: planType === 'PAY_PER_LEAD' ? (pricePerLead === '' ? null : Number(pricePerLead)) : null,
        monthlyFee: planType === 'SUBSCRIPTION' ? subscriptionPreset.monthlyFee : null,
        includedLeadsPerMonth: planType === 'SUBSCRIPTION' ? subscriptionPreset.includedLeadsPerMonth : null,
        overagePricePerLead: planType === 'SUBSCRIPTION' ? subscriptionPreset.overagePricePerLead : null,
        billingCycleDay: Number(billingCycleDay || '1'),
        currency: planType === 'SUBSCRIPTION' ? 'CAD' : currency,
      });
      setSuccess('Billing plan updated.');
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to update billing plan');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6">Loading billing plan...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500">
          <Link to="/admin/vendors" className="text-blue-600 hover:underline">
            Vendors
          </Link>{' '}
          / Billing Plan
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{data?.vendor.companyName}</h1>
        <p className="text-sm text-slate-600">{data?.vendor.email}</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">{success}</div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Set Active Plan</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-sm text-slate-700">
            Plan Type
            <select
              value={planType}
              onChange={(e) => setPlanType(e.target.value as 'PAY_PER_LEAD' | 'SUBSCRIPTION')}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="PAY_PER_LEAD">Pay Per Lead</option>
              <option value="SUBSCRIPTION">Subscription</option>
            </select>
          </label>

          {planType === 'PAY_PER_LEAD' ? (
            <label className="text-sm text-slate-700">
              Currency
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                maxLength={3}
              />
            </label>
          ) : (
            <label className="text-sm text-slate-700">
              Currency
              <input
                type="text"
                value="CAD"
                disabled
                className="mt-1 block w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-slate-500"
              />
            </label>
          )}

          {planType === 'PAY_PER_LEAD' ? (
            <label className="text-sm text-slate-700">
              Price Per Lead
              <input
                type="number"
                min="0"
                step="0.01"
                value={pricePerLead}
                onChange={(e) => setPricePerLead(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
          ) : (
            <>
              <label className="text-sm text-slate-700">
                Subscription Tier
                <select
                  value={subscriptionTier}
                  onChange={(e) => setSubscriptionTier(e.target.value as SubscriptionTier)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                >
                  <option value="FREE">Free - $0 / month</option>
                  <option value="GOLD">Gold - $100 / month</option>
                  <option value="PREMIUM">Premium - $250 / month</option>
                </select>
              </label>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
                <p className="text-sm font-semibold text-slate-900">
                  {SUBSCRIPTION_TIERS[subscriptionTier].label} Plan
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Monthly fee: ${SUBSCRIPTION_TIERS[subscriptionTier].monthlyFee} CAD
                </p>
                <p className="text-sm text-slate-700">
                  Included leads/month: {SUBSCRIPTION_TIERS[subscriptionTier].includedLeadsPerMonth}
                </p>
                <p className="text-sm text-slate-700">
                  Overage: ${SUBSCRIPTION_TIERS[subscriptionTier].overagePricePerLead} per lead
                </p>
              </div>
            </>
          )}

          <label className="text-sm text-slate-700">
            Billing Cycle Day
            <input
              type="number"
              min="1"
              max="28"
              step="1"
              value={billingCycleDay}
              onChange={(e) => setBillingCycleDay(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={save}
            disabled={!canSave || isSaving}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Save Billing Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}
