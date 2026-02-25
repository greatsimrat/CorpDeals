import { useEffect, useMemo, useState } from 'react';
import {
  CalendarRange,
  Loader2,
  Search,
  Wallet,
  BadgeCheck,
  Ban,
  TrendingUp,
  RefreshCcw,
} from 'lucide-react';
import api from '../../services/api';

interface VendorBillingSummary {
  billingMode: 'TRIAL' | 'FREE' | 'PAY_PER_LEAD' | 'MONTHLY' | 'HYBRID';
  postTrialMode?: 'TRIAL' | 'FREE' | 'PAY_PER_LEAD' | 'MONTHLY' | 'HYBRID' | null;
  trialEndsAt?: string | null;
  leadPriceCents?: number;
  monthlyFeeCents?: number;
  paymentMethod?: 'MANUAL' | 'STRIPE';
  currency?: string;
  billingDay?: number;
  trialActive?: boolean;
}

interface VendorSummary {
  vendorId: string;
  companyName: string;
  status: string;
  billing: VendorBillingSummary | null;
  leadCount: number;
  chargeableLeadCount: number;
  waivedLeadCount: number;
  amountCents: number;
  currency: string;
}

interface FinanceSummaryResponse {
  range: { start: string; end: string };
  totals: {
    leadCount: number;
    chargeableLeadCount: number;
    waivedLeadCount: number;
    amountCents: number;
  };
  vendors: VendorSummary[];
}

const formatDateInput = (value: string) => value.slice(0, 10);

const formatCurrency = (amountCents: number, currency = 'USD') => {
  const value = (amountCents || 0) / 100;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
};

const billingBadgeClasses: Record<string, string> = {
  TRIAL: 'bg-amber-100 text-amber-700',
  FREE: 'bg-slate-100 text-slate-700',
  PAY_PER_LEAD: 'bg-emerald-100 text-emerald-700',
  MONTHLY: 'bg-blue-100 text-blue-700',
  HYBRID: 'bg-purple-100 text-purple-700',
};

