import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const STATUS_OPTIONS = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'CLOSED'] as const;

type VendorLead = {
  id: string;
  status: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  vendorNotes?: string | null;
  createdAt: string;
  company: { id: string; name: string; slug: string };
  offer: {
    id: string;
    title: string;
    productName?: string | null;
    productModel?: string | null;
    productUrl?: string | null;
  };
};

export default function VendorLeadsPage() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<VendorLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [editing, setEditing] = useState<Record<string, { status: string; vendorNotes: string }>>({});

  const loadLeads = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await api.getVendorLeads({
        status: statusFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      } as any);
      const cast = data as VendorLead[];
      setLeads(cast);
      const initial: Record<string, { status: string; vendorNotes: string }> = {};
      cast.forEach((lead) => {
        initial[lead.id] = {
          status: lead.status === 'SENT' ? 'NEW' : lead.status,
          vendorNotes: lead.vendorNotes || '',
        };
      });
      setEditing(initial);
    } catch (err: any) {
      setError(err.message || 'Failed to load leads');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  const saveLead = async (leadId: string) => {
    const item = editing[leadId];
    if (!item) return;
    try {
      await api.updateLead(leadId, {
        status: item.status,
        vendorNotes: item.vendorNotes,
      });
      await loadLeads();
    } catch (err: any) {
      setError(err.message || 'Failed to update lead');
    }
  };

  const exportCsv = async () => {
    try {
      setIsExporting(true);
      const csv = await api.exportVendorLeadsCsv({
        status: statusFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `vendor-leads-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Failed to export CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const hasLeads = useMemo(() => leads.length > 0, [leads]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">Leads</h2>
        <p className="text-sm text-slate-600">Filter, update status, and add notes.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <label className="text-sm font-medium text-slate-700">
            Status
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="">All</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-slate-700">
            Date from
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Date to
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>

          <button
            onClick={loadLeads}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Apply Filters
          </button>

          <button
            onClick={exportCsv}
            disabled={isExporting}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      ) : null}

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6">Loading leads...</div>
      ) : (
        <div className="space-y-3">
          {hasLeads ? (
            leads.map((lead) => (
              <div key={lead.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col justify-between gap-2 md:flex-row">
                  <div>
                    <p className="font-medium text-slate-900">
                      {lead.firstName} {lead.lastName}
                    </p>
                    <p className="text-sm text-slate-600">
                      {lead.email}
                      {lead.phone ? ` | ${lead.phone}` : ''}
                    </p>
                    <p className="text-sm text-slate-600">
                      {lead.company.name} | {lead.offer.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      Submitted {new Date(lead.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Link
                    to={`/vendor/leads/${lead.id}`}
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    Open detail
                  </Link>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <label className="text-sm font-medium text-slate-700">
                    Status
                    <select
                      value={editing[lead.id]?.status || 'NEW'}
                      onChange={(e) =>
                        setEditing((prev) => ({
                          ...prev,
                          [lead.id]: { ...prev[lead.id], status: e.target.value },
                        }))
                      }
                      className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm font-medium text-slate-700 md:col-span-2">
                    Vendor notes
                    <textarea
                      rows={2}
                      value={editing[lead.id]?.vendorNotes || ''}
                      onChange={(e) =>
                        setEditing((prev) => ({
                          ...prev,
                          [lead.id]: { ...prev[lead.id], vendorNotes: e.target.value },
                        }))
                      }
                      className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                    />
                  </label>
                </div>

                <div className="mt-3">
                  <button
                    onClick={() => saveLead(lead.id)}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Save Lead Update
                  </button>
                  <button
                    onClick={() => navigate(`/vendor/leads/${lead.id}`)}
                    className="ml-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    View Full Lead
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
              No leads found for the selected filters.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
