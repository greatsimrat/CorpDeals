import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Briefcase, Building2, CheckCircle2, Mail, Sparkles } from 'lucide-react';
import api from '../../services/api';
import Seo from '../../components/Seo';
import { useAuth } from '../../hooks/useAuth';

type FormState = {
  businessName: string;
  website: string;
  category: string;
  city: string;
  contactName: string;
  contactEmail: string;
  businessEmail: string;
  phone: string;
  jobTitle: string;
  targetCompanies: string;
  offerSummary: string;
  notes: string;
};

const initialState: FormState = {
  businessName: '',
  website: '',
  category: '',
  city: '',
  contactName: '',
  contactEmail: '',
  businessEmail: '',
  phone: '',
  jobTitle: '',
  targetCompanies: '',
  offerSummary: '',
  notes: '',
};

const partnerJourney = [
  {
    title: 'Apply',
    body: 'Tell us about your company, your contact details, and the kind of employee offer you want to run.',
  },
  {
    title: 'Review',
    body: 'We review fit, contact details, and compliance readiness before giving your team partner access.',
  },
  {
    title: 'Launch',
    body: 'Create your first offer, submit it for approval, and start receiving verified employee leads.',
  },
];

const valueProps = [
  'Reach verified employee audiences by company',
  'Launch lead-based offers without building a custom portal',
  'Track applications, lead quality, and billing from one workspace',
];

