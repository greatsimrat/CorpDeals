import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Building2,
  Users,
  Loader2,
  X,
  CheckCircle2,
  Mail,
  Phone,
  UserCircle,
} from 'lucide-react';
import api from '../../services/api';

interface HRContact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  title: string | null;
  isPrimary: boolean;
}

interface Company {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  logo: string | null;
  employeeCount: string | null;
  headquarters: string | null;
  description: string | null;
  verified: boolean;
  brandColor: string | null;
  _count?: { offers: number; hrContacts: number };
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHRModal, setShowHRModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [hrContacts, setHRContacts] = useState<HRContact[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [companyForm, setCompanyForm] = useState({
    name: '',
    slug: '',
    domain: '',
    employeeCount: '',
    headquarters: '',
    description: '',
    verified: false,
    brandColor: '#3B82F6',
  });

  const [hrForm, setHRForm] = useState({
    name: '',
    email: '',
    phone: '',
    title: '',
    isPrimary: false,
  });

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      setIsLoading(true);
      const data = await api.getCompanies();
      setCompanies(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load companies');
    } finally {
      setIsLoading(false);
    }
  };

  const loadHRContacts = async (companyId: string) => {
    try {
      const data = await api.getCompanyHRContacts(companyId);
      setHRContacts(data);
    } catch (err: any) {
      console.error('Failed to load HR contacts:', err);
    }
  };

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await api.createCompany(companyForm);
      await loadCompanies();
      setShowAddModal(false);
      setCompanyForm({
        name: '',
        slug: '',
        domain: '',
        employeeCount: '',
        headquarters: '',
        description: '',
        verified: false,
        brandColor: '#3B82F6',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create company');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddHRContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;

    setIsSubmitting(true);
    try {
      await api.createHRContact({
        companyId: selectedCompany.id,
        ...hrForm,
      });
      await loadHRContacts(selectedCompany.id);
      setHRForm({ name: '', email: '', phone: '', title: '', isPrimary: false });
    } catch (err: any) {
      setError(err.message || 'Failed to add HR contact');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteHRContact = async (contactId: string) => {
    if (!confirm('Delete this HR contact?')) return;
    
    try {
      await api.deleteHRContact(contactId);
      if (selectedCompany) {
        await loadHRContacts(selectedCompany.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete HR contact');
    }
  };

  const openHRModal = async (company: Company) => {
    setSelectedCompany(company);
    await loadHRContacts(company.id);
    setShowHRModal(true);
  };

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.domain && c.domain.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Companies</h1>
          <p className="text-slate-600 mt-1">Manage employee companies and HR contacts</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Add Company
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search companies..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCompanies.map((company) => (
          <div key={company.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: company.brandColor || '#3B82F6' }}
                >
                  {company.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{company.name}</h3>
                  {company.domain && (
                    <p className="text-sm text-slate-500">{company.domain}</p>
                  )}
                </div>
              </div>
              {company.verified && (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              )}
            </div>

            <div className="space-y-2 mb-4">
              {company.employeeCount && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Users className="w-4 h-4" />
                  {company.employeeCount} employees
                </div>
              )}
              {company.headquarters && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Building2 className="w-4 h-4" />
                  {company.headquarters}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <div className="text-sm text-slate-500">
                {company._count?.offers || 0} offers • {company._count?.hrContacts || 0} HR contacts
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openHRModal(company)}
                  className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Manage HR Contacts"
                >
                  <UserCircle className="w-4 h-4" />
                </button>
                <button className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Company Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Add New Company</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleCompanySubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label>
                  <input
                    type="text"
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm(f => ({ ...f, name: e.target.value }))}
                    required
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Slug</label>
                  <input
                    type="text"
                    value={companyForm.slug}
                    onChange={(e) => setCompanyForm(f => ({ ...f, slug: e.target.value }))}
                    placeholder="auto-generated"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Domain</label>
                  <input
                    type="text"
                    value={companyForm.domain}
                    onChange={(e) => setCompanyForm(f => ({ ...f, domain: e.target.value }))}
                    placeholder="company.com"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Employee Count</label>
                  <input
                    type="text"
                    value={companyForm.employeeCount}
                    onChange={(e) => setCompanyForm(f => ({ ...f, employeeCount: e.target.value }))}
                    placeholder="e.g., 10K+"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Headquarters</label>
                  <input
                    type="text"
                    value={companyForm.headquarters}
                    onChange={(e) => setCompanyForm(f => ({ ...f, headquarters: e.target.value }))}
                    placeholder="City, State"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Brand Color</label>
                  <input
                    type="color"
                    value={companyForm.brandColor}
                    onChange={(e) => setCompanyForm(f => ({ ...f, brandColor: e.target.value }))}
                    className="w-full h-10 border border-slate-300 rounded-lg cursor-pointer"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea
                    value={companyForm.description}
                    onChange={(e) => setCompanyForm(f => ({ ...f, description: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={companyForm.verified}
                      onChange={(e) => setCompanyForm(f => ({ ...f, verified: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-slate-700">Verified Company</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  Create Company
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HR Contacts Modal */}
      {showHRModal && selectedCompany && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900">HR Contacts</h2>
                <p className="text-sm text-slate-500">{selectedCompany.name}</p>
              </div>
              <button onClick={() => setShowHRModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Existing Contacts */}
              {hrContacts.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase">Current Contacts</h3>
                  {hrContacts.map((contact) => (
                    <div key={contact.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                          <UserCircle className="w-5 h-5 text-slate-500" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            {contact.name}
                            {contact.isPrimary && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Primary</span>
                            )}
                          </p>
                          <p className="text-sm text-slate-500">{contact.title || 'HR Contact'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <a href={`mailto:${contact.email}`} className="text-slate-500 hover:text-blue-600">
                          <Mail className="w-4 h-4" />
                        </a>
                        {contact.phone && (
                          <a href={`tel:${contact.phone}`} className="text-slate-500 hover:text-blue-600">
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => handleDeleteHRContact(contact.id)}
                          className="text-slate-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Contact Form */}
              <form onSubmit={handleAddHRContact} className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-500 uppercase">Add New Contact</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                    <input
                      type="text"
                      value={hrForm.name}
                      onChange={(e) => setHRForm(f => ({ ...f, name: e.target.value }))}
                      required
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={hrForm.title}
                      onChange={(e) => setHRForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="HR Manager"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={hrForm.email}
                      onChange={(e) => setHRForm(f => ({ ...f, email: e.target.value }))}
                      required
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={hrForm.phone}
                      onChange={(e) => setHRForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={hrForm.isPrimary}
                        onChange={(e) => setHRForm(f => ({ ...f, isPrimary: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-slate-700">Set as primary contact</span>
                    </label>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  Add Contact
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
