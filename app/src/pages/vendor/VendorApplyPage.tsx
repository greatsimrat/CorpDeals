import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Briefcase,
  Building2,
  CalendarRange,
  CheckCircle2,
  Clock3,
  Mail,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import api from '../../services/api';
import Seo from '../../components/Seo';
import { useAuth } from '../../hooks/useAuth';
import TurnstileWidget from '../../components/TurnstileWidget';

type FormState = {
  businessName: string;
  website: string;
  category: string;
  categoryOther: string;
  city: string;
  contactName: string;
  workEmail: string;
  phone: string;
  jobTitle: string;
  offerType: string;
  offerTypeOther: string;
  offerDescription: string;
  offerValidityStart: string;
  offerValidityEnd: string;
  notes: string;
};

type FieldName = keyof FormState | 'captcha';

const initialState: FormState = {
  businessName: '',
  website: '',
  category: '',
  categoryOther: '',
  city: '',
  contactName: '',
  workEmail: '',
  phone: '',
  jobTitle: '',
  offerType: '',
  offerTypeOther: '',
  offerDescription: '',
  offerValidityStart: '',
  offerValidityEnd: '',
  notes: '',
};

const partnerJourney = [
  { title: 'Apply', body: 'Tell us about your business, category, and the offer you want to pilot.' },
  { title: 'Review', body: 'We review fit, brand readiness, and campaign potential before confirming onboarding.' },
  { title: 'Go live', body: 'Approved partners are onboarded for upcoming campaign waves and launch windows.' },
];

const valueProps = [
  {
    title: 'Reach verified employees',
    body: 'Promote offers to working professionals in trusted company ecosystems.',
    icon: Users,
  },
  {
    title: 'Launch without heavy setup',
    body: 'Start with a lightweight partner application and a pilot-ready offer.',
    icon: Target,
  },
  {
    title: 'Track leads and campaign visibility',
    body: 'Get structured onboarding, campaign review, and partner support.',
    icon: BarChart3,
  },
];

const pilotCampaignTimeline = {
  title: 'Pilot campaign timeline',
  phases: [
    { label: 'Partner onboarding', window: 'April-May' },
    { label: 'Initial campaign wave', window: 'May-July' },
    { label: 'Extension', window: 'Based on fit and performance' },
  ],
  footnote: 'Update these windows in the timeline config when the pilot schedule changes.',
};

const trustPoints = [
  'Canada-based startup focused on curated partner onboarding',
  'Limited partner slots per category during pilot campaigns',
  'Selected partners are reviewed before launch',
  'Campaigns roll out in waves rather than all at once',
];

const faqItems = [
  {
    question: 'What happens after I apply?',
    answer: 'We review the business, offer fit, and campaign readiness, then follow up if your application is selected for an onboarding wave.',
  },
  {
    question: 'When do campaigns launch?',
    answer: 'Campaigns launch in planned waves. Approved partners are onboarded first, then scheduled into the next suitable pilot window.',
  },
  {
    question: 'Is there any upfront commitment?',
    answer: 'No immediate commitment is created by this form. We use the application to assess fit before any launch planning moves forward.',
  },
];

const categoryOptions = [
  'Telecom',
  'Fitness & Wellness',
  'Education & Tutoring',
  'Travel',
  'Finance & Insurance',
  'Automotive',
  'Food & Beverage',
  'Family & Kids',
  'Local Services',
  'Other',
];

const offerTypeOptions = [
  'Employee discount',
  'Exclusive pricing',
  'Limited-time promotion',
  'Lead-based partnership',
  'Event participation',
  'Other',
];

const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() || '';
const personalEmailDomains = new Set([
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'icloud.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
  'pm.me',
  'gmx.com',
]);

const normalizePhone = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const hasPlusPrefix = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return digits ? `${hasPlusPrefix ? '+' : ''}${digits}` : '';
};

