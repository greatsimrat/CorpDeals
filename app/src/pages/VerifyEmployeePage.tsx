import { useEffect, useMemo, useState } from 'react';
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
import { useAuth } from '../context/AuthContext';
import Seo from '../components/Seo';

interface CompanySummary {
  id: string;
  slug: string;
  name: string;
  domain?: string | null;
  logo?: string | null;
  verified?: boolean;
}

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

  const filteredCompanies = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return companies;
    return companies.filter((company) => {
      return (
        company.name.toLowerCase().includes(query) ||
        (company.domain || '').toLowerCase().includes(query)
      );
    });
  }, [companies, searchQuery]);

  const handleSelectCompany = (company: CompanySummary) => {
    setSelectedCompany(company);
    setStep(2);
    setError('');
    setCode('');
    setCodeSent(false);
    setDevCode(null);
    setVerificationId('');
  };

  const handleSendCode = async () => {
    if (!selectedCompany) return;
    setError('');
    setIsSending(true);
    try {
      const result = await api.startVerification({
        companyId: selectedCompany.slug || selectedCompany.id,
        workEmail: email,
      });
      setVerificationId(result.verificationId);
      setCodeSent(true);
      setDevCode(result.devCode || null);
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
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
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-corp-gray hover:text-corp-blue transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-inter text-sm">Back</span>
            </button>
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
                <h2 className="font-montserrat font-bold text-xl text-corp-dark mb-4">
                  Step 1: Choose your company
                </h2>
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-corp-gray" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search company name or domain"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl font-inter outline-none focus:ring-2 focus:ring-corp-blue/30"
                  />
                </div>
                {isLoadingCompanies && (
                  <div className="flex items-center gap-2 text-corp-gray">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading companies...
                  </div>
                )}
                {companyError && (
                  <p className="text-sm text-red-600">{companyError}</p>
                )}
                {!isLoadingCompanies && !companyError && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredCompanies.map((company) => (
                      <button
                        key={company.id}
                        onClick={() => handleSelectCompany(company)}
                        className="text-left border border-gray-200 rounded-2xl p-4 hover:border-corp-blue/40 hover:shadow-card transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-corp-highlight flex items-center justify-center text-corp-blue font-bold">
                            <Building2 className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-montserrat font-bold text-corp-dark">{company.name}</p>
                            <p className="text-sm text-corp-gray">{company.domain || 'Domain not listed'}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                    {filteredCompanies.length === 0 && (
                      <p className="text-sm text-corp-gray">No companies match your search.</p>
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
                      <p className="text-xs text-slate-600">{selectedCompany.domain || 'Work domain required'}</p>
                    </div>
                  </div>
                </div>

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
                      Code sent to {email}
                    </span>
                  )}
                </div>

                {devCode && (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
                    Dev code: <strong>{devCode}</strong>
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
                      placeholder="Enter the 6-digit code"
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
                  We'll never email your employer. We only verify your domain.
                </p>

                {error && (
                  <p className="mt-4 text-sm text-red-600">{error}</p>
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
