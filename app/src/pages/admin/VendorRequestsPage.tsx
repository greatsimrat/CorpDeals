import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Eye,
  FileText,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Search,
  UserRound,
  X,
  XCircle,
} from 'lucide-react';
import api from '../../services/api';

type VendorRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
type PlanCode = 'FREE' | 'GOLD' | 'PREMIUM';

interface VendorRequest {
  id: string;
  vendorId: string;
  businessType: string | null;
  categoryOther: string | null;
  description: string | null;
  jobTitle: string | null;
  additionalInfo: string | null;
  status: VendorRequestStatus;
  reviewNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  selectedPlanCode: PlanCode;
  billingStatus?: 'ACTIVE' | 'INACTIVE';
  selectedPlanConfig?: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
    monthlyFee?: string | number | null;
    maxActiveOffers?: number | null;
    includedLeadsPerCycle?: number | null;
  } | null;
  vendor: {
    id: string;
    companyName: string;
    contactName: string;
    email: string;
    businessEmail: string | null;
    phone: string | null;
    website: string | null;
    city: string | null;
    description: string | null;
  };
  reviewedBy: {
    name: string;
    email: string;
  } | null;
}

const resolveLabel = (primary?: string | null, secondary?: string | null) => {
  const first = String(primary || '').trim();
  if (first) return first;
  const second = String(secondary || '').trim();
  return second || '-';
};

const planLabel = (code?: string | null) => {
  const normalized = String(code || '').toUpperCase();
  if (normalized === 'GOLD') return 'GOLD';
  if (normalized === 'PREMIUM') return 'PREMIUM';
  return 'FREE';
};

