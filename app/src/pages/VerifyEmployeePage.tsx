import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  ShieldCheck,
  Unlock,
  Building2,
  Mail,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import Seo from '../components/Seo';

interface CompanySummary {
  id: string;
  slug: string;
  name: string;
  domain?: string | null;
  logo?: string | null;
  verified?: boolean;
  isProvisional?: boolean;
}

const initialCompanyRequestForm = {
  companyName: '',
  requesterName: '',
  workEmail: '',
  city: '',
  note: '',
};

const VerifyEmployeePage = () => {
  const { companyId } = useParams<{ companyId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const queryParams = new URLSearchParams(location.search);
  const companyFromQuery =
    queryParams.get('companyId') || queryParams.get('company') || '';

  const [step, setStep] = useState(1);
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [companyError, setCompanyError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<CompanySummary | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showRequestCompanyForm, setShowRequestCompanyForm] = useState(false);
  const [isSubmittingCompanyRequest, setIsSubmittingCompanyRequest] = useState(false);
  const [companyRequestError, setCompanyRequestError] = useState('');
  const [companyRequestSuccess, setCompanyRequestSuccess] = useState('');
  const [companyRequestForm, setCompanyRequestForm] = useState(initialCompanyRequestForm);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const redirectTo = (location.state as any)?.redirectTo as string | undefined;

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const data = await api.getCompanies();
        const list = (data as any)?.companies || data || [];
        const normalized = list.map((company: any) => ({
          id: company.id,
          slug: company.slug,
          name: company.name,
          domain: company.domain || company.domains?.[0] || null,
          logo: company.logo,
          verified: company.verified,
        }));
        setCompanies(normalized);
      } catch (err: any) {
        console.error('Failed to get companies', {
          status: err?.status,
          body: err?.responseBody,
          message: err?.message,
        });
        setCompanyError(err.message || 'Failed to load companies');
      } finally {
        setIsLoadingCompanies(false);
      }
    };

    loadCompanies();
  }, []);

  useEffect(() => {
    const targetCompany = companyId || companyFromQuery;
    if (!targetCompany || companies.length === 0) return;
    const match = companies.find(
      (company) => company.slug === targetCompany || company.id === targetCompany
    );
    if (match) {
      setSelectedCompany(match);
      setStep(2);
    }
  }, [companyId, companyFromQuery, companies]);

  useEffect(() => {
    if (!user?.name || fullName.trim()) return;
    setFullName(user.name);
  }, [fullName, user?.name]);

  useEffect(() => {
    setCompanyRequestForm((current) => ({
      ...current,
      companyName: selectedCompany?.name || current.companyName,
      requesterName: fullName || current.requesterName,
      workEmail: email || current.workEmail,
    }));
  }, [selectedCompany?.name, fullName, email]);

  useEffect(() => {
    const targetCompany = companyId || companyFromQuery;
    if (!user?.employmentVerifiedAt || !user.employeeCompany || targetCompany) return;
    const verifiedCompany: CompanySummary = {
      id: user.employeeCompany.id,
      slug: user.employeeCompany.slug,
      name: user.employeeCompany.name,
      domain: user.employeeCompany.domain,
      logo: null,
      verified: true,
    };
    setSelectedCompany(verifiedCompany);
    setStep(3);
  }, [companyId, companyFromQuery, user]);

  useEffect(() => {
    const targetCompany = companyId || companyFromQuery;
    if (!targetCompany || !user?.activeVerification?.company) return;

    const activeCompany = user.activeVerification.company;
    if (activeCompany.slug === targetCompany || activeCompany.id === targetCompany) {
      setSelectedCompany({
        id: activeCompany.id,
        slug: activeCompany.slug,
        name: activeCompany.name,
        domain: activeCompany.domain,
        logo: activeCompany.logo || null,
        verified: true,
      });
      setStep(3);
    }
  }, [companyId, companyFromQuery, user]);

  useEffect(() => {
    if (step !== 3 || !selectedCompany) return;
    const to = redirectTo || `/c/${selectedCompany.slug || selectedCompany.id}`;
    const timer = setTimeout(() => {
      navigate(to, { replace: true });
    }, 1200);
    return () => clearTimeout(timer);
  }, [navigate, redirectTo, selectedCompany, step]);

  const FEATURED_COMPANY_SLUGS = [
    'amazon',
    'microsoft',
    'google',
    'apple',
    'meta',
    'bc-hydro',
    'city-of-vancouver',
  ];

  const featuredCompanies = useMemo(() => {
    const bySlug = new Map(companies.map((company) => [company.slug, company]));
    return FEATURED_COMPANY_SLUGS.map((slug) => bySlug.get(slug)).filter(Boolean) as CompanySummary[];
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase();
    if (query.length < 2) return [];
    return companies.filter((company) => {
      return (
        company.name.toLowerCase().includes(query) ||
        (company.domain || '').toLowerCase().includes(query)
      );
    });
  }, [companies, deferredSearchQuery]);

  const isSearchActive = deferredSearchQuery.trim().length >= 2;
  const visibleSearchResults = filteredCompanies.slice(0, 10);

  const provisionalCompany = useMemo<CompanySummary | null>(() => {
    const typedCompanyName = deferredSearchQuery.trim();
    if (typedCompanyName.length < 2 || filteredCompanies.length > 0) {
      return null;
    }

    return {
      id: `provisional:${typedCompanyName.toLowerCase()}`,
      slug: '',
      name: typedCompanyName,
      domain: null,
      logo: null,
      verified: false,
      isProvisional: true,
    };
  }, [deferredSearchQuery, filteredCompanies.length]);

  const handleSelectCompany = (company: CompanySummary) => {
    setSelectedCompany(company);
    setStep(2);
    setError('');
    setCompanyRequestError('');
    setCompanyRequestSuccess('');
    setShowRequestCompanyForm(false);
    setCode('');
    setCodeSent(false);
    setDevCode(null);
    setVerificationId('');
  };

  const openRequestCompanyForm = () => {
    setCompanyRequestForm((current) => ({
      ...current,
      companyName: selectedCompany?.name || current.companyName,
      requesterName: fullName || current.requesterName,
      workEmail: email || current.workEmail,
    }));
    setCompanyRequestError('');
    setCompanyRequestSuccess('');
    setShowRequestCompanyForm(true);
  };

  const handleCompanyRequestFieldChange = (
    field: keyof typeof initialCompanyRequestForm,
    value: string
  ) => {
    setCompanyRequestForm((current) => ({
      ...current,
      [field]: value,
    }));
    setCompanyRequestError('');
  };

  const handleSendCode = async () => {
    if (!selectedCompany) return;
    setError('');
    setIsSending(true);
    try {
      const result = await api.startVerification({
        companyId: selectedCompany.isProvisional ? undefined : selectedCompany.slug || selectedCompany.id,
        companyName: selectedCompany.name,
        workEmail: email,
      });
      setVerificationId(result.verificationId);
      setCodeSent(true);
      setDevCode(result.devCode || null);
      setSelectedCompany({
        id: result.company.id,
        slug: result.company.slug,
        name: result.company.name,
        domain: result.company.domain || null,
        logo: result.company.logo || null,
        verified: false,
      });
    } catch (err: any) {
      const message = String(err?.message || '');
      if (message.includes('Company not found')) {
        setError(
          'We could not match that employer yet. Double-check your work email domain or request your company and we will review it.'
        );
        openRequestCompanyForm();
      } else {
        setError(message || 'Failed to send verification code');
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleVerify = async () => {
    if (!selectedCompany) return;
    setError('');
    setIsVerifying(true);
    try {
      await api.confirmVerification({
        companyId: selectedCompany.slug || selectedCompany.id,
        workEmail: email,
        otp: code,
        verificationId: verificationId || undefined,
        name: fullName,
      });
      await refreshUser();
      setStep(3);
    } catch (err: any) {
      if (verificationId) {
        try {
          await api.verifyEmployeeCode({
            verificationId,
            code,
            name: fullName,
          });
          await refreshUser();
          setStep(3);
          return;
        } catch (legacyErr: any) {
          setError(legacyErr.message || 'Failed to verify code');
          return;
        }
      }
      setError(err.message || 'Failed to verify code');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCompanyRequestSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const companyName = companyRequestForm.companyName.trim();
    const requesterName = companyRequestForm.requesterName.trim();
    const workEmail = companyRequestForm.workEmail.trim();

    if (!companyName || !requesterName || !workEmail) {
      setCompanyRequestError('Company name, your name, and work email are required.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(workEmail)) {
      setCompanyRequestError('Please enter a valid work email.');
      return;
    }

    setIsSubmittingCompanyRequest(true);
    setCompanyRequestError('');

    try {
      const response = await api.submitCompanyRequest({
        companyName,
        requesterName,
        workEmail,
        city: companyRequestForm.city.trim(),
        note:
          companyRequestForm.note.trim() ||
          'Submitted from the employee verification page because the company was not yet available for work email verification.',
      });

      setCompanyRequestSuccess(
        response.message || `Thanks. We received your request to add ${companyName}.`
      );
      setError('');
      setShowRequestCompanyForm(true);
    } catch (err: any) {
      setCompanyRequestError(err?.message || 'Unable to submit your company request right now.');
    } finally {
      setIsSubmittingCompanyRequest(false);
    }
  };

  return (
    <>
      <Seo
        title="Verify Work Email | CorpDeals"
        description="Verify your company email to unlock employee-only offers and submit trusted lead requests on CorpDeals."
        keywords="work email verification, employee verification, company offer access"
        path="/verify"
      />
      <div className="min-h-screen bg-corp-light">
      {/* Navigation */}
      <nav className="bg-white/95 backdrop-blur-lg shadow-sm sticky top-0 z-50">
        <div className="w-full px-6 lg:px-12">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 bg-corp-blue rounded-xl flex items-center justify-center">
                <span className="text-white font-montserrat font-bold text-lg">C</span>
              </div>
              <span className="font-montserrat font-bold text-xl text-corp-dark">
                CorpDeals
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-corp-gray hover:text-corp-blue transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-inter text-sm">Back</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="py-12 lg:py-16">
        <div className="w-full px-6 lg:px-12">
          <div className="max-w-4xl mx-auto text-center">
            <span className="eyebrow mb-4 block">EMPLOYEE VERIFICATION</span>
            <h1 className="heading-2 text-corp-dark mb-4">Verify Your Employment</h1>
            <p className="body-text text-lg">
              Verify once with your work email. Unlock all eligible deals for your company.
            </p>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="pb-12 lg:pb-16">
        <div className="w-full px-6 lg:px-12">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className={`rounded-2xl p-4 border ${step >= 1 ? 'bg-white border-corp-blue/40' : 'bg-white/60 border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Search className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-montserrat font-bold text-corp-dark">Find Company</p>
                    <p className="text-sm text-corp-gray">Select your employer</p>
                  </div>
                </div>
              </div>
              <div className={`rounded-2xl p-4 border ${step >= 2 ? 'bg-white border-green-500/40' : 'bg-white/60 border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-montserrat font-bold text-corp-dark">Verify Email</p>
                    <p className="text-sm text-corp-gray">Enter your work email</p>
                  </div>
                </div>
              </div>
              <div className={`rounded-2xl p-4 border ${step >= 3 ? 'bg-white border-purple-500/40' : 'bg-white/60 border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                    <Unlock className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-montserrat font-bold text-corp-dark">Unlock Deals</p>
                    <p className="text-sm text-corp-gray">Start saving today</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 1 */}
            {step === 1 && (
              <div className="bg-white rounded-3xl shadow-card p-6 lg:p-8">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                  <div className="rounded-[28px] bg-slate-950 px-6 py-7 text-white lg:px-8">
                    <span className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-200">
                      Step 1
                    </span>
                    <h2 className="mt-3 font-montserrat text-2xl font-bold leading-tight">
                      Choose your employer
                    </h2>
                    <p className="mt-3 text-sm text-slate-200 lg:text-base">
                      Start with one of the employers employees look for most often, or search the
                      full directory if your company is not shown below.
                    </p>
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <p className="text-sm font-semibold">Verify once</p>
                        <p className="mt-1 text-xs text-slate-300">Use your work email only for eligibility.</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <p className="text-sm font-semibold">Unlock your deals</p>
                        <p className="mt-1 text-xs text-slate-300">See offers matched to your company and location.</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <p className="text-sm font-semibold">Keep your login</p>
                        <p className="mt-1 text-xs text-slate-300">Your account email stays separate from work verification.</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 lg:p-6">
                    <p className="text-sm font-semibold text-slate-900">Search your employer</p>
                    <p className="mt-1 text-sm text-slate-600">
                      We only showcase a few top employers here. Start typing to search the full company list.
                    </p>
                    <div className="relative mt-4">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-corp-gray" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Type company name or work domain"
                        className="w-full pl-12 pr-4 py-3 bg-white rounded-xl font-inter outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-corp-blue/30"
                      />
                    </div>
                    {!isSearchActive && (
                      <p className="mt-3 text-xs text-slate-500">
                        Search starts after 2 letters.
                      </p>
                    )}
                  </div>
                </div>
                {isLoadingCompanies && (
                  <div className="mt-6 flex items-center gap-2 text-corp-gray">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading companies...
                  </div>
                )}
                {companyError && (
                  <p className="mt-6 text-sm text-red-600">{companyError}</p>
                )}
                {!isLoadingCompanies && !companyError && (
                  <div className="mt-8">
                    {!isSearchActive ? (
                      <>
                        <div className="flex flex-wrap items-end justify-between gap-3">
                          <div>
                            <h3 className="font-montserrat text-lg font-bold text-corp-dark">
                              Popular employers on CorpDeals
                            </h3>
                            <p className="text-sm text-slate-600">
                              Pick one of the most common employers employees verify with today.
                            </p>
                          </div>
                          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                            Curated list
                          </p>
                        </div>
                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                          {featuredCompanies.map((company) => (
                            <button
                              key={company.id}
                              onClick={() => handleSelectCompany(company)}
                              className="group text-left rounded-3xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-corp-blue/40 hover:shadow-card"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-corp-highlight text-corp-blue">
                                    {company.logo ? (
                                      <img
                                        src={company.logo}
                                        alt={company.name}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <Building2 className="h-6 w-6" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-montserrat text-base font-bold text-corp-dark">
                                      {company.name}
                                    </p>
                                    <p className="text-sm text-corp-gray">
                                      {company.domain || 'Work domain available after verification'}
                                    </p>
                                  </div>
                                </div>
                                <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700">
                                  Featured
                                </span>
                              </div>
                              <p className="mt-4 text-sm text-slate-600">
                                Verify your work email and continue to employee deals.
                              </p>
                            </button>
                          ))}
                        </div>
                        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                          Looking for another employer? Use the search box above to find any company in the directory.
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-end justify-between gap-3">
                          <div>
                            <h3 className="font-montserrat text-lg font-bold text-corp-dark">
                              Search results
                            </h3>
                            <p className="text-sm text-slate-600">
                              Showing the closest company matches for "{deferredSearchQuery.trim()}".
                            </p>
                          </div>
                          {filteredCompanies.length > visibleSearchResults.length && (
                            <p className="text-xs text-slate-500">
                              Showing the first {visibleSearchResults.length} matches
                            </p>
                          )}
                        </div>
                        {visibleSearchResults.length > 0 ? (
                          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                            {visibleSearchResults.map((company) => (
                              <button
                                key={company.id}
                                onClick={() => handleSelectCompany(company)}
                                className="text-left border border-gray-200 rounded-2xl p-4 hover:border-corp-blue/40 hover:shadow-card transition-all"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-xl bg-corp-highlight flex items-center justify-center overflow-hidden text-corp-blue font-bold">
                                    {company.logo ? (
                                      <img
                                        src={company.logo}
                                        alt={company.name}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <Building2 className="w-6 h-6" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-montserrat font-bold text-corp-dark">{company.name}</p>
                                    <p className="text-sm text-corp-gray">{company.domain || 'Domain not listed'}</p>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                            <p className="text-sm font-medium text-slate-900">
                              No companies match your search.
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              You can still continue with your employer name and verify your work email.
                              If the domain checks out, CorpDeals will create a company record even when
                              there are no offers live yet.
                            </p>
                            {provisionalCompany && (
                              <button
                                type="button"
                                onClick={() => handleSelectCompany(provisionalCompany)}
                                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-corp-blue/30 bg-white px-4 py-3 text-sm font-semibold text-corp-blue shadow-sm transition hover:border-corp-blue/50 hover:bg-blue-50"
                              >
                                <Building2 className="h-4 w-4" />
                                Continue with "{provisionalCompany.name}"
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && selectedCompany && (
              <div className="bg-white rounded-3xl shadow-card p-6 lg:p-8">
                <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                  <div>
                    <h2 className="font-montserrat font-bold text-xl text-corp-dark">
                      Step 2: Verify your work email
                    </h2>
                    <p className="text-sm text-corp-gray">
                      Verify you're an active employee at {selectedCompany.name}.
                    </p>
                    {selectedCompany.isProvisional && (
                      <p className="mt-2 text-sm text-slate-600">
                        We will create a company profile for {selectedCompany.name} after your work
                        email domain is verified, even if no vendor offers exist yet.
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setStep(1)}
                    className="btn-secondary"
                  >
                    Change company
                  </button>
                </div>

                <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    {selectedCompany.logo ? (
                      <img
                        src={selectedCompany.logo}
                        alt={selectedCompany.name}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-200 bg-white"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-corp-blue font-semibold">
                        {selectedCompany.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-900">{selectedCompany.name}</p>
                      <p className="text-xs text-slate-600">
                        {selectedCompany.domain
                          ? selectedCompany.domain
                          : selectedCompany.isProvisional
                            ? 'We will verify the work email domain you enter'
                            : 'Enter your work email to confirm your employer'}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedCompany.isProvisional && !showRequestCompanyForm && (
                  <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-slate-700">
                    <p className="font-medium text-slate-900">Not seeing your employer fully set up yet?</p>
                    <p className="mt-1">
                      You can still try your work email first. If verification cannot start, send a company request from here and our team will review it.
                    </p>
                    <button
                      type="button"
                      onClick={openRequestCompanyForm}
                      className="mt-3 inline-flex text-sm font-semibold text-corp-blue hover:underline"
                    >
                      Request this company now
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="block font-inter text-sm text-corp-dark mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl font-inter outline-none focus:ring-2 focus:ring-corp-blue/30"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div>
                    <label className="block font-inter text-sm text-corp-dark mb-1">
                      Work Email *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-corp-gray" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl font-inter outline-none focus:ring-2 focus:ring-corp-blue/30"
                        placeholder={`you@${selectedCompany.domain || 'company.com'}`}
                      />
                    </div>
                  </div>
                </div>

                {user ? (
                  <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-slate-700">
                    <p className="font-medium text-slate-900">Signed in account</p>
                    <p className="mt-1">
                      Login email: <span className="font-medium">{user.loginEmail || user.email}</span>
                    </p>
                    <p className="mt-1">
                      Work email: <span className="font-medium">used only for employment verification</span>
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <p className="font-medium">Using a personal email for login?</p>
                    <p className="mt-1">
                      Create your account first, then verify your work email to unlock company deals.
                    </p>
                    <Link
                      to="/signup"
                      state={{
                        from: {
                          pathname: location.pathname,
                          search: location.search,
                        },
                      }}
                      className="mt-3 inline-flex text-sm font-medium text-amber-900 underline underline-offset-2"
                    >
                      Create account with personal email
                    </Link>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap items-center gap-4">
                      <button
                        onClick={handleSendCode}
                        disabled={isSending || !email}
                        className="btn-primary disabled:opacity-70"
                      >
                        {isSending ? 'Sending Code...' : 'Send Verification Code'}
                      </button>
                      {codeSent && (
                        <span className="text-sm text-green-600 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Your one-time code was sent to {email}
                        </span>
                      )}
                    </div>

                {devCode && (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
                    Dev one-time code: <strong>{devCode}</strong>
                  </div>
                )}

                {codeSent && (
                  <div className="mt-6">
                    <label className="block font-inter text-sm text-corp-dark mb-1">
                      Verification Code *
                    </label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl font-inter outline-none focus:ring-2 focus:ring-corp-blue/30"
                      placeholder="Enter the 6-digit verification code"
                    />
                    <div className="mt-4 flex flex-wrap items-center gap-4">
                      <button
                        onClick={handleVerify}
                        disabled={isVerifying || !code}
                        className="btn-primary disabled:opacity-70"
                      >
                        {isVerifying ? 'Verifying...' : 'Verify & Continue'}
                      </button>
                      <button
                        onClick={handleSendCode}
                        disabled={isSending}
                        className="btn-secondary"
                      >
                        Resend Code
                      </button>
                    </div>
                  </div>
                )}

                <p className="mt-4 text-xs text-slate-500">
                  We send a one-time verification code to your work email, and it stays valid for 10 minutes. Login and offer emails stay on your account email.
                </p>

                {error && (
                  <p className="mt-4 text-sm text-red-600">{error}</p>
                )}

                {showRequestCompanyForm && (
                  <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5 lg:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-montserrat text-lg font-bold text-corp-dark">
                          Request your company
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          If your employer is not fully available yet, submit this request and our team will review it.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowRequestCompanyForm(false)}
                        className="text-sm font-medium text-slate-500 transition hover:text-slate-800"
                      >
                        Hide
                      </button>
                    </div>

                    <form onSubmit={handleCompanyRequestSubmit} className="mt-5 grid gap-4 lg:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-1">
                          Company name
                        </label>
                        <input
                          type="text"
                          value={companyRequestForm.companyName}
                          onChange={(e) => handleCompanyRequestFieldChange('companyName', e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-corp-blue focus:ring-2 focus:ring-corp-blue/20"
                          placeholder="Your employer name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-1">
                          Your name
                        </label>
                        <input
                          type="text"
                          value={companyRequestForm.requesterName}
                          onChange={(e) => handleCompanyRequestFieldChange('requesterName', e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-corp-blue focus:ring-2 focus:ring-corp-blue/20"
                          placeholder="Jane Doe"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-1">
                          Work email
                        </label>
                        <input
                          type="email"
                          value={companyRequestForm.workEmail}
                          onChange={(e) => handleCompanyRequestFieldChange('workEmail', e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-corp-blue focus:ring-2 focus:ring-corp-blue/20"
                          placeholder="you@company.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-1">
                          City or region
                        </label>
                        <input
                          type="text"
                          value={companyRequestForm.city}
                          onChange={(e) => handleCompanyRequestFieldChange('city', e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-corp-blue focus:ring-2 focus:ring-corp-blue/20"
                          placeholder="Vancouver, BC"
                        />
                      </div>
                      <div className="lg:col-span-2">
                        <label className="block text-sm font-medium text-slate-900 mb-1">
                          Note
                        </label>
                        <textarea
                          rows={3}
                          value={companyRequestForm.note}
                          onChange={(e) => handleCompanyRequestFieldChange('note', e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-corp-blue focus:ring-2 focus:ring-corp-blue/20"
                          placeholder="Anything helpful for our team to know about your employer or work email domain."
                        />
                      </div>

                      {companyRequestError && (
                        <div className="lg:col-span-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                          {companyRequestError}
                        </div>
                      )}

                      {companyRequestSuccess && (
                        <div className="lg:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                          {companyRequestSuccess}
                        </div>
                      )}

                      <div className="lg:col-span-2 flex flex-wrap items-center gap-3">
                        <button
                          type="submit"
                          disabled={isSubmittingCompanyRequest}
                          className="btn-primary"
                        >
                          {isSubmittingCompanyRequest ? 'Sending request...' : 'Send company request'}
                        </button>
                        <p className="text-sm text-slate-500">
                          We use this only to review and verify new company requests.
                        </p>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && selectedCompany && (
              <div className="bg-white rounded-3xl shadow-card p-6 lg:p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="font-montserrat font-bold text-2xl text-corp-dark mb-2">
                  You're verified
                </h2>
                <p className="font-inter text-corp-gray mb-6">
                  You're verified. Redirecting to deals...
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    to={redirectTo || `/c/${selectedCompany.slug || selectedCompany.id}`}
                    className="btn-primary"
                  >
                    Browse Deals
                  </Link>
                  <Link to="/" className="btn-secondary">
                    Back to Home
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
      </div>
    </>
  );
};

export default VerifyEmployeePage;

