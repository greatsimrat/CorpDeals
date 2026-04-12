import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../services/api';

const STATUS_OPTIONS = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'CLOSED'] as const;

type VendorLead = {
  id: string;
  status: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  consentAt?: string | null;
  consentIp?: string | null;
  payloadJson?: Record<string, unknown> | null;
  vendorNotes?: string | null;
  visibilityStatus?: 'VISIBLE' | 'LOCKED';
  lockedReason?: 'PLAN_LIMIT' | 'NO_BALANCE' | null;
  leadAccess?: 'VISIBLE' | 'LOCKED';
  contactVisible?: boolean;
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

export default function VendorLeadDetailPage() {
  const { leadId } = useParams();
  const [lead, setLead] = useState<VendorLead | null>(null);
  const [status, setStatus] = useState('NEW');
  const [vendorNotes, setVendorNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLead = async () => {
    if (!leadId) return;
    try {
      setIsLoading(true);
      setError('');
      const data = (await api.getVendorLead(leadId)) as VendorLead;
      setLead(data);
      setStatus(data.status === 'SENT' ? 'NEW' : data.status);
      setVendorNotes(data.vendorNotes || '');
    } catch (err: any) {
      setError(err.message || 'Failed to load lead');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLead();
  }, [leadId]);

  const save = async () => {
    if (!leadId) return;
    try {
      await api.updateLead(leadId, { status, vendorNotes });
      await loadLead();
    } catch (err: any) {
      setError(err.message || 'Failed to update lead');
    }
  };

  if (isLoading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6">Loading lead...</div>;
  }

  if (error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>;
  }

  if (!lead) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6">Lead not found.</div>;
  }

  const isLocked = String(lead.visibilityStatus || lead.leadAccess || '').toUpperCase() === 'LOCKED';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Lead #{lead.id}</h2>
          <p className="text-sm text-slate-600">
            {isLocked
              ? 'Contact details hidden until billing unlock'
              : `${lead.firstName || ''} ${lead.lastName || ''} - ${lead.email || 'No email'}`.trim()}
          </p>
          {isLocked ? (
            <p className="mt-1 text-xs font-medium text-amber-700">
              Lead is locked by billing. Name, email, and phone are hidden until wallet/plan is updated.
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {isLocked ? (
            <Link to="/vendor/billing" className="text-sm font-semibold text-amber-700 hover:text-amber-900">
              Switch to Gold
            </Link>
          ) : null}
          <Link to="/vendor/leads" className="text-sm font-medium text-blue-600 hover:underline">
            Back to leads
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-2 text-sm text-slate-700 md:grid-cols-2">
          <p>
            <span className="font-semibold">Offer:</span> {lead.offer.title}
          </p>
          <p>
            <span className="font-semibold">Company:</span> {lead.company.name}
          </p>
          <p>
            <span className="font-semibold">Phone:</span> {isLocked ? 'Hidden until billing unlock' : lead.phone || 'N/A'}
          </p>
          {isLocked ? (
            <p className="md:col-span-2 text-xs text-amber-700">
              This lead is stored, but contact details remain hidden while billing is locked.
            </p>
          ) : null}
          <p>
            <span className="font-semibold">Created:</span> {new Date(lead.createdAt).toLocaleString()}
          </p>
          <p>
            <span className="font-semibold">Consent at:</span>{' '}
            {isLocked ? 'Hidden until billing unlock' : lead.consentAt ? new Date(lead.consentAt).toLocaleString() : 'N/A'}
          </p>
          <p>
            <span className="font-semibold">Consent IP:</span> {isLocked ? 'Hidden until billing unlock' : lead.consentIp || 'N/A'}
          </p>
          <p>
            <span className="font-semibold">Product:</span> {lead.offer.productName || 'N/A'}
          </p>
          <p>
            <span className="font-semibold">Product model:</span> {lead.offer.productModel || 'N/A'}
          </p>
          <p className="md:col-span-2">
            <span className="font-semibold">Product URL:</span>{' '}
            {lead.offer.productUrl ? (
              <a href={lead.offer.productUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                {lead.offer.productUrl}
              </a>
            ) : (
              'N/A'
            )}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Status
            <select
              value={status}
              disabled={isLocked}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            >
              {STATUS_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700 md:col-span-2">
            Vendor notes
            <textarea
              rows={4}
              value={vendorNotes}
              onChange={(e) => setVendorNotes(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
        </div>
        <button
          onClick={save}
          disabled={isLocked}
          className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Save
        </button>
      </div>
    </div>
  );
}
