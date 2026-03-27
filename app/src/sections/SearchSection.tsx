import { useRef, useLayoutEffect, useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Search, Building2, ArrowRight, Sparkles } from 'lucide-react';
import api from '../services/api';

gsap.registerPlugin(ScrollTrigger);
const initialCompanyRequestForm = {
  companyName: '',
  requesterName: '',
  workEmail: '',
  city: '',
  note: '',
};

const SearchSection = () => {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLDivElement>(null);
  const searchCardRef = useRef<HTMLDivElement>(null);
  const companiesRef = useRef<HTMLDivElement>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [showCompanyRequestForm, setShowCompanyRequestForm] = useState(false);
  const [isSubmittingCompanyRequest, setIsSubmittingCompanyRequest] = useState(false);
  const [companyRequestSuccess, setCompanyRequestSuccess] = useState('');
  const [companyRequestError, setCompanyRequestError] = useState('');
  const [companyRequestForm, setCompanyRequestForm] = useState(initialCompanyRequestForm);
  const [companies, setCompanies] = useState<any[]>([]);
  const hasImageLogo = (logo: unknown) =>
    typeof logo === 'string' && (logo.startsWith('http://') || logo.startsWith('https://') || logo.startsWith('/'));
  const normalizedCompanyRequest = searchQuery.trim() || 'your company';

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const data = await api.getCompanies();
        const normalized = (data as any)?.companies || data || [];
        setCompanies(normalized);
      } catch (error: any) {
        console.error('Failed to get companies', {
          status: error?.status,
          body: error?.responseBody,
          message: error?.message,
        });
      }
    };
    loadCompanies();
  }, []);

  const openCompanyRequestForm = () => {
    const companyName = searchQuery.trim();
    setCompanyRequestForm((current) => ({
      ...current,
      companyName: companyName || current.companyName,
    }));
    setCompanyRequestError('');
    setCompanyRequestSuccess('');
    setShowCompanyRequestForm(true);
    setShowDropdown(false);
  };

  const updateCompanyRequestField = (field: keyof typeof initialCompanyRequestForm, value: string) => {
    setCompanyRequestForm((current) => ({
      ...current,
      [field]: value,
    }));
    setCompanyRequestError('');
  };

  const validateCompanyRequest = () => {
    const companyName = companyRequestForm.companyName.trim();
    const requesterName = companyRequestForm.requesterName.trim();
    const workEmail = companyRequestForm.workEmail.trim();

    if (!companyName || !requesterName || !workEmail) {
      return 'Company name, your name, and work email are required.';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(workEmail)) {
      return 'Please enter a valid work email.';
    }

    return '';
  };

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

  const goToCompanyDeals = (company: any) => {
    const companyIdOrSlug = company.slug || company.id;
    navigate(`/c/${encodeURIComponent(companyIdOrSlug)}`);
  };

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) return;

    setSearchError('');
    setIsSearching(true);
    try {
      const resolved = await api.resolveCompanyFromSearch(query);
      const company = resolved.company || resolved.matches?.[0] || null;

      if (!company) {
        setSelectedCompany(null);
        setSearchError('We could not find that company yet.');
        setCompanyRequestSuccess('');
        return;
      }

      setSelectedCompany(company);
      setShowCompanyRequestForm(false);
      setCompanyRequestSuccess('');
      goToCompanyDeals(company);
    } catch (error: any) {
      console.error('Failed to resolve company search', {
        status: error?.status,
        body: error?.responseBody,
        message: error?.message,
      });
      setSearchError(error.message || 'Unable to search deals right now');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCompanySelect = (company: any) => {
    setSelectedCompany(company);
    setSearchQuery(company.name);
    setSearchError('');
    setShowCompanyRequestForm(false);
    setCompanyRequestSuccess('');
    setShowDropdown(false);
  };

  const handleCompanyRequestSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateCompanyRequest();
    if (validationError) {
      setCompanyRequestError(validationError);
      return;
    }

    setIsSubmittingCompanyRequest(true);
    setCompanyRequestError('');

    try {
      const response = await api.submitCompanyRequest({
        companyName: companyRequestForm.companyName.trim(),
        requesterName: companyRequestForm.requesterName.trim(),
        workEmail: companyRequestForm.workEmail.trim(),
        city: companyRequestForm.city.trim(),
        note: companyRequestForm.note.trim(),
      });

      setCompanyRequestSuccess(
        response.message || `Thanks. We received your request to add ${companyRequestForm.companyName.trim()}.`
      );
      setCompanyRequestForm(initialCompanyRequestForm);
      setSearchError('');
      setShowCompanyRequestForm(false);
    } catch (error: any) {
      if (error?.company?.slug) {
        setSelectedCompany(error.company);
      }
      setCompanyRequestError(error?.message || 'Unable to submit your request right now.');
    } finally {
      setIsSubmittingCompanyRequest(false);
    }
  };

  const filteredCompanies = companies.filter((company) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      company.name?.toLowerCase().includes(query) ||
      company.slug?.toLowerCase().includes(query) ||
      company.domain?.toLowerCase().includes(query) ||
      (Array.isArray(company.domains) &&
        company.domains.some((domain: string) => domain.toLowerCase().includes(query)))
    );
  });

  return (
    <section
      ref={sectionRef}
      id="search"
      className="relative w-full bg-corp-light py-14 lg:py-18 z-20"
      aria-label="Find Your Company"
    >
      <div className="w-full px-6 lg:px-12">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-corp-highlight rounded-full mb-4">
              <Sparkles className="w-4 h-4 text-corp-blue" />
              <span className="font-inter text-sm text-corp-blue font-medium">
                Employee Discounts by Company
              </span>
            </div>
            <h2 className="heading-2 text-corp-dark mb-4">
              FIND YOUR COMPANY AND UNLOCK VERIFIED DEALS
            </h2>
            <p className="body-text text-lg max-w-xl mx-auto">
              Verify your work email once, and access the perks your company
              is eligible for.
            </p>
          </div>

          <div
            ref={searchCardRef}
            className="bg-white rounded-3xl shadow-card p-6 lg:p-8"
          >
            <div className="relative mb-6">
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
                      setSearchError('');
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearch();
                      }
                    }}
                    placeholder="Search your company (e.g., Amazon, Microsoft)"
                    className="w-full pl-14 pr-4 py-4 bg-gray-50 rounded-2xl text-lg font-inter text-corp-dark placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-corp-blue/30 focus:bg-white transition-all"
                    aria-label="Search for your company"
                  />
                  
                  {showDropdown && searchQuery && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-card overflow-hidden z-50 border border-gray-100">
                      {filteredCompanies.length > 0 ? (
                        filteredCompanies.slice(0, 8).map((company) => (
                          <button
                            key={company.id}
                            onClick={() => handleCompanySelect(company)}
                            className="w-full px-4 py-3 text-left font-inter text-corp-dark hover:bg-corp-highlight transition-colors flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-corp-blue bg-corp-highlight font-bold">
                                {hasImageLogo(company.logo) ? (
                                  <img
                                    src={company.logo}
                                    alt={company.name}
                                    className="w-10 h-10 rounded-xl object-cover"
                                  />
                                ) : company.logo ? (
                                  company.logo
                                ) : (
                                  String(company.name || 'C').charAt(0)
                                )}
                              </div>
                              <span>{company.name}</span>
                            </div>
                            <span className="text-sm text-corp-gray">
                              {company._count?.offers ?? 0} deals
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-4 text-center">
                          <p className="text-corp-gray font-inter mb-1">
                            Company not found?
                          </p>
                          <p className="mx-auto mb-3 max-w-sm text-sm leading-6 text-corp-gray">
                            Send us a quick request and we will review adding {normalizedCompanyRequest}.
                          </p>
                          <button
                            onClick={openCompanyRequestForm}
                            className="text-corp-blue font-inter text-sm font-medium hover:underline"
                          >
                            Request your company to be added
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
                       Find deals
                    </>
                  )}
                </button>
                <Link
                  to="/verify"
                  className="btn-secondary px-8 py-4 flex items-center justify-center gap-2 text-base"
                >
                  Verify my work email
                </Link>
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
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white text-corp-blue font-montserrat font-bold text-2xl">
                      {hasImageLogo(selectedCompany.logo) ? (
                        <img
                          src={selectedCompany.logo}
                          alt={selectedCompany.name}
                          className="w-14 h-14 rounded-2xl object-cover"
                        />
                      ) : selectedCompany.logo ? (
                        selectedCompany.logo
                      ) : (
                        String(selectedCompany.name || 'C').charAt(0)
                      )}
                    </div>
                    <div>
                      <h3 className="font-montserrat font-bold text-xl text-corp-dark">
                        {selectedCompany.name}
                      </h3>
                      <p className="font-inter text-corp-gray">
                        {selectedCompany._count?.offers ?? 0} exclusive deals available
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => goToCompanyDeals(selectedCompany)}
                    className="btn-primary flex items-center gap-2"
                  >
                    View all deals
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {searchError && (
              <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <p>{searchError}</p>
                <p className="mt-2 text-amber-700">
                  Example: if you work at City of Vancouver, open the short request form and we
                  will review adding it.
                </p>
                <button
                  onClick={openCompanyRequestForm}
                  className="mt-3 inline-flex items-center gap-2 font-medium text-amber-900 underline decoration-amber-400 underline-offset-4"
                >
                  Request {normalizedCompanyRequest} to be added
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {(showCompanyRequestForm || companyRequestSuccess || companyRequestError) && (
              <div className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Add your company
                    </p>
                    <h3 className="mt-1 font-montserrat text-2xl font-bold text-corp-dark">
                      Request your company in one short step
                    </h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-corp-gray">
                      If we do not have your employer yet, send us your company name and work email.
                      Example: City of Vancouver.
                    </p>
                  </div>
                  {showCompanyRequestForm && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowCompanyRequestForm(false);
                        setCompanyRequestError('');
                      }}
                      className="text-sm font-medium text-slate-500 hover:text-slate-700"
                    >
                      Close
                    </button>
                  )}
                </div>

                {companyRequestSuccess && (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    {companyRequestSuccess}
                  </div>
                )}

                {showCompanyRequestForm && (
                  <form className="mt-5 grid gap-4" onSubmit={handleCompanyRequestSubmit}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Company name
                        </label>
                        <input
                          type="text"
                          value={companyRequestForm.companyName}
                          onChange={(e) => updateCompanyRequestField('companyName', e.target.value)}
                          placeholder="City of Vancouver"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-corp-dark outline-none transition focus:border-corp-blue focus:ring-2 focus:ring-corp-blue/20"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Your name
                        </label>
                        <input
                          type="text"
                          value={companyRequestForm.requesterName}
                          onChange={(e) => updateCompanyRequestField('requesterName', e.target.value)}
                          placeholder="Jane Smith"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-corp-dark outline-none transition focus:border-corp-blue focus:ring-2 focus:ring-corp-blue/20"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Work email
                        </label>
                        <input
                          type="email"
                          value={companyRequestForm.workEmail}
                          onChange={(e) => updateCompanyRequestField('workEmail', e.target.value)}
                          placeholder="you@vancouver.ca"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-corp-dark outline-none transition focus:border-corp-blue focus:ring-2 focus:ring-corp-blue/20"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          City or region
                        </label>
                        <input
                          type="text"
                          value={companyRequestForm.city}
                          onChange={(e) => updateCompanyRequestField('city', e.target.value)}
                          placeholder="Vancouver, BC"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-corp-dark outline-none transition focus:border-corp-blue focus:ring-2 focus:ring-corp-blue/20"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Brief note
                      </label>
                      <textarea
                        value={companyRequestForm.note}
                        onChange={(e) => updateCompanyRequestField('note', e.target.value)}
                        rows={3}
                        placeholder="I work at City of Vancouver and would like employee deals for our organization."
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-corp-dark outline-none transition focus:border-corp-blue focus:ring-2 focus:ring-corp-blue/20"
                      />
                    </div>

                    {companyRequestError && (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {companyRequestError}
                      </div>
                    )}

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-corp-gray">
                        We use this only to review and verify new company requests.
                      </p>
                      <button
                        type="submit"
                        className="btn-primary px-6 py-3"
                        disabled={isSubmittingCompanyRequest}
                      >
                        {isSubmittingCompanyRequest ? 'Sending request...' : 'Send request'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            <div ref={companiesRef}>
              <p className="font-inter text-sm text-corp-gray mb-4">
                Popular company programs:
              </p>
              <div className="flex flex-wrap gap-3">
                {companies.slice(0, 6).map((company: any) => (
                  <button
                    key={company.id}
                    onClick={() => goToCompanyDeals(company)}
                    className="company-item flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-xl hover:bg-corp-highlight hover:text-corp-blue transition-all group"
                  >
                    <span className="font-inter text-sm text-corp-dark group-hover:text-corp-blue">
                      {company.name}
                    </span>
                    <span className="text-xs text-corp-gray bg-white px-2 py-0.5 rounded-full">
                      {company._count?.offers ?? 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SearchSection;
