import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CreditCard,
  Lock,
  TrendingUp,
  Wallet,
} from 'lucide-react';

export type DashboardOfferPerformanceRow = {
  offerId: string;
  offerName: string;
  companyName: string;
  targetCompaniesCount: number;
  leads: number;
  hiddenLeads: number;
  statusLabel: string;
  isActive: boolean;
  editHref: string;
  cloneHref: string;
};

export type HiddenLeadTeaser = {
  id: string;
  companyName: string;
  locationLabel: string;
  categoryLabel: string;
  createdAt: string;
  lockedReason?: string | null;
};

export type WalletTransactionRow = {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  createdAt: string;
};

export type GrowthSuggestion = {
  id: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  tone?: 'default' | 'warning';
};

type SummaryItem = {
  label: string;
  value: string;
  tone?: 'default' | 'warning' | 'danger';
};

const toneClass: Record<NonNullable<SummaryItem['tone']>, string> = {
  default: 'border-slate-200 bg-white text-slate-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  danger: 'border-rose-200 bg-rose-50 text-rose-900',
};

export function VendorDashboardHeader(props: {
  companyName: string;
  status: string;
  subtitle: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-5 text-white shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <span className="inline-flex w-fit items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-100">
            {props.status || 'Approved vendor'}
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Vendor Dashboard</h1>
          <p className="mt-1 text-sm text-blue-100 sm:text-base">
            {props.subtitle}
          </p>
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-blue-200">{props.companyName}</p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:w-auto">
          <Link
            to={props.primaryHref}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
          >
            {props.primaryLabel}
          </Link>
          <Link
            to={props.secondaryHref}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
          >
            {props.secondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}

export function VendorStickySummaryBar(props: { items: SummaryItem[] }) {
  return (
    <section className="sticky top-2 z-20 rounded-2xl border border-slate-200/80 bg-slate-50/95 p-2 shadow-sm backdrop-blur md:top-4">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        {props.items.map((item) => (
          <div
            key={item.label}
            className={`rounded-xl border px-3 py-2 ${toneClass[item.tone || 'default']}`}
          >
            <p className="text-[11px] uppercase tracking-wide text-slate-500">{item.label}</p>
            <p className="mt-1 text-sm font-semibold">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function HiddenLeadsAlertCard(props: {
  hiddenCount: number;
  estimatedValueText: string;
  upgradeHref: string;
  upgradeLabel?: string;
  showUpgradeAction?: boolean;
  topUpHref: string;
  viewHref: string;
}) {
  if (props.hiddenCount <= 0) return null;
  const showUpgradeAction = props.showUpgradeAction !== false;
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
            <AlertTriangle className="h-4 w-4" />
            Hidden lead opportunity
          </p>
          <h2 className="mt-1 text-lg font-semibold text-amber-900">
            You have {props.hiddenCount} hidden leads waiting
          </h2>
          <p className="text-sm text-amber-800">
            Upgrade your plan or top up your wallet to unlock them. Estimated value: {props.estimatedValueText}
          </p>
        </div>
        <div className={`grid w-full grid-cols-1 gap-2 ${showUpgradeAction ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} md:w-auto`}>
          {showUpgradeAction ? (
            <Link to={props.upgradeHref} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800">
              {props.upgradeLabel || 'Upgrade Plan'}
            </Link>
          ) : null}
          <Link to={props.topUpHref} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100">
            Top Up Wallet
          </Link>
          <Link to={props.viewHref} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100">
            View Hidden Leads
          </Link>
        </div>
      </div>
    </section>
  );
}

export function VendorKpiCard(props: {
  title: string;
  value: string;
  helper?: string;
  icon?: React.ReactNode;
  tone?: 'default' | 'warning';
}) {
  const wrapperClass =
    props.tone === 'warning'
      ? 'border-amber-200 bg-amber-50'
      : 'border-slate-200 bg-white';

  return (
    <article className={`rounded-2xl border p-4 shadow-sm ${wrapperClass}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-slate-500">{props.title}</p>
        {props.icon}
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{props.value}</p>
      {props.helper ? <p className="mt-1 text-xs text-slate-600">{props.helper}</p> : null}
    </article>
  );
}

export function OfferPerformanceSection(props: {
  offers: DashboardOfferPerformanceRow[];
  createOfferHref: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-900">Offer performance</h3>
        <Link to={props.createOfferHref} className="text-sm font-semibold text-blue-700 hover:text-blue-900">
          Create offer
        </Link>
      </div>

      {props.offers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <p className="text-sm font-semibold text-slate-900">You have no active offers yet</p>
          <p className="mt-1 text-sm text-slate-600">Launch your first offer to start receiving leads.</p>
          <Link to={props.createOfferHref} className="mt-3 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            Create your first offer
          </Link>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 lg:block">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Offer</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-slate-500">Target Cos.</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-slate-500">Leads</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-slate-500">Hidden</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {props.offers.map((offer) => (
                  <tr key={offer.offerId} className="border-t border-slate-100">
                    <td className="px-3 py-3">
                      <p className="text-sm font-semibold text-slate-900">{offer.offerName}</p>
                      <p className="text-xs text-slate-500">{offer.companyName}</p>
                    </td>
                    <td className="px-3 py-3 text-right text-sm text-slate-700">{offer.targetCompaniesCount}</td>
                    <td className="px-3 py-3 text-right text-sm text-slate-700">{offer.leads}</td>
                    <td className="px-3 py-3 text-right text-sm text-amber-700">{offer.hiddenLeads}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${offer.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                        {offer.statusLabel}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link to={offer.editHref} className="text-xs font-semibold text-blue-700 hover:text-blue-900">Edit</Link>
                        <Link to={offer.cloneHref} className="text-xs font-semibold text-blue-700 hover:text-blue-900">Clone</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 lg:hidden">
            {props.offers.map((offer) => (
              <article key={offer.offerId} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{offer.offerName}</p>
                    <p className="text-xs text-slate-500">{offer.companyName}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${offer.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                    {offer.statusLabel}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-[11px] uppercase text-slate-500">Target</p>
                    <p className="text-sm font-semibold text-slate-900">{offer.targetCompaniesCount}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-[11px] uppercase text-slate-500">Leads</p>
                    <p className="text-sm font-semibold text-slate-900">{offer.leads}</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-2">
                    <p className="text-[11px] uppercase text-amber-700">Hidden</p>
                    <p className="text-sm font-semibold text-amber-900">{offer.hiddenLeads}</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Link to={offer.editHref} className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">
                    View / Edit
                  </Link>
                  <Link to={offer.cloneHref} className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">
                    Clone
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

export function CompanyCoverageExpansionSection(props: {
  targetedCount: number;
  totalCount: number;
  missingCount: number;
  estimatedMissedLeads: number;
  suggestedCompanies: string[];
  expandHref: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h3 className="text-lg font-semibold text-slate-900">Company coverage expansion</h3>
      <p className="mt-1 text-sm text-slate-600">Expand coverage to increase lead volume and win more business.</p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Coverage now</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {props.targetedCount} of {props.totalCount || 0}
          </p>
          <p className="mt-1 text-sm text-slate-600">Companies currently targeted by your offers.</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs uppercase tracking-wide text-blue-700">Growth opportunity</p>
          <p className="mt-2 text-2xl font-semibold text-blue-900">{props.missingCount}</p>
          <p className="mt-1 text-sm text-blue-800">
            Companies not yet targeted. Estimated missed leads: {props.estimatedMissedLeads}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {props.suggestedCompanies.length > 0 ? (
          props.suggestedCompanies.map((company) => (
            <span key={company} className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
              {company}
            </span>
          ))
        ) : (
          <p className="text-sm text-slate-600">No uncovered companies found.</p>
        )}
      </div>

      <div className="mt-4">
        <Link to={props.expandHref} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
          Add offer for more companies
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

export function HiddenLeadsSection(props: {
  leads: HiddenLeadTeaser[];
  billingHref: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Lock className="h-5 w-5 text-amber-700" />
          Hidden leads
        </h3>
        <Link to={props.billingHref} className="text-sm font-semibold text-blue-700 hover:text-blue-900">
          Unlock leads
        </Link>
      </div>

      {props.leads.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
          No hidden leads right now.
        </p>
      ) : (
        <div className="space-y-3">
          {props.leads.map((lead) => (
            <article key={lead.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-amber-900">{lead.companyName}</p>
                  <p className="text-xs text-amber-800">{lead.locationLabel}</p>
                </div>
                <span className="inline-flex w-fit rounded-full border border-amber-300 bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                  Locked
                </span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <p className="text-xs text-amber-800">
                  <span className="font-semibold">Category:</span> {lead.categoryLabel}
                </p>
                <p className="text-xs text-amber-800">
                  <span className="font-semibold">Submitted:</span> {new Date(lead.createdAt).toLocaleString()}
                </p>
                <p className="text-xs text-amber-800">
                  <span className="font-semibold">Reason:</span> {lead.lockedReason || 'Billing lock'}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function BillingWalletSection(props: {
  planName: string;
  walletBalanceText: string;
  includedRemainingText: string;
  chargesThisCycleText: string;
  transactions: WalletTransactionRow[];
  onTopUp: (amount: number) => void;
  isToppingUp: boolean;
  manageBillingHref: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h3 className="text-lg font-semibold text-slate-900">Billing and wallet</h3>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Current plan</p>
            <p className="mt-1 text-base font-semibold text-slate-900">{props.planName}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                <Wallet className="h-4 w-4 text-blue-600" />
                Wallet balance
              </p>
              <p className="mt-2 text-xl font-semibold text-slate-900">{props.walletBalanceText}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                Included leads
              </p>
              <p className="mt-2 text-xl font-semibold text-slate-900">{props.includedRemainingText}</p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
              <CreditCard className="h-4 w-4 text-violet-600" />
              Wallet spend this cycle
            </p>
            <p className="mt-2 text-xl font-semibold text-slate-900">{props.chargesThisCycleText}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[50, 100, 250].map((amount) => (
              <button
                key={amount}
                type="button"
                disabled={props.isToppingUp}
                onClick={() => props.onTopUp(amount)}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
              >
                Top up ${amount}
              </button>
            ))}
            <Link to={props.manageBillingHref} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800">
              Manage Billing
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200">
          <div className="border-b border-slate-200 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Recent wallet transactions</p>
          </div>
          <div className="max-h-80 overflow-auto">
            {props.transactions.length === 0 ? (
              <p className="p-4 text-sm text-slate-600">No wallet transactions yet.</p>
            ) : (
              props.transactions.slice(0, 10).map((tx) => (
                <div key={tx.id} className="border-b border-slate-100 px-4 py-3 last:border-b-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{tx.type.replace(/_/g, ' ')}</p>
                    <p className={`text-sm font-semibold ${tx.type === 'TOP_UP' ? 'text-emerald-700' : 'text-slate-700'}`}>
                      {tx.type === 'TOP_UP' ? '+' : '-'}${Math.abs(tx.amount).toFixed(2)}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">
                    Balance after: ${tx.balanceAfter.toFixed(2)} | {new Date(tx.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function GrowthSuggestionsSection(props: { suggestions: GrowthSuggestion[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h3 className="text-lg font-semibold text-slate-900">Smart growth suggestions</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {props.suggestions.map((item) => (
          <article
            key={item.id}
            className={`rounded-xl border p-4 ${item.tone === 'warning' ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}
          >
            <p className="text-sm font-semibold text-slate-900">{item.title}</p>
            <p className="mt-1 text-sm text-slate-600">{item.description}</p>
            <Link to={item.ctaHref} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900">
              {item.ctaLabel}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

export function VendorDashboardSectionIcon(props: { type: 'kpi' | 'wallet' | 'coverage' | 'hidden' }) {
  if (props.type === 'wallet') return <Wallet className="h-4 w-4 text-blue-600" />;
  if (props.type === 'coverage') return <Building2 className="h-4 w-4 text-indigo-600" />;
  if (props.type === 'hidden') return <Lock className="h-4 w-4 text-amber-700" />;
  return <TrendingUp className="h-4 w-4 text-emerald-600" />;
}
