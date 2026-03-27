import { useEffect, useMemo, useState } from 'react';
import { Building2, BriefcaseBusiness, CheckCircle2, Loader2, Send, ShieldAlert, Sparkles, Users } from 'lucide-react';
import api from '../../services/api';

type DashboardData = {
  summary: {
    pendingVendorRequests: number;
    approvedVendors: number;
    draftOffers: number;
    submittedOffers: number;
    liveOffers: number;
  };
  vendorRequests: Array<{
    id: string;
    createdAt: string;
    vendor: {
      id: string;
      companyName: string;
      contactName: string;
      email: string;
      businessType?: string | null;
      city?: string | null;
    };
  }>;
  vendors: Array<{
    id: string;
    companyName: string;
    contactName: string;
    email: string;
    businessEmail?: string | null;
    businessType?: string | null;
    city?: string | null;
    status: string;
    _count: { offers: number; leads: number };
  }>;
  companies: Array<{
    id: string;
    name: string;
    slug: string;
    domain?: string | null;
    verified: boolean;
  }>;
  categories: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  recentOffers: Array<{
    id: string;
    title: string;
    complianceStatus: string;
    active: boolean;
    updatedAt: string;
    vendor: { companyName: string };
    company: { name: string };
    category: { name: string };
  }>;
};

type OfferFormState = {
  vendorId: string;
  companyId: string;
  categoryId: string;
  title: string;
  description: string;
  productName: string;
  productModel: string;
  productUrl: string;
  expiryDate: string;
};

const emptyForm: OfferFormState = {
  vendorId: '',
  companyId: '',
  categoryId: '',
  title: '',
  description: '',
  productName: '',
  productModel: '',
  productUrl: '',
  expiryDate: '',
};

const statusBadgeClass = (status: string) => {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'APPROVED') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (normalized === 'SUBMITTED') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (normalized === 'REJECTED') return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
};

