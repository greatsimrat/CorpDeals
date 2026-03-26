import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Building2,
  Percent,
  FileCheck,
  TrendingUp,
  Calendar,
  CalendarDays,
  CalendarRange,
  Clock,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Wallet,
} from 'lucide-react';
import api from '../../services/api';

interface Stats {
  users: number;
  vendors: {
    total: number;
    pending: number;
    approved: number;
  };
  companies: number;
  offers: {
    total: number;
    active: number;
  };
  leads: number;
  leadSubmissions: {
    today: number;
    thisMonth: number;
    thisYear: number;
    daily: Array<{ bucket: string; count: number }>;
    monthly: Array<{ bucket: string; count: number }>;
    yearly: Array<{ bucket: string; count: number }>;
  };
  pendingRequests: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [invoiceData, setInvoiceData] = useState<{ month: string; totals: { count: number; amountCents: number }; invoices: any[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const [statsData, requestsData, invoicesData] = await Promise.all([
        api.getAdminStats(),
        api.getVendorRequests({ status: 'PENDING' }),
        api.getFinanceInvoices({ month: monthKey }),
      ]);
      setStats(statsData);
      setPendingRequests(requestsData.slice(0, 5));
      setInvoiceData(invoicesData);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    );
  }

  const formatCurrency = (amountCents: number, currency = 'USD') => {
    const value = (amountCents || 0) / 100;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  };

