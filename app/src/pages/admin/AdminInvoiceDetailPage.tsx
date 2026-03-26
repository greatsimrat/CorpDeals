import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../services/api';

const asNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value: unknown, currency = 'CAD') =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(asNumber(value));

export default function AdminInvoiceDetailPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [invoice, setInvoice] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');

  const load = async () => {
    if (!invoiceId) return;
    try {
      setIsLoading(true);
      setError('');
      const data = await api.getAdminInvoice(invoiceId);
      setInvoice(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load invoice');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [invoiceId]);

  const updateStatus = async (status: 'SENT' | 'PAID' | 'VOID') => {
    if (!invoiceId) return;
    try {
      setIsSaving(true);
      setError('');
      setSuccess('');
      await api.updateAdminInvoiceStatus(invoiceId, status);
      setSuccess(`Invoice marked as ${status}.`);
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to update invoice status');
    } finally {
      setIsSaving(false);
    }
  };

  const addAdjustment = async (event: FormEvent) => {
    event.preventDefault();
    if (!invoiceId) return;
    try {
      setIsSaving(true);
      setError('');
      setSuccess('');
      await api.addAdminInvoiceLineItem(invoiceId, {
        itemType: 'ADJUSTMENT',
        description,
        quantity: Number(quantity || '1'),
        unitPrice: Number(unitPrice || '0'),
      });
      setDescription('');
      setQuantity('1');
      setUnitPrice('');
      setSuccess('Adjustment line item added.');
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to add adjustment');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6">Loading invoice...</div>;
  }

  if (!invoice) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6">Invoice not found.</div>;
  }

  const currency = 'CAD';

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500">
          <Link to="/admin/invoices" className="text-blue-600 hover:underline">
            Invoices
          </Link>{' '}
          / {invoice.id}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Invoice {invoice.id}</h1>
        <p className="text-sm text-slate-600">{invoice.vendor?.companyName || 'Unknown vendor'}</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">{success}</div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs uppercase text-slate-500">Period</p>
            <p className="text-sm font-medium text-slate-900">
              {new Date(invoice.periodStart).toLocaleDateString()} -{' '}
              {new Date(invoice.periodEnd).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Status</p>
            <p className="text-sm font-medium text-slate-900">{invoice.status}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Subtotal</p>
            <p className="text-sm font-medium text-slate-900">
              {formatCurrency(invoice.subtotal, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Total</p>
            <p className="text-sm font-medium text-slate-900">{formatCurrency(invoice.total, currency)}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => updateStatus('SENT')}
            disabled={isSaving}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            Mark Sent
          </button>
          <button
            type="button"
            onClick={() => updateStatus('PAID')}
            disabled={isSaving}
            className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
          >
            Mark Paid
          </button>
          <button
            type="button"
            onClick={() => updateStatus('VOID')}
            disabled={isSaving}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            Mark Void
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-lg font-semibold text-slate-900">Line Items</h2>
        </div>
        <table className="w-full min-w-[760px]">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Description</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Qty</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Unit Price</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.lineItems || []).map((item: any) => (
              <tr key={item.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 text-sm text-slate-700">{item.itemType}</td>
                <td className="px-4 py-3 text-sm text-slate-800">{item.description}</td>
                <td className="px-4 py-3 text-right text-sm text-slate-700">{item.quantity}</td>
                <td className="px-4 py-3 text-right text-sm text-slate-700">
                  {formatCurrency(item.unitPrice, currency)}
                </td>
                <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">
                  {formatCurrency(item.amount, currency)}
                </td>
              </tr>
            ))}
            {(invoice.lineItems || []).length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                  No line items found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Add Adjustment</h2>
        <form onSubmit={addAdjustment} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <label className="text-sm text-slate-700 sm:col-span-2">
            Description
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm text-slate-700">
            Quantity
            <input
              type="number"
              min="-10000"
              max="10000"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm text-slate-700">
            Unit Price
            <input
              type="number"
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <div className="sm:col-span-4 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : 'Add Adjustment'}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Billed Leads</h2>
        <p className="mb-3 text-sm text-slate-600">Lead billing events attached to this invoice.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Lead ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Offer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Company</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Billed At</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.leadBillingEvents || []).map((event: any) => (
                <tr key={event.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-sm text-slate-700">{event.leadId}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{event.lead?.email || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{event.lead?.offer?.title || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{event.lead?.company?.name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {new Date(event.billedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
              {(invoice.leadBillingEvents || []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                    No billed leads attached.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
