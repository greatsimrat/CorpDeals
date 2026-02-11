import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  LayoutDashboard, Users, TrendingUp, DollarSign, Star, 
  Plus, Search, Phone, Mail, CheckCircle, Clock, BarChart3, Settings,
  LogOut, Building2
} from 'lucide-react';
import { offers } from '../data/offers';
import { useLeads, type Lead } from '../context/LeadContext';

const VendorPortal = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'leads' | 'offers' | 'analytics'>('dashboard');
  const [leadFilter, setLeadFilter] = useState<string>('all');
  const { leads, getLeadStats, updateLeadStatus } = useLeads();

  const stats = getLeadStats();

  // Mock vendor data
  const vendorOffers = offers.slice(0, 4);
  const vendorLeads = leads;

  const filteredLeads = leadFilter === 'all' 
    ? vendorLeads 
    : vendorLeads.filter(lead => lead.status === leadFilter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-700';
      case 'contacted': return 'bg-amber-100 text-amber-700';
      case 'qualified': return 'bg-purple-100 text-purple-700';
      case 'converted': return 'bg-green-100 text-green-700';
      case 'closed': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="w-full px-6 lg:px-12">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-9 h-9 bg-corp-blue rounded-xl flex items-center justify-center">
                  <span className="text-white font-montserrat font-bold text-lg">C</span>
                </div>
                <span className="font-montserrat font-bold text-xl text-corp-dark hidden sm:block">CorpDeals</span>
              </Link>
              <div className="h-6 w-px bg-gray-200 mx-2" />
              <span className="font-inter text-corp-gray">Vendor Portal</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-corp-highlight rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-corp-blue" />
                </div>
                <div className="hidden sm:block">
                  <p className="font-inter font-medium text-corp-dark text-sm">Coast Capital Savings</p>
                  <p className="font-inter text-xs text-corp-gray">Verified Partner</p>
                </div>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Settings className="w-5 h-5 text-corp-gray" />
              </button>
              <Link to="/" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <LogOut className="w-5 h-5 text-corp-gray" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white min-h-screen shadow-sm hidden lg:block">
          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-inter transition-colors ${
                activeTab === 'dashboard' ? 'bg-corp-blue text-white' : 'text-corp-gray hover:bg-gray-50'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('leads')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-inter transition-colors ${
                activeTab === 'leads' ? 'bg-corp-blue text-white' : 'text-corp-gray hover:bg-gray-50'
              }`}
            >
              <Users className="w-5 h-5" />
              Leads
              {stats.new > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {stats.new}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('offers')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-inter transition-colors ${
                activeTab === 'offers' ? 'bg-corp-blue text-white' : 'text-corp-gray hover:bg-gray-50'
              }`}
            >
              <Star className="w-5 h-5" />
              My Offers
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-inter transition-colors ${
                activeTab === 'analytics' ? 'bg-corp-blue text-white' : 'text-corp-gray hover:bg-gray-50'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              Analytics
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div>
                <h1 className="font-montserrat font-bold text-2xl text-corp-dark mb-2">Dashboard</h1>
                <p className="font-inter text-corp-gray">Welcome back! Here's your performance overview.</p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <span className="text-green-500 font-inter text-sm flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" /> +12%
                    </span>
                  </div>
                  <span className="font-inter text-corp-gray text-sm">Total Leads</span>
                  <span className="block font-montserrat font-bold text-3xl text-corp-dark">{stats.total}</span>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <span className="text-green-500 font-inter text-sm flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" /> +8%
                    </span>
                  </div>
                  <span className="font-inter text-corp-gray text-sm">Converted</span>
                  <span className="block font-montserrat font-bold text-3xl text-corp-dark">{stats.converted}</span>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                      <Clock className="w-6 h-6 text-amber-600" />
                    </div>
                  </div>
                  <span className="font-inter text-corp-gray text-sm">Pending</span>
                  <span className="block font-montserrat font-bold text-3xl text-corp-dark">{stats.new}</span>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-purple-600" />
                    </div>
                    <span className="text-green-500 font-inter text-sm flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" /> +23%
                    </span>
                  </div>
                  <span className="font-inter text-corp-gray text-sm">Est. Revenue</span>
                  <span className="block font-montserrat font-bold text-3xl text-corp-dark">$48.2K</span>
                </div>
              </div>

              {/* Recent Leads */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-montserrat font-bold text-lg text-corp-dark">Recent Leads</h2>
                  <button 
                    onClick={() => setActiveTab('leads')}
                    className="text-corp-blue font-inter text-sm hover:underline"
                  >
                    View All
                  </button>
                </div>
                <div className="divide-y divide-gray-100">
                  {vendorLeads.slice(0, 5).map((lead) => (
                    <div key={lead.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-corp-highlight rounded-xl flex items-center justify-center">
                          <span className="font-montserrat font-bold text-corp-blue">
                            {lead.firstName[0]}{lead.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-inter font-medium text-corp-dark">{lead.firstName} {lead.lastName}</p>
                          <p className="font-inter text-sm text-corp-gray">{lead.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                          {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                        </span>
                        <span className="font-inter text-sm text-corp-gray">
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Offers */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-montserrat font-bold text-lg text-corp-dark">Active Offers</h2>
                  <button className="btn-primary flex items-center gap-2 text-sm">
                    <Plus className="w-4 h-4" />
                    Create Offer
                  </button>
                </div>
                <div className="divide-y divide-gray-100">
                  {vendorOffers.map((offer) => (
                    <div key={offer.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <img src={offer.image} alt={offer.title} className="w-16 h-16 rounded-xl object-cover" />
                        <div>
                          <p className="font-inter font-medium text-corp-dark line-clamp-1">{offer.title}</p>
                          <p className="font-inter text-sm text-corp-gray">{offer.discountValue}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="font-inter font-medium text-corp-dark">{offer.leads}</p>
                          <p className="font-inter text-xs text-corp-gray">Leads</p>
                        </div>
                        <div className="text-right">
                          <p className="font-inter font-medium text-corp-dark">{offer.rating}</p>
                          <p className="font-inter text-xs text-corp-gray">Rating</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'leads' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="font-montserrat font-bold text-2xl text-corp-dark mb-2">Leads</h1>
                  <p className="font-inter text-corp-gray">Manage and track your employee leads.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-corp-gray" />
                    <input
                      type="text"
                      placeholder="Search leads..."
                      className="pl-10 pr-4 py-2 bg-white rounded-xl border border-gray-200 font-inter outline-none focus:ring-2 focus:ring-corp-blue/30"
                    />
                  </div>
                  <select
                    value={leadFilter}
                    onChange={(e) => setLeadFilter(e.target.value)}
                    className="px-4 py-2 bg-white rounded-xl border border-gray-200 font-inter outline-none focus:ring-2 focus:ring-corp-blue/30"
                  >
                    <option value="all">All Status</option>
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="converted">Converted</option>
                  </select>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left font-inter font-medium text-corp-gray text-sm">Lead</th>
                        <th className="px-6 py-4 text-left font-inter font-medium text-corp-gray text-sm">Company</th>
                        <th className="px-6 py-4 text-left font-inter font-medium text-corp-gray text-sm">Status</th>
                        <th className="px-6 py-4 text-left font-inter font-medium text-corp-gray text-sm">Date</th>
                        <th className="px-6 py-4 text-left font-inter font-medium text-corp-gray text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredLeads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-corp-highlight rounded-xl flex items-center justify-center">
                                <span className="font-montserrat font-bold text-corp-blue text-sm">
                                  {lead.firstName[0]}{lead.lastName[0]}
                                </span>
                              </div>
                              <div>
                                <p className="font-inter font-medium text-corp-dark">{lead.firstName} {lead.lastName}</p>
                                <p className="font-inter text-sm text-corp-gray">{lead.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-inter text-corp-dark capitalize">{lead.companyId}</span>
                          </td>
                          <td className="px-6 py-4">
                            <select
                              value={lead.status}
                              onChange={(e) => updateLeadStatus(lead.id, e.target.value as Lead['status'])}
                              className={`px-3 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${getStatusColor(lead.status)}`}
                            >
                              <option value="new">New</option>
                              <option value="contacted">Contacted</option>
                              <option value="qualified">Qualified</option>
                              <option value="converted">Converted</option>
                              <option value="closed">Closed</option>
                            </select>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-inter text-corp-gray text-sm">
                              {new Date(lead.createdAt).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <a href={`mailto:${lead.email}`} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <Mail className="w-4 h-4 text-corp-gray" />
                              </a>
                              {lead.phone && (
                                <a href={`tel:${lead.phone}`} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                  <Phone className="w-4 h-4 text-corp-gray" />
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'offers' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="font-montserrat font-bold text-2xl text-corp-dark mb-2">My Offers</h1>
                  <p className="font-inter text-corp-gray">Manage your employee discount offers.</p>
                </div>
                <button className="btn-primary flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Create New Offer
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {vendorOffers.map((offer) => (
                  <div key={offer.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="relative h-48">
                      <img src={offer.image} alt={offer.title} className="w-full h-full object-cover" />
                      <div className="absolute top-4 left-4 bg-corp-blue text-white px-3 py-1 rounded-full text-sm font-medium">
                        {offer.discountValue}
                      </div>
                      {offer.featured && (
                        <div className="absolute top-4 right-4 bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                          Featured
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className="font-montserrat font-bold text-lg text-corp-dark mb-2">{offer.title}</h3>
                      <div className="flex items-center gap-4 mb-4">
                        <span className="flex items-center gap-1 text-sm text-corp-gray">
                          <Users className="w-4 h-4" /> {offer.leads} leads
                        </span>
                        <span className="flex items-center gap-1 text-sm text-corp-gray">
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> {offer.rating}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button className="flex-1 btn-secondary py-2 text-sm">Edit</button>
                        <button className="flex-1 btn-primary py-2 text-sm">View Details</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-montserrat font-bold text-2xl text-corp-dark mb-2">Analytics</h1>
                <p className="font-inter text-corp-gray">Track your performance and ROI.</p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                <BarChart3 className="w-16 h-16 text-corp-gray mx-auto mb-4" />
                <h3 className="font-montserrat font-bold text-xl text-corp-dark mb-2">Coming Soon</h3>
                <p className="font-inter text-corp-gray max-w-md mx-auto">
                  Detailed analytics dashboard with conversion tracking, revenue attribution, 
                  and employee engagement metrics is under development.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default VendorPortal;