export default function FinanceDashboard() {
  const [summary, setSummary] = useState<FinanceSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [editingVendor, setEditingVendor] = useState<VendorSummary | null>(null);
  const [billingMode, setBillingMode] = useState<'PAY_PER_LEAD' | 'MONTHLY' | 'FREE' | 'TRIAL'>('PAY_PER_LEAD');
  const [paymentMethod, setPaymentMethod] = useState<'MANUAL' | 'STRIPE'>('MANUAL');
  const [leadPrice, setLeadPrice] = useState('');
  const [monthlyFee, setMonthlyFee] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [saving, setSaving] = useState(false);

  const loadData = async (params?: { start?: string; end?: string }) => {
    try {
      setIsLoading(true);
      const data = await api.getFinanceVendorsSummary(params);
      setSummary(data);
      if (!startDate && data?.range?.start) {
        setStartDate(formatDateInput(data.range.start));
      }
      if (!endDate && data?.range?.end) {
        setEndDate(formatDateInput(data.range.end));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load finance summary');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!editingVendor) return;
    const billing = editingVendor.billing;
    const nextMode = (billing?.billingMode || 'PAY_PER_LEAD') as 'PAY_PER_LEAD' | 'MONTHLY' | 'FREE' | 'TRIAL';
    setBillingMode(nextMode);
    setPaymentMethod(billing?.paymentMethod || 'MANUAL');
    setLeadPrice(((billing?.leadPriceCents || 0) / 100).toFixed(2));
    setMonthlyFee(((billing?.monthlyFeeCents || 0) / 100).toFixed(2));
    setCurrency(billing?.currency || 'USD');
  }, [editingVendor]);

  const handleApply = () => {
    const params: { start?: string; end?: string } = {};
    if (startDate) params.start = startDate;
    if (endDate) params.end = endDate;
    loadData(params);
  };

  const handleSaveBilling = async () => {
    if (!editingVendor) return;
    try {
      setSaving(true);
      const leadPriceCents = Math.max(0, Math.round(Number(leadPrice || 0) * 100));
      const monthlyFeeCents = Math.max(0, Math.round(Number(monthlyFee || 0) * 100));
      const payload: any = {
        billingMode,
        paymentMethod,
        currency,
      };

      if (billingMode === 'PAY_PER_LEAD') {
        payload.leadPriceCents = leadPriceCents;
        payload.monthlyFeeCents = 0;
      } else if (billingMode === 'MONTHLY') {
        payload.monthlyFeeCents = monthlyFeeCents;
        payload.leadPriceCents = 0;
      }

      await api.updateVendorBilling(editingVendor.vendorId, payload);
      setEditingVendor(null);
      await loadData({
        start: startDate || undefined,
        end: endDate || undefined,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to update billing');
    } finally {
      setSaving(false);
    }
  };

  const filteredVendors = useMemo(() => {
    if (!summary?.vendors) return [];
    if (!search) return summary.vendors;
    return summary.vendors.filter((vendor) =>
      vendor.companyName.toLowerCase().includes(search.toLowerCase())
    );
  }, [summary, search]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Finance Dashboard</h1>
        <p className="text-slate-600 mt-1">Track chargeable leads, waived leads, and vendor billing status</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="text-sm text-slate-600">
              <span className="block mb-1">Start date</span>
              <div className="relative">
                <CalendarRange className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </label>
            <label className="text-sm text-slate-600">
              <span className="block mb-1">End date</span>
              <div className="relative">
                <CalendarRange className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </label>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleApply}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Leads</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{summary?.totals.leadCount || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-100">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500">Chargeable Leads</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{summary?.totals.chargeableLeadCount || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-100">
              <BadgeCheck className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500">Waived Leads</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{summary?.totals.waivedLeadCount || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-100">
              <Ban className="w-5 h-5 text-slate-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500">Estimated Revenue</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {formatCurrency(summary?.totals.amountCents || 0)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-100">
              <Wallet className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Vendor Summary */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 border-b border-slate-200">
          <div>
            <h2 className="font-semibold text-slate-900">Vendor Lead Summary</h2>
            <p className="text-sm text-slate-500">See leads by vendor and billing status</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vendors..."
              className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Vendor</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Billing</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Trial Ends</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Payment</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Leads</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Chargeable</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Waived</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                    No vendors found
                  </td>
                </tr>
              ) : (
                filteredVendors.map((vendor) => (
                  <tr key={vendor.vendorId} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-900">{vendor.companyName}</p>
                        <p className="text-xs text-slate-500">{vendor.status}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          billingBadgeClasses[vendor.billing?.billingMode || 'FREE'] || 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {vendor.billing?.billingMode || 'FREE'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {vendor.billing?.trialEndsAt
                        ? new Date(vendor.billing.trialEndsAt).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {vendor.billing?.paymentMethod || 'MANUAL'}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-slate-700">{vendor.leadCount}</td>
                    <td className="px-6 py-4 text-right text-sm text-slate-700">{vendor.chargeableLeadCount}</td>
                    <td className="px-6 py-4 text-right text-sm text-slate-700">{vendor.waivedLeadCount}</td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                      {formatCurrency(vendor.amountCents, vendor.currency)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setEditingVendor(vendor)}
                        className="text-sm text-emerald-700 hover:text-emerald-900 font-medium"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingVendor && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div>
                <h3 className="font-semibold text-slate-900">Update Billing</h3>
                <p className="text-sm text-slate-500">{editingVendor.companyName}</p>
              </div>
              <button
                onClick={() => setEditingVendor(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                X
              </button>
            </div>
            <div className="p-5 space-y-4">
              <label className="text-sm text-slate-600 block">
                Billing mode
                <select
                  value={billingMode}
                  onChange={(e) => setBillingMode(e.target.value as any)}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value="PAY_PER_LEAD">Pay per lead</option>
                  <option value="MONTHLY">Monthly (unlimited leads)</option>
                  <option value="TRIAL">Trial</option>
                  <option value="FREE">Free</option>
                </select>
              </label>

              <label className="text-sm text-slate-600 block">
                Payment method
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value="MANUAL">Manual</option>
                  <option value="STRIPE">Stripe</option>
                </select>
              </label>

              <label className="text-sm text-slate-600 block">
                Currency
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value="USD">USD</option>
                  <option value="CAD">CAD</option>
                </select>
              </label>

              {billingMode === 'PAY_PER_LEAD' && (
                <label className="text-sm text-slate-600 block">
                  Price per lead ({currency})
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={leadPrice}
                    onChange={(e) => setLeadPrice(e.target.value)}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                  />
                </label>
              )}

              {billingMode === 'MONTHLY' && (
                <label className="text-sm text-slate-600 block">
                  Monthly fee ({currency})
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={monthlyFee}
                    onChange={(e) => setMonthlyFee(e.target.value)}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                  />
                </label>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200">
              <button
                onClick={() => setEditingVendor(null)}
                className="px-4 py-2 text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBilling}
                disabled={saving}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
