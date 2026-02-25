import { useEffect, useState } from 'react';
import api from '../../services/api';

type VendorRow = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string | null;
  website?: string | null;
  businessType?: string | null;
  city?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  createdAt: string;
  _count?: { offers: number; leads: number };
};

const statusBadge = (status: string) => {
  if (status === 'APPROVED') return 'bg-green-50 text-green-700';
  if (status === 'REJECTED') return 'bg-red-50 text-red-700';
  if (status === 'SUSPENDED') return 'bg-amber-50 text-amber-700';
  return 'bg-blue-50 text-blue-700';
};

export default function VendorsPage() {
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingId, setIsSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadVendors = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await api.getAdminVendors({ status: statusFilter });
      setVendors(data as VendorRow[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load vendors');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, [statusFilter]);

  const review = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      setIsSavingId(id);
      setError('');
      await api.reviewAdminVendor(id, status);
      await loadVendors();
    } catch (err: any) {
      setError(err.message || `Failed to ${status.toLowerCase()} vendor`);
    } finally {
      setIsSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-slate-900">Vendors</h1>
        <p className="mt-1 text-slate-600">
          Review pending vendors and approve or reject applications.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <label className="text-sm font-medium text-slate-700">
          Filter status
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="ml-3 rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="all">All</option>
          </select>
        </label>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      ) : null}

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">Loading vendors...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[980px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Business
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Category / City
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Stats
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {vendors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    No vendors found.
                  </td>
                </tr>
              ) : (
                vendors.map((vendor) => (
                  <tr key={vendor.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{vendor.companyName}</p>
                      <p className="text-xs text-slate-500">{vendor.website || 'No website'}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <p>{vendor.contactName}</p>
                      <p>{vendor.email}</p>
                      <p>{vendor.phone || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <p>{vendor.businessType || '-'}</p>
                      <p className="text-xs text-slate-500">{vendor.city || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <p>Offers: {vendor._count?.offers || 0}</p>
                      <p>Leads: {vendor._count?.leads || 0}</p>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge(vendor.status)}`}>
                        {vendor.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {vendor.status === 'PENDING' ? (
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => review(vendor.id, 'REJECTED')}
                            disabled={isSavingId === vendor.id}
                            className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => review(vendor.id, 'APPROVED')}
                            disabled={isSavingId === vendor.id}
                            className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            Approve
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">Reviewed</span>
                      )}
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
