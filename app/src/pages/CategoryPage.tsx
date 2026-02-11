import { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Star } from 'lucide-react';
import { getCompanyById } from '../data/companies';
import { getCategoryById } from '../data/categories';
import { getOffersByCompanyAndCategory } from '../data/offers';
// import { useLeads } from '../context/LeadContext';

const CategoryPage = () => {
  const { companyId, categoryId } = useParams<{ companyId: string; categoryId: string }>();
  const navigate = useNavigate();

  const company = companyId ? getCompanyById(companyId) : undefined;
  const category = categoryId ? getCategoryById(categoryId) : undefined;
  const offers = companyId && categoryId 
    ? getOffersByCompanyAndCategory(companyId, categoryId) 
    : [];

  useEffect(() => {
    if (!company || !category) {
      navigate('/');
    }
    window.scrollTo(0, 0);
  }, [company, category, navigate]);

  if (!company || !category) {
    return (
      <div className="min-h-screen bg-corp-light flex items-center justify-center">
        <div className="text-center">
          <h1 className="heading-2 text-corp-dark mb-4">Page Not Found</h1>
          <Link to="/" className="btn-primary">Go Home</Link>
        </div>
      </div>
    );
  }

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
            <Link 
              to={`/company/${company.id}`} 
              className="flex items-center gap-2 text-corp-gray hover:text-corp-blue transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-inter text-sm">Back to {company.name}</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Category Header */}
      <section className={`${category.bgColor} py-12 lg:py-16`}>
        <div className="w-full px-6 lg:px-12">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Link 
                to={`/company/${company.id}`} 
                className="font-inter text-corp-gray hover:text-corp-dark transition-colors"
              >
                {company.name}
              </Link>
              <span className="text-corp-gray">/</span>
              <span className="font-inter text-corp-dark">{category.name}</span>
            </div>
            <h1 className="font-montserrat font-bold text-4xl lg:text-5xl text-corp-dark mb-4">
              {category.name}
            </h1>
            <p className="font-inter text-lg text-corp-gray max-w-2xl">
              {category.description}
            </p>
          </div>
        </div>
      </section>

      {/* Offers Grid */}
      <section className="py-12 lg:py-16">
        <div className="w-full px-6 lg:px-12">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-montserrat font-bold text-xl text-corp-dark">
                {offers.length} {offers.length === 1 ? 'Deal' : 'Deals'} Available
              </h2>
            </div>

            {offers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {offers.map((offer) => (
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
                            View Deal <ExternalLink className="w-4 h-4" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl">
                <p className="font-inter text-corp-gray text-lg mb-4">
                  No deals available in this category yet.
                </p>
                <Link to={`/company/${company.id}`} className="btn-primary">
                  Browse Other Categories
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-corp-dark text-white py-8">
        <div className="w-full px-6 lg:px-12">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-corp-blue rounded-xl flex items-center justify-center">
                <span className="font-montserrat font-bold">C</span>
              </div>
              <span className="font-montserrat font-bold text-xl">CorpDeals</span>
            </div>
            <p className="font-inter text-white/60 text-sm">
              Verified employee perks platform
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

export default CategoryPage;
