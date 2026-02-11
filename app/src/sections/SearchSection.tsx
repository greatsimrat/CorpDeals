import { useRef, useLayoutEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Search, Building2, Plane, Heart, UtensilsCrossed, Laptop, Dumbbell, Shield, Ticket, ShoppingBag, ArrowRight, Sparkles } from 'lucide-react';
import { companies, searchCompanies } from '../data/companies';

gsap.registerPlugin(ScrollTrigger);

const categories = [
  { label: 'Travel', icon: Plane, color: 'bg-blue-50 text-blue-600' },
  { label: 'Wellness', icon: Heart, color: 'bg-rose-50 text-rose-600' },
  { label: 'Food', icon: UtensilsCrossed, color: 'bg-orange-50 text-orange-600' },
  { label: 'Tech', icon: Laptop, color: 'bg-purple-50 text-purple-600' },
  { label: 'Fitness', icon: Dumbbell, color: 'bg-green-50 text-green-600' },
  { label: 'Insurance', icon: Shield, color: 'bg-teal-50 text-teal-600' },
  { label: 'Entertainment', icon: Ticket, color: 'bg-pink-50 text-pink-600' },
  { label: 'Shopping', icon: ShoppingBag, color: 'bg-amber-50 text-amber-600' },
];

const SearchSection = () => {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLDivElement>(null);
  const searchCardRef = useRef<HTMLDivElement>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);
  const companiesRef = useRef<HTMLDivElement>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        searchCardRef.current,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: searchCardRef.current,
            start: 'top 85%',
            end: 'top 60%',
            scrub: true,
          },
        }
      );

      const chips = categoriesRef.current?.querySelectorAll('.category-chip');
      if (chips) {
        gsap.fromTo(
          chips,
          { opacity: 0, y: 30, scale: 0.9 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.5,
            stagger: 0.05,
            ease: 'back.out(1.5)',
            scrollTrigger: {
              trigger: categoriesRef.current,
              start: 'top 85%',
              end: 'top 60%',
              scrub: true,
            },
          }
        );
      }

      const companyItems = companiesRef.current?.querySelectorAll('.company-item');
      if (companyItems) {
        gsap.fromTo(
          companyItems,
          { opacity: 0, x: -20 },
          {
            opacity: 1,
            x: 0,
            duration: 0.5,
            stagger: 0.08,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: companiesRef.current,
              start: 'top 85%',
              end: 'top 65%',
              scrub: true,
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const handleSearch = () => {
    if (searchQuery) {
      const matchedCompanies = searchCompanies(searchQuery);
      if (matchedCompanies.length > 0) {
        setIsSearching(true);
        setTimeout(() => {
          setSelectedCompany(matchedCompanies[0].id);
          setIsSearching(false);
        }, 500);
      }
    }
  };

  const handleCompanySelect = (companyId: string) => {
    setSelectedCompany(companyId);
    const company = companies.find(c => c.id === companyId);
    if (company) {
      setSearchQuery(company.name);
    }
    setShowDropdown(false);
  };

  const goToCompanyPage = () => {
    if (selectedCompany) {
      navigate(`/company/${selectedCompany}`);
    }
  };

  const filteredCompanies = searchCompanies(searchQuery);

  return (
    <section
      ref={sectionRef}
      id="search"
      className="relative w-full bg-corp-light py-20 lg:py-28 z-20"
      aria-label="Find Your Company"
    >
      <div className="w-full px-6 lg:px-12">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-corp-highlight rounded-full mb-4">
              <Sparkles className="w-4 h-4 text-corp-blue" />
              <span className="font-inter text-sm text-corp-blue font-medium">
                Start Saving Today
              </span>
            </div>
            <h2 className="heading-2 text-corp-dark mb-4">
              FIND PERKS FOR YOUR COMPANY
            </h2>
            <p className="body-text text-lg max-w-xl mx-auto">
              Search your employer to see exclusive deals and discounts available to you.
            </p>
          </div>

          <div
            ref={searchCardRef}
            className="bg-white rounded-3xl shadow-card p-6 lg:p-10 mb-10"
          >
            <div className="relative mb-8">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <Building2 className="w-6 h-6 text-corp-blue" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowDropdown(true);
                      setSelectedCompany(null);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Search your company (e.g., Amazon, Google...)"
                    className="w-full pl-14 pr-4 py-4 bg-gray-50 rounded-2xl text-lg font-inter text-corp-dark placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-corp-blue/30 focus:bg-white transition-all"
                    aria-label="Search for your company"
                  />
                  
                  {showDropdown && searchQuery && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-card overflow-hidden z-50 border border-gray-100">
                      {filteredCompanies.length > 0 ? (
                        filteredCompanies.map((company) => (
                          <button
                            key={company.id}
                            onClick={() => handleCompanySelect(company.id)}
                            className="w-full px-4 py-3 text-left font-inter text-corp-dark hover:bg-corp-highlight transition-colors flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                                style={{ backgroundColor: company.color }}
                              >
                                {company.logo}
                              </div>
                              <span>{company.name}</span>
                            </div>
                            <span className="text-sm text-corp-gray">
                              {company.totalDeals} deals
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-4 text-center">
                          <p className="text-corp-gray font-inter mb-2">
                            Company not found?
                          </p>
                          <button className="text-corp-blue font-inter text-sm hover:underline">
                            Request your company
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button 
                  onClick={handleSearch}
                  className="btn-primary px-8 py-4 flex items-center justify-center gap-2 text-base"
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      Find Perks
                    </>
                  )}
                </button>
              </div>
              
              {showDropdown && (
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowDropdown(false)}
                />
              )}
            </div>

            {selectedCompany && !isSearching && (
              <div className="bg-corp-highlight rounded-2xl p-6 mb-8 animate-fade-in-up">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    {(() => {
                      const company = companies.find(c => c.id === selectedCompany);
                      return company ? (
                        <>
                          <div 
                            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-montserrat font-bold text-2xl"
                            style={{ backgroundColor: company.color }}
                          >
                            {company.logo}
                          </div>
                          <div>
                            <h3 className="font-montserrat font-bold text-xl text-corp-dark">
                              {company.name}
                            </h3>
                            <p className="font-inter text-corp-gray">
                              {company.totalDeals} exclusive deals available
                            </p>
                          </div>
                        </>
                      ) : null;
                    })()}
                  </div>
                  <button 
                    onClick={goToCompanyPage}
                    className="btn-primary flex items-center gap-2"
                  >
                    View All Deals
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            <div ref={companiesRef}>
              <p className="font-inter text-sm text-corp-gray mb-4">
                Popular companies:
              </p>
              <div className="flex flex-wrap gap-3">
                {companies.slice(0, 6).map((company) => (
                  <button
                    key={company.id}
                    onClick={() => navigate(`/company/${company.id}`)}
                    className="company-item flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-xl hover:bg-corp-highlight hover:text-corp-blue transition-all group"
                  >
                    <span className="font-inter text-sm text-corp-dark group-hover:text-corp-blue">
                      {company.name}
                    </span>
                    <span className="text-xs text-corp-gray bg-white px-2 py-0.5 rounded-full">
                      {company.totalDeals}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div ref={categoriesRef}>
            <p className="font-inter text-sm text-corp-gray text-center mb-6">
              Or browse by category:
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.label}
                    className="category-chip flex items-center gap-2 px-5 py-3 bg-white rounded-xl shadow-sm hover:shadow-card transition-all duration-300 group"
                  >
                    <div className={`w-9 h-9 ${category.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-inter text-sm font-medium text-corp-dark">
                      {category.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SearchSection;
