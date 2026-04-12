import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

type PlanCode = 'FREE' | 'GOLD' | 'PREMIUM';

type PlanRow = {
  id?: string;
  code: PlanCode;
  name: string;
  description?: string | null;
  monthlyPrice: number;
  maxActiveOffers: number | null;
  includedFreeLeadsPerMonth: number;
  status: 'ACTIVE' | 'INACTIVE';
  updatedAt?: string | null;
  activeVendorCount?: number;
};

type PlanFormState = {
  name: string;
  description: string;
  monthlyPrice: string;
  maxActiveOffers: string;
  includedFreeLeadsPerMonth: string;
  status: 'ACTIVE' | 'INACTIVE';
};

const EMPTY_FORM: PlanFormState = {
  name: '',
  description: '',
  monthlyPrice: '',
  maxActiveOffers: '',
  includedFreeLeadsPerMonth: '',
  status: 'ACTIVE',
};

export default function AdminPlansPage() {
  const { isAdmin } = useAuth();
  const canManage = Boolean(isAdmin);

  const [rows, setRows] = useState<PlanRow[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanRow | null>(null);
  const [form, setForm] = useState<PlanFormState>(EMPTY_FORM);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadPlans = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await api.getAdminPlanConfigs();
      setRows((data || []) as PlanRow[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load plans');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [row.code, row.name, row.description || ''].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [rows, search]);

  const openEdit = (plan: PlanRow) => {
    setSelectedPlan(plan);
    setForm({
      name: plan.name,
      description: plan.description || '',
      monthlyPrice: String(plan.monthlyPrice),
      maxActiveOffers: plan.maxActiveOffers === null ? '' : String(plan.maxActiveOffers),
      includedFreeLeadsPerMonth: String(plan.includedFreeLeadsPerMonth),
      status: plan.status,
    });
    setError('');
    setSuccess('');
  };

  const closeEdit = () => {
    setSelectedPlan(null);
    setForm(EMPTY_FORM);
  };

  const togglePlanStatus = async (plan: PlanRow) => {
    if (!canManage) return;
    try {
      setIsSaving(true);
      setError('');
      await api.updateAdminPlanConfig(plan.code, {
        name: plan.name,
        description: plan.description || null,
        monthlyPrice: Number(plan.monthlyPrice || 0),
        maxActiveOffers:
          plan.maxActiveOffers === null || plan.maxActiveOffers === undefined
            ? null
            : Number(plan.maxActiveOffers),
        includedFreeLeadsPerMonth: Number(plan.includedFreeLeadsPerMonth || 0),
        status: plan.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
      });
      setSuccess(
        `${plan.code} plan ${plan.status === 'ACTIVE' ? 'deactivated' : 'activated'}.`
      );
      await loadPlans();
    } catch (err: any) {
      setError(err.message || 'Failed to update plan status');
    } finally {
      setIsSaving(false);
    }
  };

  const savePlan = async () => {
    if (!selectedPlan || !canManage) return;

    const monthlyPrice = Number(form.monthlyPrice);
    const includedFreeLeadsPerMonth = Number(form.includedFreeLeadsPerMonth);
    const maxActiveOffers =
      form.maxActiveOffers.trim() === '' ? null : Number(form.maxActiveOffers);

    if (!Number.isFinite(monthlyPrice) || monthlyPrice < 0) {
      setError('Monthly price must be a non-negative number.');
      return;
    }
    if (!Number.isInteger(includedFreeLeadsPerMonth) || includedFreeLeadsPerMonth < 0) {
      setError('Included free leads must be a non-negative integer.');
      return;
    }
    if (maxActiveOffers !== null && (!Number.isInteger(maxActiveOffers) || maxActiveOffers < 0)) {
      setError('Max active offers must be a non-negative integer or empty.');
      return;
    }
    if (!form.name.trim()) {
      setError('Plan name is required.');
      return;
    }

    try {
      setIsSaving(true);
      setError('');
      await api.updateAdminPlanConfig(selectedPlan.code, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        monthlyPrice,
        maxActiveOffers,
        includedFreeLeadsPerMonth,
        status: form.status,
      });
      setSuccess(`${selectedPlan.code} plan updated.`);
      closeEdit();
      await loadPlans();
    } catch (err: any) {
      setError(err.message || 'Failed to save plan changes');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-slate-900">Plans</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage FREE, GOLD, and PREMIUM subscription configuration (CAD only).
        </p>
      </div>

      {!canManage ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Read-only mode: only Admin users can edit plan configuration.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Total Plans</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{rows.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Active Plans</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {rows.filter((row) => row.status === 'ACTIVE').length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Inactive Plans</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {rows.filter((row) => row.status !== 'ACTIVE').length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Vendors on Active Plans</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {rows.reduce((sum, row) => sum + Number(row.activeVendorCount || 0), 0)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search plans..."
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm md:max-w-sm"
          />
        </div>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div> : null}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">{success}</div>
      ) : null}

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">Loading plans...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[980px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Plan Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Plan Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Monthly Price</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Max Active Offers</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Included Free Leads</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Updated</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                    No plans found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.code} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{row.name}</p>
                      {row.description ? (
                        <p className="mt-1 max-w-[280px] text-xs text-slate-600">{row.description}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-700">{row.code}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">${row.monthlyPrice.toFixed(2)} CAD</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{row.maxActiveOffers ?? 'No limit'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{row.includedFreeLeadsPerMonth}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          row.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {row.updatedAt ? new Date(row.updatedAt).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canManage ? (
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => togglePlanStatus(row)}
                            disabled={isSaving}
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                          >
                            {row.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">Read only</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedPlan ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">Edit {selectedPlan.code} Plan</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="text-sm text-slate-700">
                Plan Name
                <input
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm text-slate-700">
                Plan Code
                <input
                  value={selectedPlan.code}
                  readOnly
                  className="mt-1 block w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-slate-600"
                />
              </label>
              <label className="text-sm text-slate-700">
                Status
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, status: event.target.value as 'ACTIVE' | 'INACTIVE' }))
                  }
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </label>
              <label className="text-sm text-slate-700">
                Monthly Price (CAD)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.monthlyPrice}
                  onChange={(event) => setForm((prev) => ({ ...prev, monthlyPrice: event.target.value }))}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm text-slate-700">
                Max Active Offers
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.maxActiveOffers}
                  onChange={(event) => setForm((prev) => ({ ...prev, maxActiveOffers: event.target.value }))}
                  placeholder="Leave blank for no limit"
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm text-slate-700 sm:col-span-2">
                Included Free Leads Per Month
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.includedFreeLeadsPerMonth}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, includedFreeLeadsPerMonth: event.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm text-slate-700 sm:col-span-2">
                Description
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={savePlan}
                disabled={isSaving || !canManage}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {isSaving ? 'Saving...' : 'Save Plan'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
