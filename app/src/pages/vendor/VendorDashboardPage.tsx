import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, FileDown, LineChart as LineChartIcon, Target, Users } from 'lucide-react';
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

const defaultSummary: SummaryMetrics = {
  leads_today: 0,
  leads_month: 0,
  active_offers: 0,
  qualified_leads: 0,
  leads_sent: 0,
};

export default function VendorDashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<SummaryMetrics>(defaultSummary);
  const [companyBreakdown, setCompanyBreakdown] = useState<CompanyBreakdownRow[]>([]);
  const [offerPerformance, setOfferPerformance] = useState<OfferPerformanceRow[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      setError('');
      const [summaryData, companyData, offerData, trendData] = await Promise.all([
        api.getVendorDashboardSummary(),
        api.getVendorDashboardCompanyBreakdown(),
        api.getVendorDashboardOfferPerformance(),
        api.getVendorDashboardLeadTrend(14),
      ]);

      setSummary(summaryData);
      setCompanyBreakdown(companyData);
      setOfferPerformance(offerData);
      setTrend(trendData.series || []);
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

  const insights = useMemo(() => {
    const tips: string[] = [];
    const totalLeadsAllTime = companyBreakdown.reduce((sum, row) => sum + row.total_leads, 0);
    const topCompany = companyBreakdown[0];

    if (topCompany && totalLeadsAllTime > 0 && topCompany.total_leads / totalLeadsAllTime > 0.5) {
      tips.push(
        `Most of your leads come from ${topCompany.company_name}. Consider creating another ${topCompany.company_name}-specific offer.`
      );
    }

    const last7DaysLeads = trend.slice(-7).reduce((sum, row) => sum + row.leads, 0);
    if (last7DaysLeads === 0) {
      tips.push('No leads this week. Try activating more offers or improving descriptions.');
    }

    if (summary.active_offers === 0) {
      tips.push('You have no active offers. Activate or submit an offer to increase lead flow.');
    }

    if (tips.length === 0) {
      tips.push('Lead flow is steady. Keep your top offers active and monitor company-level trends.');
    }

    return tips.slice(0, 3);
  }, [companyBreakdown, summary.active_offers, trend]);

  if (isLoading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-2xl font-semibold text-slate-900">
          {user?.vendor?.companyName || 'Vendor'} Dashboard
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Track lead volume, offer performance, and simple conversion insights.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
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
          <p className="text-sm text-slate-500">Leads Sent to Vendor</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.leads_sent}</p>
        </div>
      </div>

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
          <h3 className="text-lg font-semibold text-slate-900">Insights</h3>
        </div>
        <div className="space-y-2">
          {insights.map((tip, index) => (
            <p key={`${index}-${tip}`} className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
              {tip}
            </p>
          ))}
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
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Company Name
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                  Leads (last 30 days)
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                  Total Leads
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                  Qualified Leads
                </th>
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
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Offer Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Company
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                  Leads (30 days)
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                  Total Leads
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Status
                </th>
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
                        row.status === 'Active'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-slate-100 text-slate-700'
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

