import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CalendarClock, FileCheck2, Loader2 } from 'lucide-react';
import api from '../services/api';

interface LeadItem {
  id: string;
  offer_id: string;
  offer_title: string;
  company: { id: string; slug: string; name: string };
  vendor_name: string;
  status: string;
  created_at: string;
}

const toLabel = (value: string) => {
  if (!value) return '-';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

export default function MyApplicationsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [leads, setLeads] = useState<LeadItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      setIsLoading(true);
      setError('');
      try {
        const data = await api.getMyApplications();
        if (cancelled) return;
        setLeads(data.leads || []);
      } catch (err: any) {
        if (cancelled) return;
        setError(err.message || 'Failed to load your applications');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">My Applications</h1>
          <p className="mt-1 text-sm text-slate-600">Recent lead submissions from your account.</p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Recent Leads</h2>
          {leads.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No lead submissions yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {leads.map((lead) => (
                <div key={lead.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900">{lead.offer_title}</p>
                      <p className="text-xs text-slate-500">{lead.company.name}</p>
                      <p className="mt-1 text-xs text-slate-500">Vendor: {lead.vendor_name}</p>
                    </div>
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {toLabel(lead.status)}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-slate-500 inline-flex items-center gap-1">
                    <CalendarClock className="w-3.5 h-3.5" />
                    {new Date(lead.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {leads.length === 0 && !error && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-10 text-center">
            <FileCheck2 className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="mt-3 text-slate-700">No applications yet.</p>
            <Link
              to="/"
              className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Find deals
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
