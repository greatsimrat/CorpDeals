import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  Building2,
  ChevronRight,
  CheckCircle2,
  CircleDollarSign,
  FileDown,
  LineChart as LineChartIcon,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

type SummaryMetrics = {
  leads_today: number;
  leads_month: number;
  active_offers: number;
  qualified_leads: number;
  leads_sent: number;
};

type CompanyBreakdownRow = {
  company_id: string;
  company_name: string;
  leads_30_days: number;
  total_leads: number;
  qualified_leads: number;
};

type OfferPerformanceRow = {
  offer_id: string;
  offer_title: string;
  company_id: string;
  company_name: string;
  leads_30_days: number;
  total_leads: number;
  status: 'Active' | 'Inactive';
};

type TrendPoint = {
  date: string;
  leads: number;
};

type VendorProfile = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  businessEmail?: string | null;
  phone?: string | null;
  website?: string | null;
  description?: string | null;
  notes?: string | null;
  status: string;
  offers: Array<{
    id: string;
    active: boolean;
    complianceStatus?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  }>;
  requests?: Array<{
    id: string;
    status: string;
    createdAt: string;
  }>;
};

type BillingSnapshot = {
  activePlan: any | null;
  invoices: any[];
};

const defaultSummary: SummaryMetrics = {
  leads_today: 0,
  leads_month: 0,
  active_offers: 0,
  qualified_leads: 0,
  leads_sent: 0,
};

const formatCurrency = (value: number, currency = 'CAD') =>
  new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
  }).format(value || 0);

const asNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const statusBadgeClass = (status: string) => {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'APPROVED') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (normalized === 'PENDING') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (normalized === 'REJECTED') return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

