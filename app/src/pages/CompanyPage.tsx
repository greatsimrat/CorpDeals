import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Building2, Users, MapPin, CheckCircle, TrendingUp,
  Search, Star, ExternalLink
} from 'lucide-react';
import { getCompanyById } from '../data/companies';
import { getCategoryById } from '../data/categories';
import { getOffersByCompany, getFeaturedOffers } from '../data/offers';
import { useLeads } from '../context/LeadContext';

const CompanyPage = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { getLeadsByCompany } = useLeads();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const company = companyId ? getCompanyById(companyId) : undefined;
  const companyOffers = companyId ? getOffersByCompany(companyId) : [];
  const featuredOffers = companyId ? getFeaturedOffers(companyId) : [];
  const companyLeads = companyId ? getLeadsByCompany(companyId) : [];

  useEffect(() => {
    if (!company && companyId) {
      // Company not found, redirect to home
      navigate('/');
    }
    window.scrollTo(0, 0);
  }, [company, companyId, navigate]);

  if (!company) {
    return (
      <div className="min-h-screen bg-corp-light flex items-center justify-center">
        <div className="text-center">
          <h1 className="heading-2 text-corp-dark mb-4">Company Not Found</h1>
          <Link to="/" className="btn-primary">Go Home</Link>
        </div>
      </div>
    );
  }

  const filteredOffers = companyOffers.filter(offer => {
    const matchesSearch = offer.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         offer.vendorName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory ? offer.categoryId === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-corp-light">
      {/* Navigation */}
      <nav className="bg-white/95 backdrop-blur-lg shadow-sm sticky top-0 z-50">
        <div className="w-full px-6 lg:px-12">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 bg-corp-blue rounded-xl flex items-center justify-center">
                <span className="text-white font-montserrat font-bold text-lg">C</span>
              </div>
              <span className="font-montserrat font-bold text-xl text-corp-dark">CorpDeals</span>
            </Link>
            <Link to="/" className="flex items-center gap-2 text-corp-gray hover:text-corp-blue transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="font-inter text-sm">Back to Search</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Company Hero */}
      <section className="relative bg-gradient-to-br from-corp-dark to-gray-900 text-white py-16 lg:py-24">
        <div className="absolute inset-0 opacity-10">
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: `linear-gradient(135deg, ${company.color}20 0%, transparent 50%)`,
            }}
          />
        </div>
        <div className="relative w-full px-6 lg:px-12">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
              <div className="flex items-center gap-6">
                <div 
                  className="w-24 h-24 lg:w-32 lg:h-32 rounded-3xl flex items-center justify-center text-5xl lg:text-6xl font-bold shadow-2xl"
                  style={{ backgroundColor: company.color }}
                >
                  {company.logo}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="font-montserrat font-bold text-4xl lg:text-5xl">{company.name}</h1>
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  </div>
                  <p className="text-white/70 font-inter text-lg mb-4">{company.description}</p>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      {company.employeeCount} employees
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      {company.headquarters}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4" />
                      {company.domain}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-start lg:items-end gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-4">
                  <span className="text-white/60 font-inter text-sm">Total Deals Available</span>
                  <span className="block font-montserrat font-bold text-4xl">{company.totalDeals}</span>
                </div>
                <div className="flex items-center gap-2 text-green-400">
                  <TrendingUp className="w-5 h-5" />
                  <span className="font-inter text-sm">{companyLeads.length} employees claimed this week</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Deals */}
      {featuredOffers.length > 0 && (
        <section className="py-12 lg:py-16">
          <div className="w-full px-6 lg:px-12">
            <div className="max-w-6xl mx-auto">
              <h2 className="font-montserrat font-bold text-2xl text-corp-dark mb-8 flex items-center gap-2">
                <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
                Featured Deals
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredOffers.map((offer) => (
                  <Link
                    key={offer.id}
                    to={`/offer/${offer.id}`}
                    className="group bg-white rounded-2xl shadow-card overflow-hidden hover:shadow-card-hover transition-all duration-300"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={offer.image}
                        alt={offer.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-4 left-4 bg-corp-blue text-white px-3 py-1 rounded-full text-sm font-inter font-medium">
                        {offer.discountValue}
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-bold">
                          {offer.vendorLogo}
                        </div>
                        <span className="font-inter text-sm text-corp-gray">{offer.vendorName}</span>
                      </div>
                      <h3 className="font-montserrat font-bold text-lg text-corp-dark mb-2 line-clamp-2">
                        {offer.title}
                      </h3>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                          <span className="font-inter text-sm text-corp-gray">{offer.rating}</span>
                          <span className="font-inter text-sm text-corp-gray">({offer.reviews})</span>
                        </div>
                        <span className="text-corp-blue font-inter text-sm font-medium flex items-center gap-1">
                          View Deal <ExternalLink className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Browse by Category */}
      <section className="py-12 lg:py-16 bg-white">
        <div className="w-full px-6 lg:px-12">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-montserrat font-bold text-2xl text-corp-dark mb-8">
              Browse by Category
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {company.categories.map((categoryId) => {
                const category = getCategoryById(categoryId);
                if (!category) return null;
                const categoryOfferCount = companyOffers.filter(o => o.categoryId === categoryId).length;
                
                return (
                  <Link
                    key={categoryId}
                    to={`/company/${company.id}/category/${categoryId}`}
                    className="group bg-gray-50 rounded-2xl p-6 hover:bg-corp-highlight transition-all duration-300"
                  >
                    <div className={`w-12 h-12 ${category.bgColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <span className={category.color}>
                        {/* Icon would be rendered here */}
                      </span>
                    </div>
                    <h3 className="font-montserrat font-bold text-corp-dark mb-1">{category.name}</h3>
                    <span className="font-inter text-sm text-corp-gray">{categoryOfferCount} deals</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* All Deals with Search */}
      <section className="py-12 lg:py-16">
        <div className="w-full px-6 lg:px-12">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
              <h2 className="font-montserrat font-bold text-2xl text-corp-dark">
                All {company.name} Deals
              </h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-corp-gray" />
                  <input
                    type="text"
                    placeholder="Search deals..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 pr-4 py-3 bg-white rounded-xl border border-gray-200 font-inter outline-none focus:ring-2 focus:ring-corp-blue/30 w-full sm:w-64"
                  />
                </div>
                <select
                  value={selectedCategory || ''}
                  onChange={(e) => setSelectedCategory(e.target.value || null)}
                  className="px-4 py-3 bg-white rounded-xl border border-gray-200 font-inter outline-none focus:ring-2 focus:ring-corp-blue/30"
                >
                  <option value="">All Categories</option>
                  {company.categories.map((catId) => {
                    const cat = getCategoryById(catId);
                    return cat ? <option key={catId} value={catId}>{cat.name}</option> : null;
                  })}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOffers.map((offer) => (
                <Link
                  key={offer.id}
                  to={`/offer/${offer.id}`}
                  className="group bg-white rounded-2xl shadow-card overflow-hidden hover:shadow-card-hover transition-all duration-300"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={offer.image}
                      alt={offer.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-4 left-4 bg-corp-blue text-white px-3 py-1 rounded-full text-sm font-inter font-medium">
                      {offer.discountValue}
                    </div>
                    {offer.featured && (
                      <div className="absolute top-4 right-4 bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-inter font-medium flex items-center gap-1">
                        <Star className="w-3 h-3 fill-white" /> Featured
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-bold">
                        {offer.vendorLogo}
                      </div>
                      <span className="font-inter text-sm text-corp-gray">{offer.vendorName}</span>
                    </div>
                    <h3 className="font-montserrat font-bold text-lg text-corp-dark mb-2 line-clamp-2">
                      {offer.title}
                    </h3>
                    <p className="font-inter text-sm text-corp-gray mb-4 line-clamp-2">
                      {offer.description}
                    </p>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        <span className="font-inter text-sm text-corp-gray">{offer.rating}</span>
                      </div>
                      <span className="text-corp-blue font-inter text-sm font-medium flex items-center gap-1">
                        Claim Deal <ExternalLink className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {filteredOffers.length === 0 && (
              <div className="text-center py-16">
                <p className="font-inter text-corp-gray text-lg">No deals found matching your search.</p>
                <button 
                  onClick={() => { setSearchQuery(''); setSelectedCategory(null); }}
                  className="btn-primary mt-4"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-corp-dark text-white py-12">
        <div className="w-full px-6 lg:px-12">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-corp-blue rounded-xl flex items-center justify-center">
                <span className="font-montserrat font-bold">C</span>
              </div>
              <span className="font-montserrat font-bold text-xl">CorpDeals</span>
            </div>
            <p className="font-inter text-white/60 text-sm">
              © 2026 CorpDeals. Exclusive perks for verified employees.
            </p>
            <Link to="/vendor-portal" className="text-corp-blue font-inter text-sm hover:underline">
              Vendor Portal →
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CompanyPage;