export default function VendorRequestsPage() {
  const [requests, setRequests] = useState<VendorRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | VendorRequestStatus>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<VendorRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const loadRequests = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await api.getVendorRequests();
      setRequests(data as VendorRequest[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load vendor requests');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return requests.filter((request) => {
      const matchesStatus = statusFilter === 'ALL' || request.status === statusFilter;
      if (!matchesStatus) return false;
      if (!query) return true;
      const haystack = [
        request.vendor.companyName,
        request.vendor.contactName,
        request.vendor.email,
        request.vendor.businessEmail || '',
        request.vendor.phone || '',
        request.vendor.city || '',
        request.businessType || '',
        request.selectedPlanCode || '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [requests, searchQuery, statusFilter]);

  const summary = useMemo(() => {
    const totals = {
      total: requests.length,
      pending: 0,
      approved: 0,
      rejected: 0,
    };
    for (const request of requests) {
      if (request.status === 'PENDING') totals.pending += 1;
      else if (request.status === 'APPROVED') totals.approved += 1;
      else if (request.status === 'REJECTED') totals.rejected += 1;
    }
    return totals;
  }, [requests]);

  const reviewRequest = async (status: 'APPROVED' | 'REJECTED') => {
    if (!selectedRequest) return;
    try {
      setIsProcessing(true);
      setError('');
      setSuccess('');
      await api.reviewVendorRequest(selectedRequest.id, {
        status,
        reviewNotes: reviewNotes.trim() || undefined,
      });
      setSuccess(`Vendor request ${status === 'APPROVED' ? 'approved' : 'rejected'}.`);
      setSelectedRequest(null);
      setReviewNotes('');
      await loadRequests();
    } catch (err: any) {
      setError(err.message || 'Failed to review vendor request');
    } finally {
      setIsProcessing(false);
    }
  };

  const statusBadge = (status: VendorRequestStatus) => {
    if (status === 'APPROVED') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Approved
        </span>
      );
    }
    if (status === 'REJECTED') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
          <XCircle className="h-3.5 w-3.5" />
          Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
        <Clock3 className="h-3.5 w-3.5" />
        Pending
      </span>
    );
  };

  const billingStatusBadge = (request: VendorRequest) => {
    const isActive = request.billingStatus === 'ACTIVE' || Boolean(request.selectedPlanConfig?.isActive);
    return (
      <span
        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
          isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
        }`}
      >
        {isActive ? 'Plan Active' : 'Plan Inactive'}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-slate-900">Vendor Requests</h1>
        <p className="mt-1 text-slate-600">Approval queue for incoming vendor applications and plan selection.</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">{success}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total Requests</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{summary.total}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs uppercase tracking-wide text-amber-700">Pending</p>
          <p className="mt-2 text-2xl font-bold text-amber-900">{summary.pending}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs uppercase tracking-wide text-emerald-700">Approved</p>
          <p className="mt-2 text-2xl font-bold text-emerald-900">{summary.approved}</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-xs uppercase tracking-wide text-rose-700">Rejected</p>
          <p className="mt-2 text-2xl font-bold text-rose-900">{summary.rejected}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search company, contact, email, city, category..."
              className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div className="relative lg:w-56">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'ALL' | VendorRequestStatus)}
              className="w-full appearance-none rounded-md border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              <option value="ALL">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[1180px]">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Company</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Primary Contact</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Category / City</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Selected Plan</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Billing Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Request Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Submitted</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                  No vendor requests found.
                </td>
              </tr>
            ) : (
              filteredRequests.map((request) => (
                <tr key={request.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                        <Building2 className="h-4 w-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{request.vendor.companyName}</p>
                        <p className="text-xs text-slate-500">{request.vendor.website || 'No website'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    <p className="font-medium text-slate-900">{request.vendor.contactName}</p>
                    <p>{request.vendor.businessEmail || request.vendor.email}</p>
                    <p>{request.vendor.phone || '-'}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    <p>{resolveLabel(request.businessType, request.categoryOther)}</p>
                    <p className="text-xs text-slate-500">{request.vendor.city || '-'}</p>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      {planLabel(request.selectedPlanCode)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{billingStatusBadge(request)}</td>
                  <td className="px-4 py-3 text-sm">{statusBadge(request.status)}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRequest(request);
                        setReviewNotes('');
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedRequest ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Vendor Request Details</h2>
                <p className="text-sm text-slate-500">Request ID: {selectedRequest.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {statusBadge(selectedRequest.status)}
                  {billingStatusBadge(selectedRequest)}
                  <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                    Plan: {planLabel(selectedRequest.selectedPlanCode)}
                  </span>
                </div>
                <span className="text-sm text-slate-500">
                  Submitted {new Date(selectedRequest.createdAt).toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Company</h3>
                  <div className="flex items-start gap-3">
                    <Building2 className="mt-0.5 h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Company Name</p>
                      <p className="font-medium text-slate-900">{selectedRequest.vendor.companyName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Category</p>
                      <p className="font-medium text-slate-900">
                        {resolveLabel(selectedRequest.businessType, selectedRequest.categoryOther)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">City</p>
                      <p className="font-medium text-slate-900">{selectedRequest.vendor.city || '-'}</p>
                    </div>
                  </div>
                  {selectedRequest.vendor.website ? (
                    <div className="flex items-start gap-3">
                      <Globe className="mt-0.5 h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">Website</p>
                        <a
                          href={selectedRequest.vendor.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {selectedRequest.vendor.website}
                        </a>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Primary Contact</h3>
                  <div className="flex items-start gap-3">
                    <UserRound className="mt-0.5 h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Name</p>
                      <p className="font-medium text-slate-900">{selectedRequest.vendor.contactName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Email</p>
                      <p className="font-medium text-slate-900">
                        {selectedRequest.vendor.businessEmail || selectedRequest.vendor.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Phone</p>
                      <p className="font-medium text-slate-900">{selectedRequest.vendor.phone || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Job Title</p>
                      <p className="font-medium text-slate-900">{selectedRequest.jobTitle || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Selected Plan</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{planLabel(selectedRequest.selectedPlanCode)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Monthly Fee</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {selectedRequest.selectedPlanConfig?.monthlyFee != null
                      ? `$${Number(selectedRequest.selectedPlanConfig.monthlyFee).toFixed(2)} CAD`
                      : '-'}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Plan Active</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {selectedRequest.selectedPlanConfig?.isActive ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>

              {selectedRequest.additionalInfo ? (
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Additional Notes</h3>
                  <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    {selectedRequest.additionalInfo}
                  </p>
                </div>
              ) : null}

              {selectedRequest.reviewNotes ? (
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Review Notes</h3>
                  <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    {selectedRequest.reviewNotes}
                  </p>
                  {selectedRequest.reviewedBy ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Reviewed by {selectedRequest.reviewedBy.name} on{' '}
                      {selectedRequest.reviewedAt ? new Date(selectedRequest.reviewedAt).toLocaleString() : '-'}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {selectedRequest.status === 'PENDING' ? (
                <div className="space-y-3 border-t border-slate-200 pt-4">
                  <label className="block text-sm font-medium text-slate-700">
                    Review notes (optional)
                    <textarea
                      value={reviewNotes}
                      onChange={(event) => setReviewNotes(event.target.value)}
                      rows={3}
                      className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      placeholder="Capture approval/rejection notes..."
                    />
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => reviewRequest('REJECTED')}
                      disabled={isProcessing}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                    >
                      {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => reviewRequest('APPROVED')}
                      disabled={isProcessing}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Approve
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