export default function VendorDashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<SummaryMetrics>(defaultSummary);
  const [companyBreakdown, setCompanyBreakdown] = useState<CompanyBreakdownRow[]>([]);
  const [offerPerformance, setOfferPerformance] = useState<OfferPerformanceRow[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [billing, setBilling] = useState<BillingSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      setError('');
      const [summaryData, companyData, offerData, trendData, profileData, billingData] = await Promise.all([
        api.getVendorDashboardSummary(),
        api.getVendorDashboardCompanyBreakdown(),
        api.getVendorDashboardOfferPerformance(),
        api.getVendorDashboardLeadTrend(14),
        api.getVendorProfile(),
        api.getVendorBilling(),
      ]);

      setSummary(summaryData);
      setCompanyBreakdown(companyData);
      setOfferPerformance(offerData);
      setTrend(trendData.series || []);
      setProfile(profileData as VendorProfile);
      setBilling(billingData as BillingSnapshot);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const csv = await api.exportVendorLeadsCsv();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const fileDate = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.setAttribute('download', `vendor-leads-${fileDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Failed to export leads CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const onboardingChecklist = useMemo(() => {
    const vendor = profile;
    const offers = profile?.offers || [];
    const hasProfileBasics = Boolean(vendor?.website && (vendor?.description || vendor?.notes));
    const hasOfferDraft = offers.length > 0;
    const hasSubmittedOffer = offers.some((offer) =>
      ['SUBMITTED', 'APPROVED', 'REJECTED'].includes(String(offer.complianceStatus || '').toUpperCase())
    );
    const hasLiveOffer = offers.some(
      (offer) => offer.active && String(offer.complianceStatus || '').toUpperCase() === 'APPROVED'
    );
    const hasBillingPlan = Boolean(billing?.activePlan);

    return [
      {
        title: 'Complete partner profile',
        body: 'Add website, contact details, and a clear company description so the review team can approve faster.',
        done: hasProfileBasics,
        href: '/vendor/dashboard',
      },
      {
        title: 'Create your first offer draft',
        body: 'Build the initial offer shell so your team can move into compliance review.',
        done: hasOfferDraft,
        href: '/vendor/offers/new',
      },
      {
        title: 'Submit an offer for review',
        body: 'Send at least one offer into the approval queue with terms and cancellation policy completed.',
        done: hasSubmittedOffer,
        href: '/vendor/offers',
      },
      {
        title: 'Get your first offer live',
        body: 'Once an offer is approved and activated, employee lead flow can begin.',
        done: hasLiveOffer,
        href: '/vendor/offers',
      },
      {
        title: 'Confirm billing setup',
        body: 'Check your current billing plan and invoice settings before scaling lead volume.',
        done: hasBillingPlan,
        href: '/vendor/billing',
      },
    ];
  }, [billing?.activePlan, profile]);

  const onboardingProgress = useMemo(() => {
    const completed = onboardingChecklist.filter((item) => item.done).length;
    const total = onboardingChecklist.length || 1;
    return {
      completed,
      total,
      percent: Math.round((completed / total) * 100),
    };
  }, [onboardingChecklist]);

  const insights = useMemo(() => {
    const tips: string[] = [];
    const totalLeadsAllTime = companyBreakdown.reduce((sum, row) => sum + row.total_leads, 0);
    const topCompany = companyBreakdown[0];

    if (topCompany && totalLeadsAllTime > 0 && topCompany.total_leads / totalLeadsAllTime > 0.5) {
      tips.push(
        `Most of your leads come from ${topCompany.company_name}. Consider creating another offer tailored to that audience.`
      );
    }

    const last7DaysLeads = trend.slice(-7).reduce((sum, row) => sum + row.leads, 0);
    if (last7DaysLeads === 0) {
      tips.push('No leads this week. Activate another approved offer or improve your offer positioning.');
    }

    if (summary.active_offers === 0) {
      tips.push('You have no live offers right now. Submit a draft or reactivate an approved offer.');
    }

    if (tips.length === 0) {
      tips.push('Lead flow is steady. Keep your top-performing offers active and monitor company-level demand.');
    }

    return tips.slice(0, 3);
  }, [companyBreakdown, summary.active_offers, trend]);

  if (isLoading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6">Loading dashboard...</div>;
  }

  const vendorStatus = String(profile?.status || user?.vendor?.status || '').toUpperCase();
  const planCurrency = billing?.activePlan?.currency || 'CAD';

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusBadgeClass(
                  vendorStatus
                )}`}
              >
                <BadgeCheck className="h-4 w-4" />
                {vendorStatus || 'Partner'}
              </div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
                {profile?.companyName || user?.vendor?.companyName || 'Vendor'} workspace
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Manage your onboarding, offers, leads, and billing from one place. This dashboard is designed to show
                the next best action first, then your operating metrics.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-900 px-4 py-3 text-white">
              <p className="text-xs uppercase tracking-wide text-slate-300">Onboarding progress</p>
              <p className="mt-1 text-2xl font-bold">{onboardingProgress.percent}%</p>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500 transition-all"
              style={{ width: `${onboardingProgress.percent}%` }}
            />
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Login email</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{user?.loginEmail || user?.email}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Business email</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{profile?.businessEmail || 'Not set'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Current plan</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {billing?.activePlan ? String(billing.activePlan.planType).replace('_', ' ') : 'Not configured'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-900">Partner checklist</h3>
          </div>
          <div className="mt-5 space-y-3">
            {onboardingChecklist.map((item) => (
              <Link
                key={item.title}
                to={item.href}
                className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <div
                  className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full ${
                    item.done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {item.done ? <CheckCircle2 className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{item.body}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Leads Today</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.leads_today}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Leads This Month</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.leads_month}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Active Offers</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.active_offers}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Qualified Leads</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.qualified_leads}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Leads Sent</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.leads_sent}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <LineChartIcon className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-900">Lead Trend (Last 14 Days)</h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="leads" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-600" />
            <h3 className="text-lg font-semibold text-slate-900">Operator insights</h3>
          </div>
          <div className="space-y-3">
            {insights.map((tip, index) => (
              <p key={`${index}-${tip}`} className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                {tip}
              </p>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2">
              <CircleDollarSign className="h-5 w-5 text-violet-600" />
              <p className="text-sm font-semibold text-slate-900">Billing snapshot</p>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              {billing?.activePlan
                ? `Current plan: ${String(billing.activePlan.planType).replace('_', ' ')}`
                : 'No billing plan is configured yet.'}
            </p>
            {billing?.activePlan ? (
              <p className="mt-2 text-sm text-slate-700">
                Monthly fee:{' '}
                <span className="font-semibold text-slate-900">
                  {formatCurrency(asNumber(billing.activePlan.monthlyFee), planCurrency)}
                </span>
              </p>
            ) : null}
            <Link to="/vendor/billing" className="mt-4 inline-flex text-sm font-semibold text-blue-700 hover:text-blue-900">
              Review billing
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-slate-900">Leads by Company</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Company Name</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Leads (30 days)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Total Leads</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Qualified Leads</th>
              </tr>
            </thead>
            <tbody>
              {companyBreakdown.map((row) => (
                <tr key={row.company_id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-sm text-slate-800">{row.company_name}</td>
                  <td className="px-4 py-3 text-right text-sm text-slate-700">{row.leads_30_days}</td>
                  <td className="px-4 py-3 text-right text-sm text-slate-700">{row.total_leads}</td>
                  <td className="px-4 py-3 text-right text-sm text-slate-700">{row.qualified_leads}</td>
                </tr>
              ))}
              {companyBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500">
                    No company lead data yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-violet-600" />
          <h3 className="text-lg font-semibold text-slate-900">Offer Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Offer Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Company</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Leads (30 days)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Total Leads</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {offerPerformance.map((row) => (
                <tr key={row.offer_id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-sm text-slate-800">{row.offer_title}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{row.company_name}</td>
                  <td className="px-4 py-3 text-right text-sm text-slate-700">{row.leads_30_days}</td>
                  <td className="px-4 py-3 text-right text-sm text-slate-700">{row.total_leads}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        row.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
              {offerPerformance.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                    No offer performance data yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/vendor/offers/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Create New Offer
          </Link>
          <Link
            to="/vendor/offers"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Manage Offers
          </Link>
          <Link
            to="/vendor/leads"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            View All Leads
          </Link>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <FileDown className="h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export Leads CSV'}
          </button>
        </div>
      </div>
    </div>
  );
}
