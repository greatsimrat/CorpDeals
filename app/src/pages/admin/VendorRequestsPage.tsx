import { useEffect, useState } from 'react';
import {
  Building2,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  Clock,
  Eye,
  FileText,
  Filter,
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

interface VendorRequest {
  id: string;
  vendorId: string;
  businessType: string | null;
  categoryOther: string | null;
  description: string | null;
  jobTitle: string | null;
  offerType: string | null;
  offerTypeOther: string | null;
  offerValidityStart: string | null;
  offerValidityEnd: string | null;
  additionalInfo: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
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

const formatDateRange = (start?: string | null, end?: string | null) => {
  if (!start && !end) return '-';
  const formattedStart = start ? new Date(start).toLocaleDateString() : 'Not provided';
  const formattedEnd = end ? new Date(end).toLocaleDateString() : 'Open-ended';
  return `${formattedStart} to ${formattedEnd}`;
};

export default function VendorRequestsPage() {
  const [requests, setRequests] = useState<VendorRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<VendorRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<VendorRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [requests, statusFilter, searchQuery]);

  const loadRequests = async () => {
    try {
      setIsLoading(true);
      const data = await api.getVendorRequests();
      setRequests(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load requests');
    } finally {
      setIsLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = requests;

    if (statusFilter && statusFilter !== 'ALL') {
      filtered = filtered.filter((request) => request.status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((request) =>
        request.vendor.companyName.toLowerCase().includes(query) ||
        request.vendor.email.toLowerCase().includes(query) ||
        (request.vendor.businessEmail || '').toLowerCase().includes(query) ||
        request.vendor.contactName.toLowerCase().includes(query)
      );
    }

    setFilteredRequests(filtered);
  };

  const handleReview = async (status: 'APPROVED' | 'REJECTED') => {
    if (!selectedRequest) return;

    setIsProcessing(true);
    try {
      await api.reviewVendorRequest(selectedRequest.id, {
        status,
        reviewNotes: reviewNotes || undefined,
      });
      await loadRequests();
      setSelectedRequest(null);
      setReviewNotes('');
    } catch (err: any) {
      setError(err.message || 'Failed to process request');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-medium text-yellow-700">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
            <CheckCircle2 className="h-3 w-3" />
            Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
            <XCircle className="h-3 w-3" />
            Rejected
          </span>
        );
      default:
        return null;
    }
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
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Vendor Requests</h1>
        <p className="mt-1 text-slate-600">Review partner applications, offer details, and campaign readiness.</p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by company, contact, or email..."
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-8 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">Company</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">Category</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">Date</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No vendor requests found
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200">
                          <Building2 className="h-5 w-5 text-slate-500" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{request.vendor.companyName}</p>
                          <p className="text-sm text-slate-500">{request.vendor.city || 'Region not provided'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-900">{request.vendor.contactName}</p>
                      <p className="text-sm text-slate-500">{request.vendor.businessEmail || request.vendor.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-600">
                        {resolveLabel(request.businessType, request.categoryOther)}
                      </span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(request.status)}</td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-500">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setReviewNotes('');
                          }}
                          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRequest ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-xl font-bold text-slate-900">Vendor Request Details</h2>
              <button
                onClick={() => setSelectedRequest(null)}
                className="rounded-lg p-2 transition-colors hover:bg-slate-100"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {getStatusBadge(selectedRequest.status)}
                <span className="text-sm text-slate-500">
                  Submitted: {new Date(selectedRequest.createdAt).toLocaleString()}
                </span>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase text-slate-500">Company Information</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Business name</p>
                      <p className="font-medium text-slate-900">{selectedRequest.vendor.companyName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Category</p>
                      <p className="font-medium text-slate-900">
                        {resolveLabel(selectedRequest.businessType, selectedRequest.categoryOther)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">City or region</p>
                      <p className="font-medium text-slate-900">{selectedRequest.vendor.city || '-'}</p>
                    </div>
                  </div>
                  {selectedRequest.vendor.website ? (
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-slate-400" />
                      <div>
                        <p className="text-sm text-slate-500">Website</p>
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
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase text-slate-500">Contact Information</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-3">
                    <UserRound className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Contact name</p>
                      <p className="font-medium text-slate-900">{selectedRequest.vendor.contactName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Job title</p>
                      <p className="font-medium text-slate-900">{selectedRequest.jobTitle || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Work email</p>
                      <p className="font-medium text-slate-900">
                        {selectedRequest.vendor.businessEmail || selectedRequest.vendor.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">CorpDeals account email</p>
                      <p className="font-medium text-slate-900">{selectedRequest.vendor.email}</p>
                    </div>
                  </div>
                  {selectedRequest.vendor.phone ? (
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-slate-400" />
                      <div>
                        <p className="text-sm text-slate-500">Phone</p>
                        <p className="font-medium text-slate-900">{selectedRequest.vendor.phone}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase text-slate-500">Offer Proposal</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Type of offer</p>
                      <p className="font-medium text-slate-900">
                        {resolveLabel(selectedRequest.offerType, selectedRequest.offerTypeOther)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CalendarRange className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Validity window</p>
                      <p className="font-medium text-slate-900">
                        {formatDateRange(selectedRequest.offerValidityStart, selectedRequest.offerValidityEnd)}
                      </p>
                    </div>
                  </div>
                </div>
                {selectedRequest.description ? (
                  <div className="rounded-lg bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Offer description</p>
                    <p className="mt-2 text-slate-700">{selectedRequest.description}</p>
                  </div>
                ) : null}
              </div>

              {selectedRequest.additionalInfo ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase text-slate-500">Additional Information</h3>
                  <p className="rounded-lg bg-slate-50 p-4 text-slate-700">{selectedRequest.additionalInfo}</p>
                </div>
              ) : null}

              {selectedRequest.reviewNotes ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase text-slate-500">Review Notes</h3>
                  <p className="rounded-lg bg-slate-50 p-4 text-slate-700">{selectedRequest.reviewNotes}</p>
                  {selectedRequest.reviewedBy ? (
                    <p className="text-sm text-slate-500">
                      Reviewed by {selectedRequest.reviewedBy.name} on{' '}
                      {new Date(selectedRequest.reviewedAt || '').toLocaleString()}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {selectedRequest.status === 'PENDING' ? (
                <div className="space-y-4 border-t border-slate-200 pt-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Review Notes (optional)
                    </label>
                    <textarea
                      value={reviewNotes}
                      onChange={(event) => setReviewNotes(event.target.value)}
                      rows={3}
                      placeholder="Add notes about fit, follow-up, or launch readiness..."
                      className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleReview('REJECTED')}
                      disabled={isProcessing}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-300 px-4 py-3 font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                    >
                      {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <XCircle className="h-5 w-5" />}
                      Reject
                    </button>
                    <button
                      onClick={() => handleReview('APPROVED')}
                      disabled={isProcessing}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                    >
                      {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
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