export default function VendorApplyPage() {
  const { user, hasVendorAccess } = useAuth();
  const [form, setForm] = useState<FormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [requestId, setRequestId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      contactName: prev.contactName || user?.name || '',
      contactEmail: prev.contactEmail || user?.loginEmail || user?.email || '',
    }));
  }, [user?.email, user?.loginEmail, user?.name]);

  const applicationState = String(user?.vendor?.status || '').toUpperCase();
  const showApprovedState = hasVendorAccess;
  const showPendingState = !showApprovedState && applicationState === 'PENDING';
  const showRejectedState = !showApprovedState && applicationState === 'REJECTED';

  const accountEmailLabel = useMemo(
    () => user?.loginEmail || user?.email || 'your CorpDeals account',
    [user?.email, user?.loginEmail]
  );

  const onChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
    setError('');
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      const result = await api.submitVendorApplication(form);
      setSuccessMessage("We'll review your partner application and follow up within 1-2 business days.");
      setRequestId(result.requestId || '');
      setForm((prev) => ({
        ...initialState,
        contactName: prev.contactName,
        contactEmail: prev.contactEmail,
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to submit partner application');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Seo
        title="Be Our Partner | CorpDeals"
        description="Apply to become a CorpDeals partner, get approved for the vendor workspace, and launch employee offers to verified company audiences."
        keywords="be our partner, vendor partner application, employee perks partner, corpdeals vendor onboarding"
        path="/vendor/apply"
      />
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_40%),linear-gradient(180deg,_#f8fafc_0%,_#eef4ff_45%,_#f8fafc_100%)] py-10">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
              <Building2 className="h-4 w-4" />
              Back to CorpDeals
            </Link>
            <Link to="/vendor/login" className="text-sm font-medium text-blue-700 hover:text-blue-900">
              Already approved? Vendor login
            </Link>
          </div>

          {showApprovedState ? (
            <div className="rounded-3xl border border-emerald-200 bg-white/90 p-8 shadow-xl shadow-emerald-100/50">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div className="max-w-2xl">
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    <BadgeCheck className="h-4 w-4" />
                    Partner Approved
                  </span>
                  <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900">
                    Your partner workspace is live
                  </h1>
                  <p className="mt-3 text-base leading-7 text-slate-600">
                    Use your CorpDeals account at <span className="font-semibold text-slate-900">{accountEmailLabel}</span> to
                    manage offers, review leads, and track billing from the vendor dashboard.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <Link
                    to="/vendor/dashboard"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Open Vendor Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/vendor/offers/new"
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Create First Offer
                  </Link>
                </div>
              </div>
            </div>
          ) : showPendingState ? (
            <div className="rounded-3xl border border-amber-200 bg-white/90 p-8 shadow-xl shadow-amber-100/40">
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                <Sparkles className="h-4 w-4" />
                Application In Review
              </span>
              <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900">Your partner application is under review</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                We already have your submission. We will follow up using <span className="font-semibold text-slate-900">{accountEmailLabel}</span>{' '}
                once your workspace is approved or if we need more details.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/vendor/login"
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Go to Vendor Login
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
              <section className="rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-xl shadow-blue-100/40 backdrop-blur">
                <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                  <Briefcase className="h-4 w-4" />
                  Partner Growth
                </span>
                <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                  Be our partner and reach verified employee audiences
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                  CorpDeals helps vendors launch employee offers, manage lead flow, and operate from a clean partner
                  workspace. Apply once, get approved, then run offers with full visibility.
                </p>

                {user ? (
                  <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-slate-700">
                    <p className="font-semibold text-slate-900">Applying with your current account</p>
                    <p className="mt-1">
                      Contact email: <span className="font-medium">{accountEmailLabel}</span>
                    </p>
                    <p className="mt-1">
                      Your business email is collected separately for partner verification and operations.
                    </p>
                  </div>
                ) : null}

                {showRejectedState ? (
                  <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                    Your previous application was not approved. Submit an updated application with clearer company and offer details.
                  </div>
                ) : null}

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  {valueProps.map((item) => (
                    <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700">
                      {item}
                    </div>
                  ))}
                </div>

                <div className="mt-10">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">How the partner journey works</h2>
                  <div className="mt-4 space-y-4">
                    {partnerJourney.map((step, index) => (
                      <div key={step.title} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-base font-semibold text-slate-900">{step.title}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{step.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/70">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Partner application</p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-900">Start your onboarding</h2>
                  </div>
                  <div className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                    Takes about 2 minutes
                  </div>
                </div>

                {successMessage ? (
                  <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                      <div>
                        <p className="font-semibold">Application received</p>
                        <p className="mt-1 text-sm leading-6">{successMessage}</p>
                        {requestId ? <p className="mt-2 text-xs text-emerald-800">Request ID: {requestId}</p> : null}
                        <div className="mt-4 flex flex-wrap gap-3">
                          <Link
                            to="/vendor/login"
                            className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
                          >
                            Vendor login
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setSuccessMessage('');
                              setRequestId('');
                            }}
                            className="rounded-xl border border-transparent px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
                          >
                            Submit another application
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {error ? (
                  <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                <form onSubmit={onSubmit} className="mt-6 space-y-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">1. Company details</h3>
                    </div>
                    <label className="block text-sm font-medium text-slate-700">
                      Business name
                      <input
                        required
                        name="businessName"
                        value={form.businessName}
                        onChange={onChange}
                        className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </label>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Website
                        <input
                          name="website"
                          value={form.website}
                          onChange={onChange}
                          placeholder="https://example.com"
                          className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                      </label>
                      <label className="block text-sm font-medium text-slate-700">
                        Category
                        <input
                          name="category"
                          value={form.category}
                          onChange={onChange}
                          placeholder="Travel, telecom, auto, finance"
                          className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                      </label>
                    </div>
                    <label className="block text-sm font-medium text-slate-700">
                      City or region
                      <input
                        name="city"
                        value={form.city}
                        onChange={onChange}
                        className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </label>
                  </div>

                  <div className="space-y-4 border-t border-slate-200 pt-6">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">2. Contact and verification</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Contact name
                        <input
                          required
                          name="contactName"
                          value={form.contactName}
                          onChange={onChange}
                          className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                      </label>
                      <label className="block text-sm font-medium text-slate-700">
                        Job title
                        <input
                          name="jobTitle"
                          value={form.jobTitle}
                          onChange={onChange}
                          placeholder="Partnerships Manager"
                          className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                      </label>
                    </div>
                    <label className="block text-sm font-medium text-slate-700">
                      Contact email
                      <div className="relative mt-1">
                        <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          required
                          type="email"
                          name="contactEmail"
                          value={form.contactEmail}
                          onChange={onChange}
                          className="w-full rounded-2xl border border-slate-300 py-3 pl-11 pr-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        This is the account email for updates, sign-in, and partner workspace access.
                      </p>
                    </label>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Business email
                        <input
                          required
                          type="email"
                          name="businessEmail"
                          value={form.businessEmail}
                          onChange={onChange}
                          placeholder="you@yourcompany.com"
                          className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                      </label>
                      <label className="block text-sm font-medium text-slate-700">
                        Phone
                        <input
                          name="phone"
                          value={form.phone}
                          onChange={onChange}
                          className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-4 border-t border-slate-200 pt-6">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">3. Offer fit</h3>
                    </div>
                    <label className="block text-sm font-medium text-slate-700">
                      Target companies or audience
                      <input
                        name="targetCompanies"
                        value={form.targetCompanies}
                        onChange={onChange}
                        placeholder="Amazon, Telus, BC Hydro"
                        className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                      Offer summary
                      <textarea
                        name="offerSummary"
                        value={form.offerSummary}
                        onChange={onChange}
                        rows={4}
                        placeholder="Describe the employee offer or lead experience you want to launch."
                        className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                      Additional notes
                      <textarea
                        name="notes"
                        value={form.notes}
                        onChange={onChange}
                        rows={3}
                        placeholder="Anything we should know about your company, launch timing, or compliance needs?"
                        className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {isSubmitting ? 'Submitting application...' : 'Submit partner application'}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              </section>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