const isValidWebsite = (value: string) => {
  if (!value.trim()) return false;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const validateForm = (form: FormState, requireCaptcha: boolean, captchaToken: string) => {
  const nextErrors: Partial<Record<FieldName, string>> = {};

  if (form.businessName.trim().length < 2) nextErrors.businessName = 'Business name is required';
  else if (form.businessName.trim().length > 100) nextErrors.businessName = 'Business name must be 100 characters or less';

  if (!isValidWebsite(form.website)) nextErrors.website = 'Enter a valid website URL';
  else if (form.website.trim().length > 200) nextErrors.website = 'Website must be 200 characters or less';

  if (!form.category) nextErrors.category = 'Select a category';
  if (form.category === 'Other' && form.categoryOther.trim().length < 2) nextErrors.categoryOther = 'Please specify your category';
  else if (form.categoryOther.trim().length > 80) nextErrors.categoryOther = 'Category detail must be 80 characters or less';

  if (form.city.trim().length < 2) nextErrors.city = 'City or region is required';
  else if (form.city.trim().length > 100) nextErrors.city = 'City or region must be 100 characters or less';

  if (form.contactName.trim().length < 2) nextErrors.contactName = 'Contact name is required';
  else if (form.contactName.trim().length > 80) nextErrors.contactName = 'Contact name must be 80 characters or less';

  if (form.jobTitle.trim().length < 2) nextErrors.jobTitle = 'Job title is required';
  else if (form.jobTitle.trim().length > 80) nextErrors.jobTitle = 'Job title must be 80 characters or less';

  const email = form.workEmail.trim().toLowerCase();
  if (!email) nextErrors.workEmail = 'Work email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.workEmail = 'Enter a valid work email';
  else if (personalEmailDomains.has(email.split('@')[1] || '')) nextErrors.workEmail = 'Use your business email address';

  const phone = normalizePhone(form.phone);
  if (!phone) nextErrors.phone = 'Phone is required';
  else if (!/^\+?\d{10,15}$/.test(phone)) nextErrors.phone = 'Enter a valid phone number';

  if (!form.offerType) nextErrors.offerType = 'Select a type of offer';
  if (form.offerType === 'Other' && form.offerTypeOther.trim().length < 2) nextErrors.offerTypeOther = 'Please specify the type of offer';
  else if (form.offerTypeOther.trim().length > 80) nextErrors.offerTypeOther = 'Offer type detail must be 80 characters or less';

  if (!form.offerDescription.trim()) nextErrors.offerDescription = 'Briefly describe the offer you want to launch';
  else if (form.offerDescription.trim().length < 10) nextErrors.offerDescription = 'Add a short description so we can review the offer fit';
  else if (form.offerDescription.trim().length > 500) nextErrors.offerDescription = 'Offer description must be 500 characters or less';

  if (form.offerValidityStart && !/^\d{4}-\d{2}-\d{2}$/.test(form.offerValidityStart)) nextErrors.offerValidityStart = 'Enter a valid start date';
  if (form.offerValidityEnd && !/^\d{4}-\d{2}-\d{2}$/.test(form.offerValidityEnd)) nextErrors.offerValidityEnd = 'Enter a valid end date';
  else if (
    form.offerValidityStart &&
    form.offerValidityEnd &&
    new Date(`${form.offerValidityEnd}T00:00:00.000Z`) < new Date(`${form.offerValidityStart}T00:00:00.000Z`)
  ) {
    nextErrors.offerValidityEnd = 'Offer validity end date cannot be before the start date';
  }

  if (form.notes.trim().length > 1000) nextErrors.notes = 'Additional notes must be 1000 characters or less';
  if (requireCaptcha && !captchaToken.trim()) nextErrors.captcha = 'Please complete the captcha';

  return nextErrors;
};

export default function VendorApplyPage() {
  const { user, hasVendorAccess } = useAuth();
  const [form, setForm] = useState<FormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [requestId, setRequestId] = useState('');
  const [error, setError] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});

  useEffect(() => {
    setForm((prev) => ({ ...prev, contactName: prev.contactName || user?.name || '' }));
  }, [user?.name]);

  const applicationState = String(user?.vendor?.status || '').toUpperCase();
  const showApprovedState = hasVendorAccess;
  const showPendingState = !showApprovedState && applicationState === 'PENDING';
  const showRejectedState = !showApprovedState && applicationState === 'REJECTED';

  const accountEmailLabel = useMemo(
    () => user?.loginEmail || user?.email || 'your CorpDeals account',
    [user?.email, user?.loginEmail]
  );

  const getFieldClassName = (field: FieldName) =>
    `mt-1 w-full rounded-2xl border px-4 py-3 outline-none transition ${
      fieldErrors[field]
        ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'
        : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
    }`;

  const getFieldDescribedBy = (field: FieldName, hintId?: string) => {
    const ids = [hintId, fieldErrors[field] ? `${field}-error` : ''].filter(Boolean);
    return ids.length ? ids.join(' ') : undefined;
  };

  const onChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value } as FormState;
      if (name === 'category' && value !== 'Other') next.categoryOther = '';
      if (name === 'offerType' && value !== 'Other') next.offerTypeOther = '';
      return next;
    });
    setError('');
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextFieldErrors = validateForm(form, Boolean(turnstileSiteKey), captchaToken);
    setFieldErrors(nextFieldErrors);
    if (Object.values(nextFieldErrors).some(Boolean)) return;

    setIsSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      const result = await api.submitVendorApplication({
        businessName: form.businessName,
        website: form.website,
        category: form.category,
        categoryOther: form.category === 'Other' ? form.categoryOther : '',
        city: form.city,
        contactName: form.contactName,
        contactEmail: user?.loginEmail || user?.email || form.workEmail,
        businessEmail: form.workEmail,
        phone: form.phone,
        jobTitle: form.jobTitle,
        offerType: form.offerType,
        offerTypeOther: form.offerType === 'Other' ? form.offerTypeOther : '',
        offerDescription: form.offerDescription,
        offerValidityStart: form.offerValidityStart || undefined,
        offerValidityEnd: form.offerValidityEnd || undefined,
        notes: form.notes,
        captchaToken,
      });
      setSuccessMessage(
        result.message ||
          'We review applications for fit, category relevance, and campaign readiness. Selected partners are contacted for the next onboarding wave.'
      );
      setRequestId(result.requestId || '');
      setCaptchaToken('');
      setFieldErrors({});
      setForm((prev) => ({ ...initialState, contactName: prev.contactName }));
    } catch (err: any) {
      setError(err.message || 'Failed to submit partner application');
      if (err?.responseBody?.fieldErrors) setFieldErrors(err.responseBody.fieldErrors);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Seo
        title="Vendor Onboarding | CorpDeals"
        description="Apply to become a CorpDeals launch partner and reach verified employee audiences through curated offers, targeted campaigns, and structured onboarding."
        keywords="vendor onboarding, partner application, employee offer partner, corpdeals launch partner"
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
                  <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900">Your partner workspace is live</h1>
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
                if your business is selected for an onboarding wave or if we need more information.
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
                  Partner acquisition
                </span>
                <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                  Get your offers in front of verified employee audiences across Vancouver workplaces
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                  CorpDeals helps brands and service providers generate qualified demand from verified employee audiences
                  through curated offers, targeted campaigns, and structured partner onboarding.
                </p>

                {user ? (
                  <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-slate-700">
                    <p className="font-semibold text-slate-900">Applying with your current account</p>
                    <p className="mt-1">
                      Account email: <span className="font-medium">{accountEmailLabel}</span>
                    </p>
                    <p className="mt-1">
                      Use the form to provide the work email and offer details you want reviewed for the next partner wave.
                    </p>
                  </div>
                ) : null}

                {showRejectedState ? (
                  <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                    Your previous application was not approved. Submit an updated application with clearer business and offer details.
                  </div>
                ) : null}

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  {valueProps.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <Icon className="h-5 w-5 text-blue-700" />
                        <p className="mt-3 text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                      </div>
                    );
                  })}
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

                <div className="mt-10 grid gap-4 xl:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                      <CalendarRange className="h-4 w-4 text-blue-700" />
                      {pilotCampaignTimeline.title}
                    </div>
                    <ul className="mt-4 space-y-3">
                      {pilotCampaignTimeline.phases.map((phase) => (
                        <li key={phase.label} className="flex items-start justify-between gap-4 text-sm text-slate-700">
                          <span className="font-medium text-slate-900">{phase.label}</span>
                          <span className="text-right text-slate-600">{phase.window}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-4 text-xs leading-5 text-slate-500">{pilotCampaignTimeline.footnote}</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                      <ShieldCheck className="h-4 w-4 text-blue-700" />
                      Trust and expectations
                    </div>
                    <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                      {trustPoints.map((item) => (
                        <li key={item} className="flex gap-3">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <Clock3 className="h-4 w-4 text-blue-700" />
                    Frequently asked
                  </div>
                  <div className="mt-4 space-y-4">
                    {faqItems.map((item) => (
                      <div key={item.question} className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-slate-900">{item.question}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{item.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/70">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Partner application</p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-900">Apply to become a launch partner</h2>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                      Share the essentials so we can review fit, campaign relevance, and launch readiness without slowing you down.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                    Takes about 3 minutes
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
                              setCaptchaToken('');
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

                {!successMessage ? (
                  <form onSubmit={onSubmit} className="mt-6 space-y-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">1. Business details</h3>
                      </div>
                      <label htmlFor="businessName" className="block text-sm font-medium text-slate-700">
                        Business name
                        <input
                          id="businessName"
                          required
                          name="businessName"
                          value={form.businessName}
                          onChange={onChange}
                          placeholder="TELUS Business"
                          aria-invalid={Boolean(fieldErrors.businessName)}
                          aria-describedby={getFieldDescribedBy('businessName')}
                          className={getFieldClassName('businessName')}
                        />
                        {fieldErrors.businessName ? <p id="businessName-error" className="mt-2 text-xs text-red-600">{fieldErrors.businessName}</p> : null}
                      </label>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <label htmlFor="website" className="block text-sm font-medium text-slate-700">
                          Website
                          <input
                            id="website"
                            required
                            name="website"
                            value={form.website}
                            onChange={onChange}
                            placeholder="https://yourcompany.com"
                            aria-invalid={Boolean(fieldErrors.website)}
                            aria-describedby={getFieldDescribedBy('website')}
                            className={getFieldClassName('website')}
                          />
                          {fieldErrors.website ? <p id="website-error" className="mt-2 text-xs text-red-600">{fieldErrors.website}</p> : null}
                        </label>

                        <label htmlFor="category" className="block text-sm font-medium text-slate-700">
                          Category
                          <select
                            id="category"
                            required
                            name="category"
                            value={form.category}
                            onChange={onChange}
                            aria-invalid={Boolean(fieldErrors.category)}
                            aria-describedby={getFieldDescribedBy('category')}
                            className={getFieldClassName('category')}
                          >
                            <option value="">Select a category</option>
                            {categoryOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                          {fieldErrors.category ? <p id="category-error" className="mt-2 text-xs text-red-600">{fieldErrors.category}</p> : null}
                        </label>
                      </div>

                      {form.category === 'Other' ? (
                        <label htmlFor="categoryOther" className="block text-sm font-medium text-slate-700">
                          Please specify
                          <input
                            id="categoryOther"
                            name="categoryOther"
                            value={form.categoryOther}
                            onChange={onChange}
                            placeholder="e.g. Childcare services"
                            aria-invalid={Boolean(fieldErrors.categoryOther)}
                            aria-describedby={getFieldDescribedBy('categoryOther')}
                            className={getFieldClassName('categoryOther')}
                          />
                          {fieldErrors.categoryOther ? <p id="categoryOther-error" className="mt-2 text-xs text-red-600">{fieldErrors.categoryOther}</p> : null}
                        </label>
                      ) : null}

                      <label htmlFor="city" className="block text-sm font-medium text-slate-700">
                        City or region
                        <input
                          id="city"
                          required
                          name="city"
                          value={form.city}
                          onChange={onChange}
                          placeholder="Vancouver, BC"
                          aria-invalid={Boolean(fieldErrors.city)}
                          aria-describedby={getFieldDescribedBy('city')}
                          className={getFieldClassName('city')}
                        />
                        {fieldErrors.city ? <p id="city-error" className="mt-2 text-xs text-red-600">{fieldErrors.city}</p> : null}
                      </label>
                    </div>

                    <div className="space-y-4 border-t border-slate-200 pt-6">
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">2. Contact details</h3>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <label htmlFor="contactName" className="block text-sm font-medium text-slate-700">
                          Contact name
                          <input
                            id="contactName"
                            required
                            name="contactName"
                            value={form.contactName}
                            onChange={onChange}
                            placeholder="Jordan Lee"
                            aria-invalid={Boolean(fieldErrors.contactName)}
                            aria-describedby={getFieldDescribedBy('contactName')}
                            className={getFieldClassName('contactName')}
                          />
                          {fieldErrors.contactName ? <p id="contactName-error" className="mt-2 text-xs text-red-600">{fieldErrors.contactName}</p> : null}
                        </label>

                        <label htmlFor="jobTitle" className="block text-sm font-medium text-slate-700">
                          Job title
                          <input
                            id="jobTitle"
                            required
                            name="jobTitle"
                            value={form.jobTitle}
                            onChange={onChange}
                            placeholder="Partnerships Manager"
                            aria-invalid={Boolean(fieldErrors.jobTitle)}
                            aria-describedby={getFieldDescribedBy('jobTitle')}
                            className={getFieldClassName('jobTitle')}
                          />
                          {fieldErrors.jobTitle ? <p id="jobTitle-error" className="mt-2 text-xs text-red-600">{fieldErrors.jobTitle}</p> : null}
                        </label>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <label htmlFor="workEmail" className="block text-sm font-medium text-slate-700">
                          Work email
                          <div className="relative mt-1">
                            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                              id="workEmail"
                              required
                              type="email"
                              name="workEmail"
                              value={form.workEmail}
                              onChange={onChange}
                              placeholder="name@company.com"
                              aria-invalid={Boolean(fieldErrors.workEmail)}
                              aria-describedby={getFieldDescribedBy('workEmail', 'workEmail-hint')}
                              className={`${getFieldClassName('workEmail')} pl-11`}
                            />
                          </div>
                          <p id="workEmail-hint" className="mt-2 text-xs text-slate-500">
                            We use this to confirm you represent the business.
                            {user ? ' Your CorpDeals login stays the same.' : ' This also becomes your initial contact email for review.'}
                          </p>
                          {fieldErrors.workEmail ? <p id="workEmail-error" className="mt-2 text-xs text-red-600">{fieldErrors.workEmail}</p> : null}
                        </label>

                        <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
                          Phone
                          <input
                            id="phone"
                            required
                            name="phone"
                            inputMode="tel"
                            value={form.phone}
                            onChange={onChange}
                            placeholder="+1 604 555 0123"
                            aria-invalid={Boolean(fieldErrors.phone)}
                            aria-describedby={getFieldDescribedBy('phone')}
                            className={getFieldClassName('phone')}
                          />
                          {fieldErrors.phone ? <p id="phone-error" className="mt-2 text-xs text-red-600">{fieldErrors.phone}</p> : null}
                        </label>
                      </div>
                    </div>

                    <div className="space-y-4 border-t border-slate-200 pt-6">
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">3. Offer details</h3>
                      </div>

                      <label htmlFor="offerType" className="block text-sm font-medium text-slate-700">
                        Type of offer
                        <select
                          id="offerType"
                          required
                          name="offerType"
                          value={form.offerType}
                          onChange={onChange}
                          aria-invalid={Boolean(fieldErrors.offerType)}
                          aria-describedby={getFieldDescribedBy('offerType')}
                          className={getFieldClassName('offerType')}
                        >
                          <option value="">Select a type of offer</option>
                          {offerTypeOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        {fieldErrors.offerType ? <p id="offerType-error" className="mt-2 text-xs text-red-600">{fieldErrors.offerType}</p> : null}
                      </label>

                      {form.offerType === 'Other' ? (
                        <label htmlFor="offerTypeOther" className="block text-sm font-medium text-slate-700">
                          Please specify
                          <input
                            id="offerTypeOther"
                            name="offerTypeOther"
                            value={form.offerTypeOther}
                            onChange={onChange}
                            placeholder="e.g. Employer referral program"
                            aria-invalid={Boolean(fieldErrors.offerTypeOther)}
                            aria-describedby={getFieldDescribedBy('offerTypeOther')}
                            className={getFieldClassName('offerTypeOther')}
                          />
                          {fieldErrors.offerTypeOther ? <p id="offerTypeOther-error" className="mt-2 text-xs text-red-600">{fieldErrors.offerTypeOther}</p> : null}
                        </label>
                      ) : null}

                      <label htmlFor="offerDescription" className="block text-sm font-medium text-slate-700">
                        Short description of offer
                        <textarea
                          id="offerDescription"
                          required
                          name="offerDescription"
                          value={form.offerDescription}
                          onChange={onChange}
                          rows={4}
                          placeholder="e.g. Exclusive mobile plan for employee audiences"
                          aria-invalid={Boolean(fieldErrors.offerDescription)}
                          aria-describedby={getFieldDescribedBy('offerDescription')}
                          className={getFieldClassName('offerDescription')}
                        />
                        {fieldErrors.offerDescription ? <p id="offerDescription-error" className="mt-2 text-xs text-red-600">{fieldErrors.offerDescription}</p> : null}
                      </label>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <label htmlFor="offerValidityStart" className="block text-sm font-medium text-slate-700">
                          Offer validity start date <span className="font-normal text-slate-500">(optional)</span>
                          <input
                            id="offerValidityStart"
                            type="date"
                            name="offerValidityStart"
                            value={form.offerValidityStart}
                            onChange={onChange}
                            aria-invalid={Boolean(fieldErrors.offerValidityStart)}
                            aria-describedby={getFieldDescribedBy('offerValidityStart')}
                            className={getFieldClassName('offerValidityStart')}
                          />
                          {fieldErrors.offerValidityStart ? <p id="offerValidityStart-error" className="mt-2 text-xs text-red-600">{fieldErrors.offerValidityStart}</p> : null}
                        </label>

                        <label htmlFor="offerValidityEnd" className="block text-sm font-medium text-slate-700">
                          Offer validity end date <span className="font-normal text-slate-500">(optional)</span>
                          <input
                            id="offerValidityEnd"
                            type="date"
                            name="offerValidityEnd"
                            value={form.offerValidityEnd}
                            onChange={onChange}
                            aria-invalid={Boolean(fieldErrors.offerValidityEnd)}
                            aria-describedby={getFieldDescribedBy('offerValidityEnd')}
                            className={getFieldClassName('offerValidityEnd')}
                          />
                          {fieldErrors.offerValidityEnd ? <p id="offerValidityEnd-error" className="mt-2 text-xs text-red-600">{fieldErrors.offerValidityEnd}</p> : null}
                        </label>
                      </div>
                    </div>

                    <div className="space-y-4 border-t border-slate-200 pt-6">
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">4. Additional context</h3>
                      </div>
                      <label htmlFor="notes" className="block text-sm font-medium text-slate-700">
                        Additional notes <span className="font-normal text-slate-500">(optional)</span>
                        <textarea
                          id="notes"
                          name="notes"
                          value={form.notes}
                          onChange={onChange}
                          rows={3}
                          placeholder="Anything we should know about your pilot readiness, audience fit, or internal timelines?"
                          aria-invalid={Boolean(fieldErrors.notes)}
                          aria-describedby={getFieldDescribedBy('notes')}
                          className={getFieldClassName('notes')}
                        />
                        {fieldErrors.notes ? <p id="notes-error" className="mt-2 text-xs text-red-600">{fieldErrors.notes}</p> : null}
                      </label>
                    </div>

                    {turnstileSiteKey ? (
                      <div className="space-y-2 border-t border-slate-200 pt-6">
                        <TurnstileWidget
                          siteKey={turnstileSiteKey}
                          onVerify={(token) => {
                            setCaptchaToken(token);
                            setFieldErrors((prev) => ({ ...prev, captcha: '' }));
                          }}
                          onExpire={() => setCaptchaToken('')}
                        />
                        {fieldErrors.captcha ? <p id="captcha-error" className="text-xs text-red-600">{fieldErrors.captcha}</p> : null}
                      </div>
                    ) : null}

                    <div className="border-t border-slate-200 pt-6">
                      <p className="mb-4 text-sm leading-6 text-slate-600">
                        We review applications for fit, category relevance, and campaign readiness. Selected partners will
                        be contacted for the next onboarding wave.
                      </p>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                      >
                        {isSubmitting ? 'Submitting application...' : 'Apply to become a launch partner'}
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </form>
                ) : null}
              </section>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
