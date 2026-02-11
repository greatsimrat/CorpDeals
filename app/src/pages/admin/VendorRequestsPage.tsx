import { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  ChevronDown,
  Eye,
  Loader2,
  Building2,
  Mail,
  Phone,
  Globe,
  FileText,
  X,
} from 'lucide-react';
import api from '../../services/api';

interface VendorRequest {
  id: string;
  vendorId: string;
  businessType: string | null;
  description: string | null;
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
    phone: string | null;
    website: string | null;
    description: string | null;
  };
  reviewedBy: {
    name: string;
    email: string;
  } | null;
}

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
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.vendor.companyName.toLowerCase().includes(query) ||
        r.vendor.email.toLowerCase().includes(query) ||
        r.vendor.contactName.toLowerCase().includes(query)
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
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle2 className="w-3 h-3" />
            Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Vendor Requests</h1>
        <p className="text-slate-600 mt-1">Review and manage vendor partnership applications</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by company, email, or contact..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-9 pr-8 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Company</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Contact</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Type</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
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
                        <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-slate-500" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{request.vendor.companyName}</p>
                          <p className="text-sm text-slate-500">{request.vendor.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-900">{request.vendor.contactName}</p>
                      {request.vendor.phone && (
                        <p className="text-sm text-slate-500">{request.vendor.phone}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-600">{request.businessType || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(request.status)}
                    </td>
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
                          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
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

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Vendor Request Details</h2>
              <button
                onClick={() => setSelectedRequest(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between">
                {getStatusBadge(selectedRequest.status)}
                <span className="text-sm text-slate-500">
                  Submitted: {new Date(selectedRequest.createdAt).toLocaleString()}
                </span>
              </div>

              {/* Company Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-500 uppercase">Company Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Company Name</p>
                      <p className="font-medium text-slate-900">{selectedRequest.vendor.companyName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Business Type</p>
                      <p className="font-medium text-slate-900">{selectedRequest.businessType || '-'}</p>
                    </div>
                  </div>
                  {selectedRequest.vendor.website && (
                    <div className="flex items-center gap-3 sm:col-span-2">
                      <Globe className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-sm text-slate-500">Website</p>
                        <a href={selectedRequest.vendor.website} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">
                          {selectedRequest.vendor.website}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-500 uppercase">Contact Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                      <span className="font-medium text-slate-600">
                        {selectedRequest.vendor.contactName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Contact Person</p>
                      <p className="font-medium text-slate-900">{selectedRequest.vendor.contactName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Email</p>
                      <p className="font-medium text-slate-900">{selectedRequest.vendor.email}</p>
                    </div>
                  </div>
                  {selectedRequest.vendor.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-sm text-slate-500">Phone</p>
                        <p className="font-medium text-slate-900">{selectedRequest.vendor.phone}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {selectedRequest.description && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase">Offer Description</h3>
                  <p className="text-slate-700 bg-slate-50 p-4 rounded-lg">{selectedRequest.description}</p>
                </div>
              )}

              {/* Additional Info */}
              {selectedRequest.additionalInfo && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase">Additional Information</h3>
                  <p className="text-slate-700 bg-slate-50 p-4 rounded-lg">{selectedRequest.additionalInfo}</p>
                </div>
              )}

              {/* Review Notes (for already reviewed) */}
              {selectedRequest.reviewNotes && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase">Review Notes</h3>
                  <p className="text-slate-700 bg-slate-50 p-4 rounded-lg">{selectedRequest.reviewNotes}</p>
                  {selectedRequest.reviewedBy && (
                    <p className="text-sm text-slate-500">
                      Reviewed by {selectedRequest.reviewedBy.name} on{' '}
                      {new Date(selectedRequest.reviewedAt!).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {/* Review Actions (for pending) */}
              {selectedRequest.status === 'PENDING' && (
                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Review Notes (optional)
                    </label>
                    <textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      rows={3}
                      placeholder="Add notes about your decision..."
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleReview('REJECTED')}
                      disabled={isProcessing}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <XCircle className="w-5 h-5" />
                      )}
                      Reject
                    </button>
                    <button
                      onClick={() => handleReview('APPROVED')}
                      disabled={isProcessing}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5" />
                      )}
                      Approve
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
