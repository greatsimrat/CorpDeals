import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Edit3, Eye, Loader2, Search, ShieldAlert, X } from 'lucide-react';
import api from '../../services/api';

type VendorStatus = 'APPROVED' | 'SUSPENDED' | 'REJECTED' | 'PENDING';

type VendorRow = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  businessEmail?: string | null;
  phone?: string | null;
  website?: string | null;
  businessType?: string | null;
  city?: string | null;
  status: VendorStatus;
  createdAt: string;
  currentPlan?: {
    id?: string | null;
    code?: string | null;
    name?: string | null;
    isActive?: boolean;
  } | null;
  billingStatus?: string | null;
  metrics?: {
    offersCount?: number;
    leadsCount?: number;
  };
  sourceRequest?: {
    id: string;
    createdAt: string;
    status: string;
    selectedPlanCode?: string | null;
  } | null;
};

type EditState = {
  companyName: string;
  contactName: string;
  email: string;
  businessEmail: string;
  phone: string;
  website: string;
  businessType: string;
  city: string;
  notes: string;
};

const EMPTY_EDIT_STATE: EditState = {
  companyName: '',
  contactName: '',
  email: '',
  businessEmail: '',
  phone: '',
  website: '',
  businessType: '',
  city: '',
  notes: '',
};

const formatStatus = (status: VendorStatus) => {
  if (status === 'APPROVED') return 'Active';
  if (status === 'SUSPENDED') return 'Suspended';
  if (status === 'REJECTED') return 'Rejected';
  return 'Pending';
};

const statusClass = (status: VendorStatus) => {
  if (status === 'APPROVED') return 'bg-emerald-50 text-emerald-700';
  if (status === 'SUSPENDED') return 'bg-amber-50 text-amber-700';
  if (status === 'REJECTED') return 'bg-rose-50 text-rose-700';
  return 'bg-blue-50 text-blue-700';
};

const billingBadgeClass = (value: string) => {
  const normalized = String(value || '').toUpperCase();
  if (['ACTIVE', 'FREE'].includes(normalized)) return 'bg-emerald-50 text-emerald-700';
  if (['SUSPENDED', 'PAST_DUE', 'INACTIVE', 'CANCELED', 'EXPIRED'].includes(normalized)) {
    return 'bg-amber-50 text-amber-700';
  }
  return 'bg-slate-100 text-slate-700';
};

