import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Building2,
  Percent,
  FileCheck,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowRight,
  Loader2,
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
  pendingRequests: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [statsData, requestsData] = await Promise.all([
        api.getAdminStats(),
        api.getVendorRequests({ status: 'PENDING' }),
      ]);
      setStats(statsData);
      setPendingRequests(requestsData.slice(0, 5));
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
      link: '/admin/offers',
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