export default function SalesDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [form, setForm] = useState<OfferFormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      setError('');
      const nextData = await api.getSalesDashboard();
      setData(nextData);
      setForm((current) => ({
        ...current,
        vendorId: current.vendorId || nextData.vendors[0]?.id || '',
        companyId: current.companyId || nextData.companies[0]?.id || '',
        categoryId: current.categoryId || nextData.categories[0]?.id || '',
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to load sales workspace');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const selectedVendor = useMemo(
    () => data?.vendors.find((vendor) => vendor.id === form.vendorId) || null,
    [data?.vendors, form.vendorId]
  );
  const selectedCompany = useMemo(
    () => data?.companies.find((company) => company.id === form.companyId) || null,
    [data?.companies, form.companyId]
  );

  const updateForm = (patch: Partial<OfferFormState>) =>
    setForm((current) => ({
      ...current,
      ...patch,
    }));

  const handleSubmit = async () => {
    if (!form.vendorId || !form.companyId || !form.title.trim() || !form.description.trim()) {
      setError('Vendor, target company, title, and description are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      setSuccessMessage('');
      const result = await api.createSalesOffer({
        vendorId: form.vendorId,
        companyId: form.companyId,
        categoryId: form.categoryId || undefined,
        title: form.title.trim(),
        description: form.description.trim(),
        productName: form.productName.trim() || undefined,
        productModel: form.productModel.trim() || undefined,
        productUrl: form.productUrl.trim() || undefined,
        expiryDate: form.expiryDate || undefined,
      });
      setSuccessMessage(result.message || 'Draft offer created.');
      setForm((current) => ({
        ...emptyForm,
        vendorId: current.vendorId,
        companyId: current.companyId,
        categoryId: current.categoryId,
      }));
      await loadDashboard();
    } catch (err: any) {
      setError(err.message || 'Failed to create draft offer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const summaryCards = data
    ? [
        {
          label: 'Pending partner reviews',
          value: data.summary.pendingVendorRequests,
          icon: BriefcaseBusiness,
          tone: 'bg-amber-50 text-amber-700 border-amber-200',
        },
        {
          label: 'Approved vendors',
          value: data.summary.approvedVendors,
          icon: Users,
          tone: 'bg-blue-50 text-blue-700 border-blue-200',
        },
        {
          label: 'Draft offers',
          value: data.summary.draftOffers,
          icon: Building2,
          tone: 'bg-slate-100 text-slate-700 border-slate-200',
        },
        {
          label: 'Submitted offers',
          value: data.summary.submittedOffers,
          icon: Send,
          tone: 'bg-violet-50 text-violet-700 border-violet-200',
        },
        {
          label: 'Live offers',
          value: data.summary.liveOffers,
          icon: CheckCircle2,
          tone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        },
      ]
    : [];

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!data) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error || 'Failed to load sales workspace'}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                <Sparkles className="h-4 w-4" />
                Sales-assisted partner motion
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">Vendor pipeline + offer drafting</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                This workspace is for internal sales staff who help approved vendors get to first draft quickly.
                Sales can create and shape draft offers, but approval, billing, and role changes remain outside this area.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-950 px-4 py-3 text-right text-white">
              <p className="text-xs uppercase tracking-wide text-slate-400">Role boundary</p>
              <p className="mt-1 text-lg font-semibold">Create drafts only</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Step 1</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">Review pending partner applications</p>
              <p className="mt-1 text-sm text-slate-600">Understand who is in the pipeline and which vendors are ready for enablement.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Step 2</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">Pick an approved vendor</p>
              <p className="mt-1 text-sm text-slate-600">Sales only works with approved vendors, for example Telus launching an Amazon-targeted offer.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Step 3</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">Create a draft and hand off</p>
              <p className="mt-1 text-sm text-slate-600">The draft enters the normal vendor/admin review flow. Sales does not approve it.</p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-rose-600" />
            <h2 className="text-lg font-semibold text-slate-900">Guardrails</h2>
          </div>
          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              Can view vendor pipeline, approved partners, companies, and recent offer queue state.
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              Can create draft offers on behalf of approved vendors such as Telus, Bell, or Samsung.
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              Cannot approve vendor applications, approve offers, touch finance/billing, or manage user roles.
            </div>
          </div>
        </div>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div> : null}
      {successMessage ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">{successMessage}</div> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">{card.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</p>
                </div>
                <div className={`rounded-xl border p-3 ${card.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Pending partner applications</h2>
                <p className="mt-1 text-sm text-slate-500">Sales can monitor demand and prepare enablement, but admin still approves.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {data.summary.pendingVendorRequests} open
              </span>
            </div>
            <div className="mt-5 space-y-3">
              {data.vendorRequests.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No pending vendor applications right now.</p>
              ) : (
                data.vendorRequests.map((request) => (
                  <div key={request.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{request.vendor.companyName}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {request.vendor.contactName} · {request.vendor.email}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {request.vendor.businessType || 'General'}{request.vendor.city ? ` · ${request.vendor.city}` : ''}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Approved vendor roster</h2>
                <p className="mt-1 text-sm text-slate-500">Choose from approved partners only when creating assisted offer drafts.</p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {data.vendors.length} approved
              </span>
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Vendor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Category</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Offers</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Leads</th>
                  </tr>
                </thead>
                <tbody>
                  {data.vendors.slice(0, 8).map((vendor) => (
                    <tr key={vendor.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-slate-900">{vendor.companyName}</p>
                        <p className="text-xs text-slate-500">{vendor.contactName} · {vendor.email}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{vendor.businessType || 'General'}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">{vendor._count.offers}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">{vendor._count.leads}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Create assisted draft offer</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Example: Telus creates a mobile plan draft targeting Amazon. The draft then moves to the normal review process.
                </p>
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Draft only</span>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Vendor
                <select
                  value={form.vendorId}
                  onChange={(event) => updateForm({ vendorId: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="">Select vendor</option>
                  {data.vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.companyName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Target company
                <select
                  value={form.companyId}
                  onChange={(event) => updateForm({ companyId: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="">Select company</option>
                  {data.companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Category
                <select
                  value={form.categoryId}
                  onChange={(event) => updateForm({ categoryId: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="">Select category</option>
                  {data.categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Offer end date
                <input
                  type="date"
                  value={form.expiryDate}
                  onChange={(event) => updateForm({ expiryDate: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium text-slate-700 md:col-span-2">
                Offer title
                <input
                  value={form.title}
                  onChange={(event) => updateForm({ title: event.target.value })}
                  placeholder={
                    selectedVendor && selectedCompany
                      ? `${selectedVendor.companyName} exclusive offer for ${selectedCompany.name}`
                      : 'Telus mobile plan for Amazon employees'
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium text-slate-700 md:col-span-2">
                Offer summary
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(event) => updateForm({ description: event.target.value })}
                  placeholder="Describe the employee value proposition, what the vendor is offering, and how the lead flow should work."
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Product name
                <input
                  value={form.productName}
                  onChange={(event) => updateForm({ productName: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Product model
                <input
                  value={form.productModel}
                  onChange={(event) => updateForm({ productModel: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium text-slate-700 md:col-span-2">
                Product URL
                <input
                  value={form.productUrl}
                  onChange={(event) => updateForm({ productUrl: event.target.value })}
                  placeholder="https://"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
            </div>

            {selectedVendor && selectedCompany ? (
              <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                Draft will be created for <span className="font-semibold">{selectedVendor.companyName}</span> targeting{' '}
                <span className="font-semibold">{selectedCompany.name}</span>.
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating draft...' : 'Create Draft Offer'}
              </button>
              <p className="text-sm text-slate-500">Admin or vendor will complete review and submission afterward.</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Recent offer queue</h2>
                <p className="mt-1 text-sm text-slate-500">Recent drafts, submissions, and live offers across the platform.</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {data.recentOffers.slice(0, 8).map((offer) => (
                <div key={offer.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{offer.title}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {offer.vendor.companyName} · {offer.company.name} · {offer.category.name}
                      </p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(offer.complianceStatus)}`}>
                      {offer.complianceStatus}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Updated {new Date(offer.updatedAt).toLocaleString()} · {offer.active ? 'Live' : 'Not live'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