export default function VendorsPage() {
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    suspended: 0,
    rejected: 0,
  });
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState<'APPROVED' | 'SUSPENDED' | 'REJECTED' | 'ALL'>('APPROVED');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<VendorRow | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editVendor, setEditVendor] = useState<VendorRow | null>(null);
  const [editState, setEditState] = useState<EditState>(EMPTY_EDIT_STATE);

  const loadVendors = async () => {
    try {
      setIsLoading(true);
      setError('');
      const [filteredData, allData] = await Promise.all([
        api.getAdminVendors({
          status: statusFilter === 'ALL' ? 'all' : statusFilter,
        }),
        api.getAdminVendors({ status: 'all' }),
      ]);
      setVendors(filteredData as VendorRow[]);
      const totals = {
        total: 0,
        active: 0,
        suspended: 0,
        rejected: 0,
      };
      for (const vendor of allData as VendorRow[]) {
        totals.total += 1;
        if (vendor.status === 'APPROVED') totals.active += 1;
        else if (vendor.status === 'SUSPENDED') totals.suspended += 1;
        else if (vendor.status === 'REJECTED') totals.rejected += 1;
      }
      setSummary(totals);
    } catch (err: any) {
      setError(err.message || 'Failed to load vendors');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, [statusFilter]);

  const filteredVendors = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return vendors;
    return vendors.filter((vendor) =>
      [
        vendor.companyName,
        vendor.contactName,
        vendor.email,
        vendor.businessEmail || '',
        vendor.city || '',
        vendor.businessType || '',
        vendor.currentPlan?.name || '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [vendors, searchQuery]);

  const openEdit = (vendor: VendorRow) => {
    setEditVendor(vendor);
    setEditState({
      companyName: vendor.companyName || '',
      contactName: vendor.contactName || '',
      email: vendor.email || '',
      businessEmail: vendor.businessEmail || '',
      phone: vendor.phone || '',
      website: vendor.website || '',
      businessType: vendor.businessType || '',
      city: vendor.city || '',
      notes: '',
    });
    setIsEditOpen(true);
  };

  const closeEdit = () => {
    setIsEditOpen(false);
    setEditVendor(null);
    setEditState(EMPTY_EDIT_STATE);
  };

  const saveVendor = async () => {
    if (!editVendor) return;
    try {
      setIsSaving(true);
      setError('');
      setSuccess('');
      await api.updateAdminVendor(editVendor.id, {
        companyName: editState.companyName.trim(),
        contactName: editState.contactName.trim(),
        email: editState.email.trim().toLowerCase(),
        businessEmail: editState.businessEmail.trim().toLowerCase() || undefined,
        phone: editState.phone.trim() || undefined,
        website: editState.website.trim() || undefined,
        businessType: editState.businessType.trim() || undefined,
        city: editState.city.trim() || undefined,
        notes: editState.notes.trim() || undefined,
      });
      setSuccess('Vendor profile updated.');
      closeEdit();
      await loadVendors();
    } catch (err: any) {
      setError(err.message || 'Failed to update vendor');
    } finally {
      setIsSaving(false);
    }
  };

  const updateVendorStatus = async (vendorId: string, status: 'APPROVED' | 'SUSPENDED') => {
    try {
      setIsSaving(true);
      setError('');
      setSuccess('');
      await api.updateAdminVendor(vendorId, { status });
      setSuccess(status === 'SUSPENDED' ? 'Vendor suspended.' : 'Vendor reactivated.');
      await loadVendors();
    } catch (err: any) {
      setError(err.message || 'Failed to update vendor status');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-slate-900">Vendors</h1>
        <p className="mt-1 text-slate-600">Approved vendor master list with plan, billing, offers, and lead visibility.</p>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div> : null}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">{success}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total Vendors</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{summary.total}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs uppercase tracking-wide text-emerald-700">Active</p>
          <p className="mt-2 text-2xl font-bold text-emerald-900">{summary.active}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs uppercase tracking-wide text-amber-700">Suspended</p>
          <p className="mt-2 text-2xl font-bold text-amber-900">{summary.suspended}</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-xs uppercase tracking-wide text-rose-700">Rejected</p>
          <p className="mt-2 text-2xl font-bold text-rose-900">{summary.rejected}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
          <div className="relative lg:col-span-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search vendor, contact, email, city..."
              className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div className="lg:col-span-2">
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as 'APPROVED' | 'SUSPENDED' | 'REJECTED' | 'ALL')
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              <option value="APPROVED">Active vendors</option>
              <option value="SUSPENDED">Suspended vendors</option>
              <option value="REJECTED">Rejected vendors</option>
              <option value="ALL">All statuses</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">Loading vendors...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[1280px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Company</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Category / City</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Current Plan</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Billing Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Offers Count</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Leads Count</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Vendor Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-500">
                    No vendors found.
                  </td>
                </tr>
              ) : (
                filteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                          <Building2 className="h-4 w-4 text-slate-500" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{vendor.companyName}</p>
                          <p className="text-xs text-slate-500">{vendor.website || 'No website'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <p className="font-medium text-slate-900">{vendor.contactName}</p>
                      <p>{vendor.businessEmail || vendor.email}</p>
                      <p>{vendor.phone || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <p>{vendor.businessType || '-'}</p>
                      <p className="text-xs text-slate-500">{vendor.city || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        {String(vendor.currentPlan?.name || vendor.currentPlan?.code || 'No plan')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${billingBadgeClass(
                          vendor.billingStatus || 'UNKNOWN'
                        )}`}
                      >
                        {String(vendor.billingStatus || 'UNKNOWN')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{vendor.metrics?.offersCount || 0}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{vendor.metrics?.leadsCount || 0}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(vendor.status)}`}>
                        {formatStatus(vendor.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedVendor(vendor)}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <span className="inline-flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            View
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(vendor)}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <span className="inline-flex items-center gap-1">
                            <Edit3 className="h-4 w-4" />
                            Edit
                          </span>
                        </button>
                        <Link
                          to={`/admin/vendors/${vendor.id}/billing-plan`}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Change Plan
                        </Link>
                        {vendor.status === 'APPROVED' ? (
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => updateVendorStatus(vendor.id, 'SUSPENDED')}
                            className="rounded-md border border-amber-300 px-3 py-1.5 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60"
                          >
                            Suspend
                          </button>
                        ) : vendor.status === 'SUSPENDED' ? (
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => updateVendorStatus(vendor.id, 'APPROVED')}
                            className="rounded-md border border-emerald-300 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                          >
                            Reactivate
                          </button>
                        ) : null}
                        <Link
                          to={`/admin/offers?vendorId=${vendor.id}`}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          View Offers
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedVendor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{selectedVendor.companyName}</h2>
                <p className="text-sm text-slate-500">Approved vendor profile</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVendor(null)}
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Primary Contact</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{selectedVendor.contactName}</p>
                  <p className="mt-1 text-sm text-slate-700">{selectedVendor.businessEmail || selectedVendor.email}</p>
                  <p className="mt-1 text-sm text-slate-700">{selectedVendor.phone || '-'}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Plan + Billing</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {String(selectedVendor.currentPlan?.name || selectedVendor.currentPlan?.code || 'No plan')}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">{String(selectedVendor.billingStatus || 'UNKNOWN')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Approved/Live Offers</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{selectedVendor.metrics?.offersCount || 0}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Valid Leads</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{selectedVendor.metrics?.leadsCount || 0}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{formatStatus(selectedVendor.status)}</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Source Request</p>
                {selectedVendor.sourceRequest ? (
                  <div className="mt-2 text-sm text-slate-700">
                    <p>Request ID: {selectedVendor.sourceRequest.id}</p>
                    <p>Status: {selectedVendor.sourceRequest.status}</p>
                    <p>Selected plan: {selectedVendor.sourceRequest.selectedPlanCode || '-'}</p>
                    <p>Submitted: {new Date(selectedVendor.sourceRequest.createdAt).toLocaleString()}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">No source request reference available.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isEditOpen && editVendor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">Edit Vendor</h2>
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="text-sm text-slate-700">
                  Company Name
                  <input
                    value={editState.companyName}
                    onChange={(event) => setEditState((prev) => ({ ...prev, companyName: event.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm text-slate-700">
                  Contact Name
                  <input
                    value={editState.contactName}
                    onChange={(event) => setEditState((prev) => ({ ...prev, contactName: event.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="text-sm text-slate-700">
                  Contact Email
                  <input
                    type="email"
                    value={editState.email}
                    onChange={(event) => setEditState((prev) => ({ ...prev, email: event.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm text-slate-700">
                  Business Email
                  <input
                    type="email"
                    value={editState.businessEmail}
                    onChange={(event) => setEditState((prev) => ({ ...prev, businessEmail: event.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="text-sm text-slate-700">
                  Phone
                  <input
                    value={editState.phone}
                    onChange={(event) => setEditState((prev) => ({ ...prev, phone: event.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm text-slate-700">
                  Website
                  <input
                    value={editState.website}
                    onChange={(event) => setEditState((prev) => ({ ...prev, website: event.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="text-sm text-slate-700">
                  Category
                  <input
                    value={editState.businessType}
                    onChange={(event) => setEditState((prev) => ({ ...prev, businessType: event.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm text-slate-700">
                  City
                  <input
                    value={editState.city}
                    onChange={(event) => setEditState((prev) => ({ ...prev, city: event.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>Plan updates are handled separately using the “Change Plan” action.</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={saveVendor}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
