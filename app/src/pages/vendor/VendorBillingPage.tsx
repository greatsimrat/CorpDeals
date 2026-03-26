import { useEffect, useState } from 'react';
import api from '../../services/api';

type BillingPayload = {
  vendor: { id: string; companyName: string; email: string };
  activePlan: any | null;
  invoices: any[];
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

export default function VendorBillingPage() {
  const [data, setData] = useState<BillingPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExportingId, setIsExportingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadBilling = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await api.getVendorBilling();
      setData(response);
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

  if (isLoading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6">Loading billing...</div>;
  }

  const plan = data?.activePlan;
  const planCurrency = plan?.currency || 'CAD';

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">Billing</h2>
        <p className="text-sm text-slate-600">View your current plan and invoice history.</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-slate-900">Current Plan</h3>
        {!plan ? (
          <p className="mt-2 text-sm text-slate-600">No active billing plan configured yet.</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase text-slate-500">Plan Type</p>
              <p className="text-sm font-medium text-slate-900">{String(plan.planType).replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Currency</p>
              <p className="text-sm font-medium text-slate-900">{planCurrency}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Price Per Lead</p>
              <p className="text-sm font-medium text-slate-900">
                {plan.pricePerLead !== null && plan.pricePerLead !== undefined
                  ? formatCurrency(asNumber(plan.pricePerLead), planCurrency)
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Monthly Fee</p>
              <p className="text-sm font-medium text-slate-900">
                {plan.monthlyFee !== null && plan.monthlyFee !== undefined
                  ? formatCurrency(asNumber(plan.monthlyFee), planCurrency)
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Included Leads / Month</p>
              <p className="text-sm font-medium text-slate-900">{plan.includedLeadsPerMonth ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Overage Price / Lead</p>
              <p className="text-sm font-medium text-slate-900">
                {plan.overagePricePerLead !== null && plan.overagePricePerLead !== undefined
                  ? formatCurrency(asNumber(plan.overagePricePerLead), planCurrency)
                  : '-'}
              </p>
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
