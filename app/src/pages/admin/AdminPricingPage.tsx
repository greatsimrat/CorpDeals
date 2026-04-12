import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

type CategoryNode = {
  id: string;
  name: string;
  parentId?: string | null;
  active?: boolean;
};

type PricingRow = {
  id: string;
  categoryId: string;
  subcategoryId?: string | null;
  leadPrice: string | number;
  billingType: 'PER_LEAD' | 'PER_SALE';
  isActive: boolean;
  description?: string | null;
  updatedAt?: string;
  category?: { id: string; name: string };
  subcategory?: { id: string; name: string };
};

type PricingFormState = {
  categoryId: string;
  subcategoryId: string;
  leadPrice: string;
  billingType: 'PER_LEAD' | 'PER_SALE';
  isActive: boolean;
  description: string;
};

const EMPTY_FORM: PricingFormState = {
  categoryId: '',
  subcategoryId: '',
  leadPrice: '',
  billingType: 'PER_LEAD',
  isActive: true,
  description: '',
};

export default function AdminPricingPage() {
  const { isAdmin } = useAuth();
  const canManage = Boolean(isAdmin);

  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [rows, setRows] = useState<PricingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedRow, setSelectedRow] = useState<PricingRow | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [form, setForm] = useState<PricingFormState>(EMPTY_FORM);

  const parentCategories = useMemo(
    () => categories.filter((item) => !item.parentId),
    [categories]
  );

  const subcategoriesByParent = useMemo(() => {
    const grouped = new Map<string, CategoryNode[]>();
    categories
      .filter((item) => Boolean(item.parentId))
      .forEach((item) => {
        const parentId = String(item.parentId);
        grouped.set(parentId, [...(grouped.get(parentId) || []), item]);
      });
    for (const [key, value] of grouped.entries()) {
      grouped.set(
        key,
        value.sort((a, b) => a.name.localeCompare(b.name))
      );
    }
    return grouped;
  }, [categories]);

  const currentSubcategoryOptions = useMemo(
    () => (subcategoriesByParent.get(form.categoryId) || []).filter((node) => node.active !== false),
    [form.categoryId, subcategoriesByParent]
  );

  const load = async () => {
    try {
      setIsLoading(true);
      setError('');
      const [categoriesData, pricingData] = await Promise.all([
        api.getAdminCategoryManagementTree(),
        api.getAdminCategoryLeadPricing({}),
      ]);

      const flattenedCategories: CategoryNode[] = [];
      for (const category of (categoriesData || []) as any[]) {
        flattenedCategories.push({
          id: category.id,
          name: category.name,
          parentId: null,
          active: Boolean(category.active),
        });
        for (const child of category.children || []) {
          flattenedCategories.push({
            id: child.id,
            name: child.name,
            parentId: category.id,
            active: Boolean(child.active),
          });
        }
      }

      setCategories(flattenedCategories);
      setRows((pricingData || []) as PricingRow[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load pricing configuration');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch =
        !query ||
        [row.category?.name || '', row.subcategory?.name || '', row.description || '']
          .join(' ')
          .toLowerCase()
          .includes(query);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' ? row.isActive : !row.isActive);
      const matchesCategory =
        categoryFilter === 'all' || row.categoryId === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [rows, search, statusFilter, categoryFilter]);

  const openCreate = () => {
    if (!canManage) return;
    setSelectedRow(null);
    setForm(EMPTY_FORM);
    setError('');
    setSuccess('');
    setIsEditorOpen(true);
  };

  const openEdit = (row: PricingRow) => {
    if (!canManage) return;
    setSelectedRow(row);
    setForm({
      categoryId: row.categoryId,
      subcategoryId: row.subcategoryId || '',
      leadPrice: String(row.leadPrice),
      billingType: row.billingType || 'PER_LEAD',
      isActive: Boolean(row.isActive),
      description: row.description || '',
    });
    setError('');
    setSuccess('');
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setSelectedRow(null);
    setForm(EMPTY_FORM);
    setIsEditorOpen(false);
  };

  const save = async () => {
    if (!canManage) return;
    const leadPrice = Number(form.leadPrice);
    if (!form.categoryId) {
      setError('Category is required.');
      return;
    }
    if (!form.subcategoryId) {
      setError('Subcategory is required.');
      return;
    }
    if (!Number.isFinite(leadPrice) || leadPrice < 0) {
      setError('Price per lead must be a non-negative number.');
      return;
    }

    try {
      setIsSaving(true);
      setError('');
      await api.saveAdminCategoryLeadPricing({
        categoryId: form.categoryId,
        subcategoryId: form.subcategoryId,
        leadPrice,
        billingType: form.billingType,
        isActive: form.isActive,
        description: form.description.trim() || undefined,
      } as any);
      setSuccess(selectedRow ? 'Pricing row updated.' : 'Pricing row created.');
      closeEditor();
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to save pricing configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (row: PricingRow) => {
    if (!canManage) return;
    try {
      setIsSaving(true);
      setError('');
      await api.saveAdminCategoryLeadPricing({
        categoryId: row.categoryId,
        subcategoryId: row.subcategoryId || null,
        leadPrice: Number(row.leadPrice),
        billingType: row.billingType || 'PER_LEAD',
        isActive: !row.isActive,
        description: row.description || undefined,
      });
      setSuccess(`Pricing row ${row.isActive ? 'deactivated' : 'activated'}.`);
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to update pricing status');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Pricing</h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage lead pricing by category and subcategory (CAD only).
            </p>
          </div>
          {canManage ? (
            <button
              type="button"
              onClick={openCreate}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Add Pricing
            </button>
          ) : null}
        </div>
      </div>

      {!canManage ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Read-only mode: only Admin users can create, edit, activate, or deactivate pricing rows.
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search category/subcategory..."
            className="rounded-md border border-slate-300 px-3 py-2 text-sm md:col-span-2"
          />
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">All categories</option>
            {parentCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div> : null}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">{success}</div>
      ) : null}

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">Loading pricing rows...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[980px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Subcategory</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Price Per Lead</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Updated</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                    No pricing rows found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{row.category?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{row.subcategory?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">${Number(row.leadPrice).toFixed(2)} CAD</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          row.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {row.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{row.description || '-'}</td>
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
                            onClick={() => toggleStatus(row)}
                            disabled={isSaving}
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                          >
                            {row.isActive ? 'Deactivate' : 'Activate'}
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

      {isEditorOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              {selectedRow ? 'Edit Pricing' : 'Add Pricing'}
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="text-sm text-slate-700">
                Category
                <select
                  value={form.categoryId}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, categoryId: event.target.value, subcategoryId: '' }))
                  }
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                >
                  <option value="">Select category</option>
                  {parentCategories.filter((node) => node.active !== false).map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-slate-700">
                Subcategory
                <select
                  value={form.subcategoryId}
                  onChange={(event) => setForm((prev) => ({ ...prev, subcategoryId: event.target.value }))}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                  disabled={!form.categoryId}
                >
                  <option value="">Select subcategory</option>
                  {currentSubcategoryOptions.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-slate-700">
                Price Per Lead (CAD)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.leadPrice}
                  onChange={(event) => setForm((prev) => ({ ...prev, leadPrice: event.target.value }))}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="text-sm text-slate-700">
                Status
                <select
                  value={form.isActive ? 'ACTIVE' : 'INACTIVE'}
                  onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.value === 'ACTIVE' }))}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </label>

              <label className="text-sm text-slate-700 md:col-span-2">
                Description (optional)
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={isSaving || !canManage}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {isSaving ? 'Saving...' : selectedRow ? 'Save Changes' : 'Create Row'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