  const formatDayBucket = (bucket: string) => {
    const [year, month, day] = bucket.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatMonthBucket = (bucket: string) => {
    const [year, month] = bucket.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  };

  const dailyLeads = stats?.leadSubmissions?.daily || [];
  const monthlyLeads = stats?.leadSubmissions?.monthly || [];
  const yearlyLeads = stats?.leadSubmissions?.yearly || [];

  const maxDailyCount = Math.max(1, ...dailyLeads.map((item) => item.count));
  const maxMonthlyCount = Math.max(1, ...monthlyLeads.map((item) => item.count));
  const maxYearlyCount = Math.max(1, ...yearlyLeads.map((item) => item.count));

  const statCards = [
    {
      label: 'Total Users',
      value: stats?.users || 0,
      icon: Users,
      color: 'blue',
      link: '/admin/users',
    },
    {
      label: 'Vendors',
      value: stats?.vendors.total || 0,
      subtext: `${stats?.vendors.pending || 0} pending`,
      icon: Building2,
      color: 'purple',
      link: '/admin/vendors',
    },
    {
      label: 'Companies',
      value: stats?.companies || 0,
      icon: Building2,
      color: 'emerald',
      link: '/admin/companies',
    },
    {
      label: 'Active Offers',
      value: stats?.offers.active || 0,
      subtext: `${stats?.offers.total || 0} total`,
      icon: Percent,
      color: 'amber',
      link: '/admin/offers',
    },
    {
      label: 'Total Leads',
      value: stats?.leads || 0,
      icon: TrendingUp,
      color: 'rose',
      link: '/admin/leads',
    },
    {
      label: 'Invoices (This Month)',
      value: invoiceData?.totals.count || 0,
      subtext: invoiceData ? `Total ${formatCurrency(invoiceData.totals.amountCents)}` : undefined,
      icon: Wallet,
      color: 'emerald',
      link: '/finance',
    },
    {
      label: 'Pending Requests',
      value: stats?.pendingRequests || 0,
      icon: FileCheck,
      color: 'orange',
      link: '/admin/vendor-requests',
    },
  ];

  const colorClasses: Record<string, { bg: string; text: string; iconBg: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', iconBg: 'bg-blue-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', iconBg: 'bg-purple-100' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', iconBg: 'bg-emerald-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', iconBg: 'bg-amber-100' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600', iconBg: 'bg-rose-100' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', iconBg: 'bg-orange-100' },
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">Overview of your CorpDeals platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const colors = colorClasses[stat.color];
          return (
            <Link
              key={stat.label}
              to={stat.link}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
                  {stat.subtext && (
                    <p className="text-sm text-slate-500 mt-1">{stat.subtext}</p>
                  )}
                </div>
                <div className={`p-3 rounded-lg ${colors.iconBg}`}>
                  <Icon className={`w-5 h-5 ${colors.text}`} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-5 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Lead Submissions</h2>
          <p className="text-sm text-slate-500 mt-1">Daily, monthly, and yearly lead submission counts</p>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-200">
          <div className="rounded-lg bg-blue-50 border border-blue-100 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-blue-700">Today</p>
              <CalendarDays className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-900 mt-2">{stats?.leadSubmissions?.today || 0}</p>
          </div>

          <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-emerald-700">This Month</p>
              <CalendarRange className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-900 mt-2">{stats?.leadSubmissions?.thisMonth || 0}</p>
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-100 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-amber-700">This Year</p>
              <Calendar className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-amber-900 mt-2">{stats?.leadSubmissions?.thisYear || 0}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 divide-y xl:divide-y-0 xl:divide-x divide-slate-200">
          <div className="p-5">
            <h3 className="text-sm font-semibold text-slate-900">By Day (last 7 of 30)</h3>
            <div className="mt-3 space-y-3">
              {dailyLeads.length === 0 ? (
                <p className="text-sm text-slate-500">No daily lead data yet.</p>
              ) : (
                dailyLeads.slice(-7).map((item) => (
                  <div key={item.bucket}>
                    <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                      <span>{formatDayBucket(item.bucket)}</span>
                      <span className="font-semibold text-slate-800">{item.count}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${(item.count / maxDailyCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-5">
            <h3 className="text-sm font-semibold text-slate-900">By Month (last 6 of 12)</h3>
            <div className="mt-3 space-y-3">
              {monthlyLeads.length === 0 ? (
                <p className="text-sm text-slate-500">No monthly lead data yet.</p>
              ) : (
                monthlyLeads.slice(-6).map((item) => (
                  <div key={item.bucket}>
                    <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                      <span>{formatMonthBucket(item.bucket)}</span>
                      <span className="font-semibold text-slate-800">{item.count}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${(item.count / maxMonthlyCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-5">
            <h3 className="text-sm font-semibold text-slate-900">By Year</h3>
            <div className="mt-3 space-y-3">
              {yearlyLeads.length === 0 ? (
                <p className="text-sm text-slate-500">No yearly lead data yet.</p>
              ) : (
                yearlyLeads.map((item) => (
                  <div key={item.bucket}>
                    <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                      <span>{item.bucket}</span>
                      <span className="font-semibold text-slate-800">{item.count}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500"
                        style={{ width: `${(item.count / maxYearlyCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pending Vendor Requests */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Pending Vendor Requests</h2>
              <p className="text-sm text-slate-500">Review and approve vendor applications</p>
            </div>
          </div>
          <Link
            to="/admin/vendor-requests"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            View All
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-slate-600">No pending requests</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {pendingRequests.map((request) => (
              <div key={request.id} className="p-4 hover:bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                      <span className="text-slate-600 font-medium">
                        {request.vendor?.companyName?.charAt(0) || 'V'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {request.vendor?.companyName || 'Unknown'}
                      </p>
                      <p className="text-sm text-slate-500">
                        {request.vendor?.email} • {request.businessType || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/admin/vendor-requests?id=${request.id}`}
                    className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Review
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invoices */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Wallet className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Invoices (This Month)</h2>
              <p className="text-sm text-slate-500">
                {invoiceData
                  ? `${invoiceData.totals.count} invoices • ${formatCurrency(invoiceData.totals.amountCents)} total`
                  : 'No invoice data'}
              </p>
            </div>
          </div>
        </div>

        {!invoiceData || invoiceData.invoices.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No invoices for this month</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {invoiceData.invoices.slice(0, 5).map((invoice: any) => (
              <div key={invoice.invoiceId} className="p-4 hover:bg-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{invoice.companyName}</p>
                    <p className="text-sm text-slate-500">{invoice.invoiceId}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">
                      {formatCurrency(invoice.totalCents, invoice.currency)}
                    </p>
                    <p className="text-xs text-slate-500">{invoice.status}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/admin/vendors"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:shadow-md transition-shadow"
        >
          <div className="p-2 bg-purple-100 rounded-lg">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900">Add Vendor</p>
            <p className="text-sm text-slate-500">Create new vendor</p>
          </div>
        </Link>

        <Link
          to="/admin/companies"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:shadow-md transition-shadow"
        >
          <div className="p-2 bg-emerald-100 rounded-lg">
            <Building2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900">Add Company</p>
            <p className="text-sm text-slate-500">Register company</p>
          </div>
        </Link>

        <Link
          to="/admin/offers"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:shadow-md transition-shadow"
        >
          <div className="p-2 bg-amber-100 rounded-lg">
            <Percent className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900">Manage Offers</p>
            <p className="text-sm text-slate-500">View all offers</p>
          </div>
        </Link>

        <Link
          to="/admin/vendor-requests"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:shadow-md transition-shadow"
        >
          <div className="p-2 bg-orange-100 rounded-lg">
            <FileCheck className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900">Review Requests</p>
            <p className="text-sm text-slate-500">{stats?.pendingRequests || 0} pending</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
