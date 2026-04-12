import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';

type BillingPreviewRow = {
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
  currentPlan: string;
  currentPlanCode: string;
  monthlySubscriptionAmount: number;
  activeOfferCount: number;
  includedFreeLeads: number;
  freeLeadsUsed: number;
  paidLeadCount: number;
  paidLeadCharges: number;
  gstPercent: number;
  gstAmount: number;
  estimatedTotal: number;
  cycleStartAt: string;
  cycleEndAt: string;
};

type BillingPreviewResponse = {
  gstPercent: number;
  rows: BillingPreviewRow[];
  totals: {
    vendors: number;
    paidLeads: number;
    monthlySubscriptions: number;
    paidLeadCharges: number;
    gst: number;
    estimatedTotal: number;
  };
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value || 0);

export default function AdminBillingPreviewPage() {
  const [data, setData] = useState<BillingPreviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState('all');

  const load = async (params?: { vendorId?: string; search?: string }) => {
    try {
      setIsLoading(true);
      setError('');
      const response = await api.getAdminBillingPreview(params);
      setData(response as BillingPreviewResponse);
    } catch (err: any) {
      setError(err.message || 'Failed to load billing preview');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const vendors = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const row of data?.rows || []) {
      map.set(row.vendorId, { id: row.vendorId, name: row.vendorName });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [data?.rows]);

  const applyFilters = async () => {
    await load({
      vendorId: selectedVendorId !== 'all' ? selectedVendorId : undefined,
      search: search.trim() || undefined,
    });
  };

  const hasRows = (data?.rows || []).length > 0;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Billing Preview</h1>
            <p className="mt-1 text-sm text-slate-600">
              Preview vendor billing for the current cycle. GST is fixed at 5%.
            </p>
          </div>
          <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            Read only
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search vendor..."
            className="rounded-md border border-slate-300 px-3 py-2 text-sm md:col-span-2"
          />
          <select
            value={selectedVendorId}
            onChange={(event) => setSelectedVendorId(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">All vendors</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={applyFilters}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Apply
          </button>
        </div>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Vendors</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{data?.totals.vendors || 0}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Paid Leads</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{data?.totals.paidLeads || 0}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Subscriptions</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {formatCurrency(data?.totals.monthlySubscriptions || 0)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Lead Charges</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {formatCurrency(data?.totals.paidLeadCharges || 0)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Estimated Total</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {formatCurrency(data?.totals.estimatedTotal || 0)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase text-slate-500">GST Rate</p>
        <p className="mt-2 text-lg font-semibold text-slate-900">{data?.gstPercent ?? 5}%</p>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">Loading billing preview...</div>
      ) : !hasRows ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-base font-semibold text-slate-900">No billing preview rows found</p>
          <p className="mt-1 text-sm text-slate-600">
            Try a different vendor filter or clear your search to view current-cycle estimates.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[1320px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Vendor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Current Plan</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Subscription</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Active Offers</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Included Leads</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Free Leads Used</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Paid Leads</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Lead Charges</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">GST (5%)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Estimated Total</th>
              </tr>
            </thead>
            <tbody>
              {(data?.rows || []).length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-sm text-slate-500">
                    No vendors found for the selected filters.
                  </td>
                </tr>
              ) : (
                (data?.rows || []).map((row) => (
                  <tr key={row.vendorId} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{row.vendorName}</p>
                      <p className="text-xs text-slate-500">{row.vendorEmail}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Cycle: {new Date(row.cycleStartAt).toLocaleDateString()} -{' '}
                        {new Date(row.cycleEndAt).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <p>{row.currentPlan}</p>
                      <p className="text-xs text-slate-500">{row.currentPlanCode}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{formatCurrency(row.monthlySubscriptionAmount)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{row.activeOfferCount}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{row.includedFreeLeads}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{row.freeLeadsUsed}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{row.paidLeadCount}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{formatCurrency(row.paidLeadCharges)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{formatCurrency(row.gstAmount)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">{formatCurrency(row.estimatedTotal)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
