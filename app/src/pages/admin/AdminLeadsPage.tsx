import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Search, Filter, ChevronDown, Mail, Phone, Building2, Tag, User, Clock } from 'lucide-react';
import api from '../../services/api';

interface LeadRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  employeeId?: string;
  status: string;
  createdAt: string;
  offer: {
    id: string;
    title: string;
    vendor: {
      companyName: string;
    };
  };
  company: {
    id: string;
    name: string;
  };
}

const STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  CONVERTED: 'Converted',
  CLOSED: 'Closed',
};

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      setIsLoading(true);
      setError('');
      // Admin endpoint; returns all leads with offer + company attached
      const data = await api.getLeads({});
      setLeads(data as LeadRow[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load leads');
    } finally {
      setIsLoading(false);
    }
  };

  const uniqueCompanies = Array.from(
    new Map(
      leads.map((l) => [l.company.id, { id: l.company.id, name: l.company.name }])
    ).values()
  );

  const uniqueVendors = Array.from(
    new Map(
      leads.map((l) => [l.offer.vendor.companyName, { name: l.offer.vendor.companyName }])
    ).values()
  );

  const filteredLeads = leads.filter((lead) => {
    const matchesStatus =
      statusFilter === 'all' || lead.status === statusFilter;
    const matchesCompany =
      companyFilter === 'all' || lead.company.id === companyFilter;
    const matchesVendor =
      vendorFilter === 'all' || lead.offer.vendor.companyName === vendorFilter;
    const term = search.toLowerCase();
    const matchesSearch =
      !term ||
      lead.firstName.toLowerCase().includes(term) ||
      lead.lastName.toLowerCase().includes(term) ||
      lead.email.toLowerCase().includes(term) ||
      lead.offer.title.toLowerCase().includes(term) ||
      lead.company.name.toLowerCase().includes(term) ||
      lead.offer.vendor.companyName.toLowerCase().includes(term);
    return matchesStatus && matchesCompany && matchesVendor && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
          <p className="text-slate-600 mt-1">
            View all employee requests generated from offers. Use this to
            reconcile billing with vendors.
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">
            Total leads: <span className="font-semibold text-slate-900">{leads.length}</span>
          </p>
          <p className="text-xs text-slate-400">
            Showing{' '}
            <span className="font-medium text-slate-700">
              {filteredLeads.length}
            </span>{' '}
            matching current filters
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by employee, company, or offer..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="pl-9 pr-8 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none bg-white"
              >
                <option value="all">All Companies</option>
                {uniqueCompanies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-4 pr-8 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="NEW">New</option>
                <option value="CONTACTED">Contacted</option>
                <option value="QUALIFIED">Qualified</option>
                <option value="CONVERTED">Converted</option>
                <option value="CLOSED">Closed</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={vendorFilter}
                onChange={(e) => setVendorFilter(e.target.value)}
                className="pl-4 pr-8 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none bg-white"
              >
                <option value="all">All Vendors</option>
                {uniqueVendors.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center text-slate-500">
          Loading leads...
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          {error}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Company / Offer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-10 text-center text-slate-500"
                    >
                      No leads found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 align-top">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-medium text-slate-700">
                            {lead.firstName.charAt(0)}
                            {lead.lastName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1 text-sm font-medium text-slate-900">
                              <User className="w-4 h-4 text-slate-400" />
                              <span>
                                {lead.firstName} {lead.lastName}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span className="inline-flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {lead.email}
                              </span>
                              {lead.phone && (
                                <span className="inline-flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {lead.phone}
                                </span>
                              )}
                              {lead.employeeId && (
                                <span className="inline-flex items-center gap-1">
                                  <Tag className="w-3 h-3" />
                                  ID: {lead.employeeId}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 align-top">
                        <div className="text-sm text-slate-900 font-medium flex items-center gap-1">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          <span>{lead.company.name}</span>
                        </div>
                        <div className="mt-1 text-xs text-slate-600 line-clamp-2">
                          {lead.offer.title}
                        </div>
                      </td>

                      <td className="px-6 py-4 align-top">
                        <div className="text-sm text-slate-700">
                          {lead.offer.vendor.companyName}
                        </div>
                      </td>

                      <td className="px-6 py-4 align-top">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            lead.status === 'NEW'
                              ? 'bg-blue-50 text-blue-700'
                              : lead.status === 'CONVERTED'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-slate-50 text-slate-700'
                          }`}
                        >
                          {STATUS_LABELS[lead.status] || lead.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 align-top text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span>
                            {format(new Date(lead.createdAt), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

