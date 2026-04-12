import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock3,
  Coins,
  CreditCard,
  FileClock,
  Layers3,
  Lock,
  Settings2,
  Wallet,
  XCircle,
} from 'lucide-react';

export type AdminSummaryItem = {
  label: string;
  value: string;
  tone?: 'default' | 'warning' | 'danger';
};

export type AdminKpiItem = {
  id: string;
  title: string;
  value: string;
  helper?: string;
  tone?: 'default' | 'warning';
  icon?: ReactNode;
};

export type AdminApprovalRow = {
  id: string;
  title: string;
  vendorName: string;
  categoryLabel: string;
  subcategoryLabel: string;
  targetCompaniesCount: number;
  submittedAt: string;
  isBillingBlocked?: boolean;
  blockingReason?: string;
};

export type AdminVendorHealthRow = {
  vendorId: string;
  vendorName: string;
  planName: string;
  activeOffers: number;
  offerLimitLabel: string;
  leadsUsageLabel: string;
  hiddenLeads: number;
  walletBalanceLabel: string;
  statusLabel: string;
  riskLabel?: string;
  riskTone?: 'warning' | 'danger';
};

export type AdminRankedMetricRow = {
  id: string;
  label: string;
  value: number;
  helper?: string;
};

export type AdminPricingRow = {
  id: string;
  categoryLabel: string;
  subcategoryLabel?: string | null;
  leadPrice: number;
  billingType: string;
  isActive: boolean;
};

export type AdminPlanCard = {
  id: string;
  name: string;
  monthlyPriceLabel: string;
  maxActiveOffersLabel: string;
  includedLeadsLabel: string;
  overageLabel: string;
  activeVendors: number;
};

export type AdminAlertItem = {
  id: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  tone?: 'default' | 'warning' | 'danger';
};

const summaryToneClass: Record<NonNullable<AdminSummaryItem['tone']>, string> = {
  default: 'border-slate-200 bg-white text-slate-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  danger: 'border-rose-200 bg-rose-50 text-rose-900',
};

const alertToneClass: Record<NonNullable<AdminAlertItem['tone']>, string> = {
  default: 'border-slate-200 bg-white text-slate-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  danger: 'border-rose-200 bg-rose-50 text-rose-900',
};

function SectionHeader(props: {
  title: string;
  subtitle: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
          {props.icon}
          {props.title}
        </h2>
        <p className="mt-1 text-sm text-slate-600">{props.subtitle}</p>
      </div>
      {props.action ? <div className="flex-shrink-0">{props.action}</div> : null}
    </div>
  );
}

export function AdminDashboardHeader(props: {
  pendingApprovals: number;
  onScrollToPricing: () => void;
  onScrollToPlans: () => void;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-5 text-white shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Admin Dashboard</h1>
          <p className="mt-2 text-sm text-blue-100 sm:text-base">
            Manage approvals, vendor health, pricing, and marketplace growth.
          </p>
          <p className="mt-4 inline-flex w-fit items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-100">
            {props.pendingApprovals} offers waiting for review
          </p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 lg:w-auto">
          <Link
            to="/admin/offers-review"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
          >
            Review Pending Offers
          </Link>
          <button
            type="button"
            onClick={props.onScrollToPricing}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
          >
            Manage Pricing
          </button>
          <button
            type="button"
            onClick={props.onScrollToPlans}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
          >
            Manage Plans
          </button>
        </div>
      </div>
    </section>
  );
}

