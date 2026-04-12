import { Fragment, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  active: boolean;
  updatedAt: string;
  _count?: { children?: number; offers?: number };
  children?: CategoryNode[];
};

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
type FormMode = 'CREATE_CATEGORY' | 'EDIT_CATEGORY' | 'CREATE_SUBCATEGORY' | 'EDIT_SUBCATEGORY';

type FormState = {
  id?: string;
  parentId: string;
  name: string;
  slug: string;
  description: string;
  active: boolean;
};

const EMPTY_FORM: FormState = {
  parentId: '',
  name: '',
  slug: '',
  description: '',
  active: true,
};

const slugify = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const statusBadgeClass = (isActive: boolean) =>
  isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600';

export default function AdminCategoriesPage() {
  const { isAdmin } = useAuth();
  const canManage = Boolean(isAdmin);

  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSlugTouched, setIsSlugTouched] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    kind: 'DELETE' | 'TOGGLE_ACTIVE';
    node: CategoryNode;
    nextActive?: boolean;
  } | null>(null);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await api.getAdminCategoryManagementTree();
      setCategories((data || []) as CategoryNode[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const summary = useMemo(() => {
    const totalCategories = categories.length;
    const totalSubcategories = categories.reduce(
      (acc, category) => acc + Number(category.children?.length || 0),
      0
    );
    const activeCategories = categories.filter((category) => category.active).length;
    const inactiveCategories = totalCategories - activeCategories;
    return { totalCategories, totalSubcategories, activeCategories, inactiveCategories };
  }, [categories]);

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matchesStatus = (active: boolean) =>
      statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? active : !active);
    const matchesSearch = (node: CategoryNode) =>
      !query ||
      [node.name, node.slug, node.description || ''].join(' ').toLowerCase().includes(query);

    return categories
      .map((category) => {
        const categoryMatch = matchesStatus(category.active) && matchesSearch(category);
        const matchingChildren = (category.children || []).filter(
          (child) => matchesStatus(child.active) && matchesSearch(child)
        );
        if (!categoryMatch && matchingChildren.length === 0) return null;
        return {
          ...category,
          children: matchingChildren,
        };
      })
      .filter(Boolean) as CategoryNode[];
  }, [categories, search, statusFilter]);

  const openForm = (mode: FormMode, node?: CategoryNode, parent?: CategoryNode) => {
    setFormMode(mode);
    setError('');
    setSuccess('');
    setIsSlugTouched(false);

    if (mode === 'CREATE_CATEGORY') {
      setForm(EMPTY_FORM);
      return;
    }

    if (mode === 'CREATE_SUBCATEGORY' && parent) {
      setForm({
        ...EMPTY_FORM,
        parentId: parent.id,
        active: true,
      });
      return;
    }

    if (node) {
      setForm({
        id: node.id,
        parentId: node.parentId || '',
        name: node.name,
        slug: node.slug,
        description: node.description || '',
        active: node.active,
      });
      setIsSlugTouched(true);
    }
  };

  const closeForm = () => {
    setFormMode(null);
    setForm(EMPTY_FORM);
    setIsSlugTouched(false);
  };

  const handleNameChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      name: value,
      slug: !isSlugTouched ? slugify(value) : prev.slug,
    }));
  };

  const handleSave = async () => {
    if (!canManage || !formMode) return;
    const name = form.name.trim();
    const slug = slugify(form.slug);
    if (!name) {
      setError('Name is required.');
      return;
    }
    if (!slug) {
      setError('Slug is required.');
      return;
    }
    if ((formMode === 'CREATE_SUBCATEGORY' || formMode === 'EDIT_SUBCATEGORY') && !form.parentId) {
      setError('Parent category is required for subcategory.');
      return;
    }

    try {
      setIsSaving(true);
      setError('');
      const payload = {
        name,
        slug,
        description: form.description.trim() || null,
        active: form.active,
        parentId:
          formMode === 'CREATE_CATEGORY' || formMode === 'EDIT_CATEGORY'
            ? null
            : form.parentId,
      };

      if (formMode === 'CREATE_CATEGORY' || formMode === 'CREATE_SUBCATEGORY') {
        await api.createCategory(payload);
        setSuccess(formMode === 'CREATE_CATEGORY' ? 'Category created.' : 'Subcategory created.');
      } else if (form.id) {
        await api.updateCategory(form.id, payload);
        setSuccess(formMode === 'EDIT_CATEGORY' ? 'Category updated.' : 'Subcategory updated.');
      }

      closeForm();
      await loadCategories();
    } catch (err: any) {
      setError(err.message || 'Failed to save category');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction || !canManage) return;

    try {
      setIsSaving(true);
      setError('');
      if (confirmAction.kind === 'DELETE') {
        await api.deleteCategory(confirmAction.node.id);
        setSuccess(
          confirmAction.node.parentId ? 'Subcategory deleted.' : 'Category deleted.'
        );
      } else {
        await api.updateCategory(confirmAction.node.id, { active: confirmAction.nextActive });
        const entityLabel = confirmAction.node.parentId ? 'Subcategory' : 'Category';
        setSuccess(
          confirmAction.nextActive
            ? `${entityLabel} activated.`
            : `${entityLabel} deactivated.`
        );
      }
      setConfirmAction(null);
      await loadCategories();
    } catch (err: any) {
      setError(err.message || 'Action failed');
    } finally {
      setIsSaving(false);
    }
  };

  const categoryOptions = categories.map((category) => ({
    id: category.id,
    name: category.name,
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Category Management</h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage categories and subcategories for offers.
            </p>
          </div>
          {canManage ? (
            <button
              type="button"
              onClick={() => openForm('CREATE_CATEGORY')}
              className="inline-flex min-h-11 items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Total Categories</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.totalCategories}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Total Subcategories</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.totalSubcategories}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Active Categories</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.activeCategories}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Inactive Categories</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.inactiveCategories}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search categories or subcategories"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm md:col-span-2"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="ALL">All</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {!canManage ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Read-only mode: only Admin users can create, edit, delete, activate, or deactivate
          categories and subcategories.
        </div>
      ) : null}

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div> : null}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">{success}</div>
      ) : null}

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
          Loading categories...
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[980px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Category Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Slug</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Subcategories Count</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Updated At</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    No categories found.
                  </td>
                </tr>
              ) : (
                filteredCategories.map((category) => {
                  const isExpanded = Boolean(expandedIds[category.id]);
                  const subcategories = category.children || [];
                  return (
                    <Fragment key={category.id}>
                      <tr className="border-b border-slate-100">
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedIds((prev) => ({ ...prev, [category.id]: !prev[category.id] }))
                            }
                            className="inline-flex items-center text-sm font-medium text-slate-900"
                          >
                            {isExpanded ? (
                              <ChevronDown className="mr-2 h-4 w-4 text-slate-500" />
                            ) : (
                              <ChevronRight className="mr-2 h-4 w-4 text-slate-500" />
                            )}
                            {category.name}
                          </button>
                          {category.description ? (
                            <p className="mt-1 max-w-[360px] text-xs text-slate-500">{category.description}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{category.slug}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {Number(category._count?.children || 0)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(category.active)}`}>
                            {category.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {new Date(category.updatedAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canManage ? (
                            <div className="inline-flex gap-2">
                              <button
                                type="button"
                                onClick={() => openForm('CREATE_SUBCATEGORY', undefined, category)}
                                className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                Add Subcategory
                              </button>
                              <button
                                type="button"
                                onClick={() => openForm('EDIT_CATEGORY', category)}
                                className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmAction({
                                    kind: 'TOGGLE_ACTIVE',
                                    node: category,
                                    nextActive: !category.active,
                                  })
                                }
                                className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                {category.active ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmAction({ kind: 'DELETE', node: category })}
                                className="rounded-md border border-rose-300 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                              >
                                Delete
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500">Read only</span>
                          )}
                        </td>
                      </tr>

                      {isExpanded && (
                        <>
                          <tr className="border-b border-slate-100 bg-slate-50">
                            <td className="px-10 py-2 text-xs font-semibold uppercase text-slate-500">Subcategory Name</td>
                            <td className="px-4 py-2 text-xs font-semibold uppercase text-slate-500">Slug</td>
                            <td className="px-4 py-2 text-xs font-semibold uppercase text-slate-500"></td>
                            <td className="px-4 py-2 text-xs font-semibold uppercase text-slate-500">Status</td>
                            <td className="px-4 py-2 text-xs font-semibold uppercase text-slate-500">Updated At</td>
                            <td className="px-4 py-2 text-right text-xs font-semibold uppercase text-slate-500">Actions</td>
                          </tr>
                          {subcategories.length === 0 ? (
                            <tr className="border-b border-slate-100">
                              <td colSpan={6} className="px-10 py-4 text-sm text-slate-500">
                                No subcategories found for the current filter.
                              </td>
                            </tr>
                          ) : (
                            subcategories.map((subcategory) => (
                              <tr key={subcategory.id} className="border-b border-slate-100 bg-slate-50/40">
                                <td className="px-10 py-3 text-sm font-medium text-slate-900">{subcategory.name}</td>
                                <td className="px-4 py-3 text-sm text-slate-700">{subcategory.slug}</td>
                                <td className="px-4 py-3 text-sm text-slate-300">-</td>
                                <td className="px-4 py-3 text-sm">
                                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(subcategory.active)}`}>
                                    {subcategory.active ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-600">
                                  {new Date(subcategory.updatedAt).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {canManage ? (
                                    <div className="inline-flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => openForm('EDIT_SUBCATEGORY', subcategory)}
                                        className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setConfirmAction({
                                            kind: 'TOGGLE_ACTIVE',
                                            node: subcategory,
                                            nextActive: !subcategory.active,
                                          })
                                        }
                                        className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                      >
                                        {subcategory.active ? 'Deactivate' : 'Activate'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmAction({ kind: 'DELETE', node: subcategory })}
                                        className="rounded-md border border-rose-300 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-slate-500">Read only</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {formMode ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              {formMode === 'CREATE_CATEGORY'
                ? 'Add Category'
                : formMode === 'EDIT_CATEGORY'
                ? 'Edit Category'
                : formMode === 'CREATE_SUBCATEGORY'
                ? 'Add Subcategory'
                : 'Edit Subcategory'}
            </h2>

            <div className="mt-4 space-y-4">
              {(formMode === 'CREATE_SUBCATEGORY' || formMode === 'EDIT_SUBCATEGORY') && (
                <label className="block text-sm text-slate-700">
                  Parent Category
                  <select
                    value={form.parentId}
                    onChange={(event) => setForm((prev) => ({ ...prev, parentId: event.target.value }))}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                  >
                    <option value="">Select parent category</option>
                    {categoryOptions.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="block text-sm text-slate-700">
                {formMode === 'CREATE_SUBCATEGORY' || formMode === 'EDIT_SUBCATEGORY'
                  ? 'Subcategory Name'
                  : 'Category Name'}
                <input
                  value={form.name}
                  onChange={(event) => handleNameChange(event.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="block text-sm text-slate-700">
                Slug
                <input
                  value={form.slug}
                  onChange={(event) => {
                    setIsSlugTouched(true);
                    setForm((prev) => ({ ...prev, slug: slugify(event.target.value) }));
                  }}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="block text-sm text-slate-700">
                Description (optional)
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="block text-sm text-slate-700">
                Status
                <select
                  value={form.active ? 'ACTIVE' : 'INACTIVE'}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, active: event.target.value === 'ACTIVE' }))
                  }
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !canManage}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmAction ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              {confirmAction.kind === 'DELETE'
                ? `Delete ${confirmAction.node.parentId ? 'Subcategory' : 'Category'}`
                : `${confirmAction.nextActive ? 'Activate' : 'Deactivate'} ${
                    confirmAction.node.parentId ? 'Subcategory' : 'Category'
                  }`}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {confirmAction.kind === 'DELETE'
                ? `Are you sure you want to delete "${confirmAction.node.name}"?`
                : `Are you sure you want to ${
                    confirmAction.nextActive ? 'activate' : 'deactivate'
                  } "${confirmAction.node.name}"?`}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={isSaving || !canManage}
                className={`rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
                  confirmAction.kind === 'DELETE' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-800 hover:bg-slate-900'
                }`}
              >
                {isSaving ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
