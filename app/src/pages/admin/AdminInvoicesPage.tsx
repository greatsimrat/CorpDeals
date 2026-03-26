import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const toMonthInput = (value: Date) =>
  `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}`;

const asNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value: unknown, currency = 'CAD') =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(asNumber(value));

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [period, setPeriod] = useState(toMonthInput(new Date()));
  const [vendorId, setVendorId] = useState('');
  const [status, setStatus] = useState('');

  const load = async () => {
    try {
      setIsLoading(true);
      setError('');
      const [invoiceData, vendorData] = await Promise.all([
        api.getAdminInvoices({
          period: period || undefined,
          vendorId: vendorId || undefined,
          status: status || undefined,
        }),
        api.getAdminVendors({ status: 'all' }),
      ]);
      setInvoices(invoiceData || []);
      setVendors(vendorData || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const generate = async () => {
    try {
      setIsGenerating(true);
      setError('');
      setSuccess('');
      const result = await api.generateAdminInvoices(period);
      setSuccess(
        `Generated ${result.invoices_created} invoices. Skipped existing: ${result.skipped_existing_invoice}, no charges: ${result.skipped_no_charges}.`
      );
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to generate invoices');
    } finally {
      setIsGenerating(false);
    }
  };

  const statusBadge = useMemo(
    () => ({
      DRAFT: 'bg-slate-100 text-slate-700',
      SENT: 'bg-blue-50 text-blue-700',
      PAID: 'bg-green-50 text-green-700',
      VOID: 'bg-red-50 text-red-700',
    }),
    []
  );

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
        <p className="mt-1 text-slate-600">Generate monthly invoices and track payment status.</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">{success}</div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <label className="text-sm text-slate-700">
            Period (YYYY-MM)
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="text-sm text-slate-700">
            Vendor
            <select
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="">All vendors</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.companyName}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-700">
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="">All statuses</option>
              <option value="DRAFT">DRAFT</option>
              <option value="SENT">SENT</option>
              <option value="PAID">PAID</option>
              <option value="VOID">VOID</option>
            </select>
          </label>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={load}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={generate}
              disabled={isGenerating}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isGenerating ? 'Generating...' : 'Generate Invoices'}
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6">Loading invoices...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[900px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Invoice</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Vendor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Period</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Subtotal</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Tax</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Total</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                    No invoices found.
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-sm text-slate-800">{invoice.id}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {invoice.vendor?.companyName || 'Unknown vendor'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {new Date(invoice.periodStart).toLocaleDateString()} -{' '}
                      {new Date(invoice.periodEnd).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-700">
                      {formatCurrency(invoice.subtotal, invoice.vendor?.currency || 'CAD')}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-700">
                      {formatCurrency(invoice.tax, invoice.vendor?.currency || 'CAD')}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">
                      {formatCurrency(invoice.total, invoice.vendor?.currency || 'CAD')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          statusBadge[invoice.status as keyof typeof statusBadge] || 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/admin/invoices/${invoice.id}`}
                        className="text-sm font-semibold text-blue-600 hover:underline"
                      >
                        Open
                      </Link>
                    </td>
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