export function AdminStickySummaryBar(props: { items: AdminSummaryItem[] }) {
  return (
    <section className="sticky top-20 z-20 rounded-2xl border border-slate-200/80 bg-slate-50/95 p-2 shadow-sm backdrop-blur">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        {props.items.map((item) => (
          <div
            key={item.label}
            className={`rounded-xl border px-3 py-2 ${summaryToneClass[item.tone || 'default']}`}
          >
            <p className="text-[11px] uppercase tracking-wide text-slate-500">{item.label}</p>
            <p className="mt-1 text-sm font-semibold">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ApprovalQueueSection(props: {
  pendingOffers: AdminApprovalRow[];
  approvedToday: number;
  rejectedToday: number;
  onApprove: (offerId: string) => void;
  onReject: (offerId: string) => void;
  isSubmittingId?: string | null;
  categoryFilter: string;
  vendorFilter: string;
  ageFilter: string;
  onCategoryFilterChange: (next: string) => void;
  onVendorFilterChange: (next: string) => void;
  onAgeFilterChange: (next: string) => void;
  availableCategories: string[];
  availableVendors: string[];
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <SectionHeader
        title="Approval queue priority"
        subtitle="Review submitted offers quickly and keep launch SLAs under control."
        icon={<FileClock className="h-5 w-5 text-blue-700" />}
        action={
          <Link
            to="/admin/offers-review"
            className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Open full queue
          </Link>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs uppercase tracking-wide text-amber-700">Pending offers</p>
          <p className="mt-1 text-xl font-semibold text-amber-900">{props.pendingOffers.length}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs uppercase tracking-wide text-emerald-700">Approved today</p>
          <p className="mt-1 text-xl font-semibold text-emerald-900">{props.approvedToday}</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
          <p className="text-xs uppercase tracking-wide text-rose-700">Rejected today</p>
          <p className="mt-1 text-xl font-semibold text-rose-900">{props.rejectedToday}</p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-3">
        <label className="text-sm text-slate-700">
          Category
          <select
            value={props.categoryFilter}
            onChange={(event) => props.onCategoryFilterChange(event.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">All categories</option>
            {props.availableCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-700">
          Vendor
          <select
            value={props.vendorFilter}
            onChange={(event) => props.onVendorFilterChange(event.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">All vendors</option>
            {props.availableVendors.map((vendor) => (
              <option key={vendor} value={vendor}>
                {vendor}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-700">
          Submission age
          <select
            value={props.ageFilter}
            onChange={(event) => props.onAgeFilterChange(event.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="24h">Last 24h</option>
            <option value="3d">Last 3 days</option>
            <option value="7d">Last 7 days</option>
            <option value="older">Older than 7 days</option>
          </select>
        </label>
      </div>

      {props.pendingOffers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <p className="text-sm font-semibold text-slate-900">No pending offers in this filter.</p>
          <p className="mt-1 text-sm text-slate-600">Approval queue is currently healthy.</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 lg:block">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Offer</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Vendor</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Category</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-slate-500">Targets</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Submitted</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {props.pendingOffers.map((offer) => (
                  <tr key={offer.id} className="border-t border-slate-100">
                    <td className="px-3 py-3">
                      <p className="text-sm font-semibold text-slate-900">{offer.title}</p>
                      {offer.isBillingBlocked ? (
                        <p className="mt-1 text-xs text-amber-700">{offer.blockingReason || 'Billing blocked'}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-700">{offer.vendorName}</td>
                    <td className="px-3 py-3 text-sm text-slate-700">
                      {offer.categoryLabel}
                      <span className="text-slate-500"> / {offer.subcategoryLabel}</span>
                    </td>
                    <td className="px-3 py-3 text-right text-sm text-slate-700">{offer.targetCompaniesCount}</td>
                    <td className="px-3 py-3 text-sm text-slate-700">
                      {new Date(offer.submittedAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => props.onApprove(offer.id)}
                          disabled={props.isSubmittingId === offer.id}
                          className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => props.onReject(offer.id)}
                          disabled={props.isSubmittingId === offer.id}
                          className="rounded-md border border-rose-300 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                        >
                          Reject
                        </button>
                        <Link
                          to="/admin/offers-review"
                          className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 lg:hidden">
            {props.pendingOffers.map((offer) => (
              <article key={offer.id} className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-900">{offer.title}</p>
                <p className="mt-1 text-xs text-slate-600">{offer.vendorName}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {offer.categoryLabel} / {offer.subcategoryLabel}
                </p>
                <p className="mt-1 text-xs text-slate-500">{new Date(offer.submittedAt).toLocaleString()}</p>
                {offer.isBillingBlocked ? (
                  <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-700">
                    {offer.blockingReason || 'Billing blocked'}
                  </p>
                ) : null}
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => props.onApprove(offer.id)}
                    disabled={props.isSubmittingId === offer.id}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg bg-emerald-600 px-2 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => props.onReject(offer.id)}
                    disabled={props.isSubmittingId === offer.id}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-rose-300 px-2 text-xs font-semibold text-rose-700 disabled:opacity-60"
                  >
                    Reject
                  </button>
                  <Link
                    to="/admin/offers-review"
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 px-2 text-xs font-semibold text-slate-700"
                  >
                    View
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export function AdminKpiGrid(props: { items: AdminKpiItem[] }) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {props.items.map((item) => (
        <article
          key={item.id}
          className={`rounded-2xl border p-4 shadow-sm ${
            item.tone === 'warning' ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">{item.title}</p>
            {item.icon}
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{item.value}</p>
          {item.helper ? <p className="mt-1 text-xs text-slate-600">{item.helper}</p> : null}
        </article>
      ))}
    </section>
  );
}

export function VendorHealthSection(props: {
  rows: AdminVendorHealthRow[];
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <SectionHeader
        title="Vendor health and billing risk"
        subtitle="Track vendors that are blocked, low balance, near limits, or underperforming."
        icon={<Building2 className="h-5 w-5 text-blue-700" />}
      />

      {props.rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
          No vendor health risks detected.
        </p>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 lg:block">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Vendor</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Plan</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Offers</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Leads</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-slate-500">Hidden</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-slate-500">Wallet</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {props.rows.map((row) => (
                  <tr key={row.vendorId} className="border-t border-slate-100">
                    <td className="px-3 py-3">
                      <p className="text-sm font-semibold text-slate-900">{row.vendorName}</p>
                      {row.riskLabel ? (
                        <p
                          className={`mt-1 text-xs ${
                            row.riskTone === 'danger' ? 'text-rose-700' : 'text-amber-700'
                          }`}
                        >
                          {row.riskLabel}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-700">{row.planName}</td>
                    <td className="px-3 py-3 text-sm text-slate-700">
                      {row.activeOffers} / {row.offerLimitLabel}
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-700">{row.leadsUsageLabel}</td>
                    <td className="px-3 py-3 text-right text-sm text-amber-700">{row.hiddenLeads}</td>
                    <td className="px-3 py-3 text-right text-sm text-slate-700">{row.walletBalanceLabel}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {row.statusLabel}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/admin/vendors/${row.vendorId}/billing-plan`}
                          className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Adjust plan
                        </Link>
                        <Link
                          to="/admin/offers"
                          className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Review offers
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 lg:hidden">
            {props.rows.map((row) => (
              <article key={row.vendorId} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{row.vendorName}</p>
                    <p className="text-xs text-slate-600">{row.planName}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                    {row.statusLabel}
                  </span>
                </div>
                {row.riskLabel ? (
                  <p
                    className={`mt-2 rounded-md px-2 py-1 text-xs ${
                      row.riskTone === 'danger' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {row.riskLabel}
                  </p>
                ) : null}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-[11px] uppercase text-slate-500">Offers</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {row.activeOffers} / {row.offerLimitLabel}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-[11px] uppercase text-slate-500">Leads</p>
                    <p className="text-sm font-semibold text-slate-900">{row.leadsUsageLabel}</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-2">
                    <p className="text-[11px] uppercase text-amber-700">Hidden leads</p>
                    <p className="text-sm font-semibold text-amber-900">{row.hiddenLeads}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-[11px] uppercase text-slate-500">Wallet</p>
                    <p className="text-sm font-semibold text-slate-900">{row.walletBalanceLabel}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link
                    to={`/admin/vendors/${row.vendorId}/billing-plan`}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    Adjust Plan
                  </Link>
                  <Link
                    to="/admin/offers"
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    Review Offers
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function RankedMetricList(props: {
  title: string;
  rows: AdminRankedMetricRow[];
  emptyMessage: string;
}) {
  const maxValue = props.rows.reduce((best, row) => Math.max(best, row.value), 0);
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-900">{props.title}</p>
      {props.rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{props.emptyMessage}</p>
      ) : (
        <div className="mt-3 space-y-2">
          {props.rows.map((row) => (
            <div key={row.id}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="truncate text-xs text-slate-700">{row.label}</p>
                <p className="text-xs font-semibold text-slate-900">{row.value}</p>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${maxValue > 0 ? (row.value / maxValue) * 100 : 0}%` }}
                />
              </div>
              {row.helper ? <p className="mt-1 text-[11px] text-slate-500">{row.helper}</p> : null}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

export function LeadRevenueAnalyticsSection(props: {
  leadsByCategory: AdminRankedMetricRow[];
  leadsBySubcategory: AdminRankedMetricRow[];
  revenueByCategory: AdminRankedMetricRow[];
  topVendorsVisible: AdminRankedMetricRow[];
  topVendorsHidden: AdminRankedMetricRow[];
  topCompanies: AdminRankedMetricRow[];
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <SectionHeader
        title="Lead and revenue analytics"
        subtitle="Track category demand, vendor output, and revenue concentration quickly."
        icon={<Layers3 className="h-5 w-5 text-blue-700" />}
      />

      <div className="grid gap-3 lg:grid-cols-3">
        <RankedMetricList
          title="Leads by category"
          rows={props.leadsByCategory}
          emptyMessage="Category lead volume API not yet available."
        />
        <RankedMetricList
          title="Leads by subcategory"
          rows={props.leadsBySubcategory}
          emptyMessage="Subcategory lead volume API not yet available."
        />
        <RankedMetricList
          title="Revenue estimate by category"
          rows={props.revenueByCategory}
          emptyMessage="Revenue-by-category API not yet available."
        />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <RankedMetricList
          title="Top vendors by visible leads"
          rows={props.topVendorsVisible}
          emptyMessage="No visible lead trend data for this window."
        />
        <RankedMetricList
          title="Top vendors by hidden leads"
          rows={props.topVendorsHidden}
          emptyMessage="No locked lead trend data for this window."
        />
        <RankedMetricList
          title="Top companies by offer submissions"
          rows={props.topCompanies}
          emptyMessage="No submission activity captured yet."
        />
      </div>
    </section>
  );
}

export function PricingConfigSection(props: {
  rows: AdminPricingRow[];
  editAction: ReactNode;
  mobileListAction?: ReactNode;
}) {
  return (
    <section id="pricing-config" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <SectionHeader
        title="Pricing configuration"
        subtitle="Category defaults and subcategory overrides that control lead billing."
        icon={<Settings2 className="h-5 w-5 text-blue-700" />}
        action={props.editAction}
      />

      {props.rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
          No pricing rows configured yet.
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 lg:block">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Scope</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Category</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Subcategory</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-slate-500">Lead price</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Billing type</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">State</th>
                </tr>
              </thead>
              <tbody>
                {props.rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          row.subcategoryLabel ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {row.subcategoryLabel ? 'Subcategory override' : 'Category default'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-700">{row.categoryLabel}</td>
                    <td className="px-3 py-3 text-sm text-slate-700">{row.subcategoryLabel || '-'}</td>
                    <td className="px-3 py-3 text-right text-sm font-semibold text-slate-900">
                      ${row.leadPrice.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-700">{row.billingType}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          row.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {row.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 lg:hidden">
            {props.rows.map((row) => (
              <article key={row.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{row.categoryLabel}</p>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                      row.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {row.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  {row.subcategoryLabel
                    ? `Override for ${row.subcategoryLabel}`
                    : 'Category default pricing'}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-[11px] uppercase text-slate-500">Price</p>
                    <p className="text-sm font-semibold text-slate-900">${row.leadPrice.toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-[11px] uppercase text-slate-500">Type</p>
                    <p className="text-sm font-semibold text-slate-900">{row.billingType}</p>
                  </div>
                </div>
              </article>
            ))}
            {props.mobileListAction ? <div>{props.mobileListAction}</div> : null}
          </div>
        </>
      )}
    </section>
  );
}

export function PlanManagementSection(props: { plans: AdminPlanCard[] }) {
  return (
    <section id="plan-management" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <SectionHeader
        title="Plan management"
        subtitle="Compare plan constraints and see vendor distribution by plan."
        icon={<CreditCard className="h-5 w-5 text-blue-700" />}
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {props.plans.map((plan) => (
          <article key={plan.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between">
              <h3 className="text-base font-semibold text-slate-900">{plan.name}</h3>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                {plan.activeVendors} vendors
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{plan.monthlyPriceLabel}</p>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <p>
                <span className="font-semibold text-slate-900">Max active offers:</span>{' '}
                {plan.maxActiveOffersLabel}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Included leads:</span>{' '}
                {plan.includedLeadsLabel}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Overage:</span> {plan.overageLabel}
              </p>
            </div>
            <div className="mt-4 flex gap-2">
              <Link
                to="/admin/vendors"
                className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                View vendors
              </Link>
              <Link
                to="/admin/plans"
                className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Edit plan
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function MarketplaceAlertsSection(props: {
  alerts: AdminAlertItem[];
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <SectionHeader
        title="Marketplace alerts and recommendations"
        subtitle="Actionable warnings and growth opportunities to keep marketplace momentum high."
        icon={<AlertTriangle className="h-5 w-5 text-blue-700" />}
      />
      {props.alerts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
          No urgent marketplace alerts right now.
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {props.alerts.map((alert) => (
            <article
              key={alert.id}
              className={`rounded-xl border p-4 ${alertToneClass[alert.tone || 'default']}`}
            >
              <h3 className="text-sm font-semibold">{alert.title}</h3>
              <p className="mt-1 text-sm">{alert.description}</p>
              <Link
                to={alert.ctaHref}
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue-800 hover:text-blue-900"
              >
                {alert.ctaLabel}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export const adminKpiIcons = {
  leadsToday: <Clock3 className="h-4 w-4 text-blue-700" />,
  leadsCycle: <FileClock className="h-4 w-4 text-blue-700" />,
  revenue: <Coins className="h-4 w-4 text-emerald-700" />,
  hidden: <Lock className="h-4 w-4 text-amber-700" />,
  activeVendors: <BadgeCheck className="h-4 w-4 text-blue-700" />,
  approvals: <CheckCircle2 className="h-4 w-4 text-emerald-700" />,
  offerLimit: <AlertTriangle className="h-4 w-4 text-amber-700" />,
  leadLimit: <XCircle className="h-4 w-4 text-rose-700" />,
  lowBalance: <Wallet className="h-4 w-4 text-rose-700" />,
  blockedOffers: <Building2 className="h-4 w-4 text-amber-700" />,
};
