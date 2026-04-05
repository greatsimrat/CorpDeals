import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Building2, CheckCircle2, Mail, Sparkles } from 'lucide-react';
import api from '../../services/api';
import Seo from '../../components/Seo';
import { useAuth } from '../../hooks/useAuth';

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
  notes: string;
};

type FieldName = keyof FormState;

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
  notes: '',
};

const highlightCards = [
  ['Reach verified employee audiences', 'Share your business with verified working professionals through company-facing offers.'],
  ['Manage offers in one place', 'Approved partners can add, update, and manage deal details from the vendor workspace.'],
  ['Keep onboarding simple', 'Start with a short application and continue with offer setup after approval.'],
] as const;

const categoryOptions = ['Telecom', 'Fitness & Wellness', 'Education & Tutoring', 'Travel', 'Finance & Insurance', 'Automotive', 'Food & Beverage', 'Family & Kids', 'Local Services', 'Other'];
const personalEmailDomains = new Set(['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 'icloud.com', 'aol.com', 'proton.me', 'protonmail.com', 'pm.me', 'gmx.com']);

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

const validateForm = (form: FormState) => {
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

  if (form.notes.trim().length > 1000) nextErrors.notes = 'Additional notes must be 1000 characters or less';

  return nextErrors;
};

const SectionHeading = ({ number, title }: { number: string; title: string }) => (
  <div className="flex items-center gap-3">
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">{number}</div>
    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</h3>
  </div>
);

export default function VendorApplyPage() {
  const { user, hasVendorAccess } = useAuth();
  const [form, setForm] = useState<FormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [requestId, setRequestId] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});

  useEffect(() => {
    setForm((prev) => ({ ...prev, contactName: prev.contactName || user?.name || '' }));
  }, [user?.name]);

  const applicationState = String(user?.vendor?.status || '').toUpperCase();
  const showApprovedState = hasVendorAccess;
  const showPendingState = !showApprovedState && applicationState === 'PENDING';
  const showRejectedState = !showApprovedState && applicationState === 'REJECTED';
  const accountEmailLabel = useMemo(() => user?.loginEmail || user?.email || 'your CorpDeals account', [user?.email, user?.loginEmail]);

  const getFieldClassName = (field: FieldName) =>
    `mt-2 w-full rounded-2xl border px-4 py-3 text-sm text-slate-900 outline-none transition ${
      fieldErrors[field]
        ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-4 focus:ring-red-100'
        : 'border-slate-200 bg-slate-50 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100'
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
      return next;
    });
    setError('');
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextFieldErrors = validateForm(form);
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
        notes: form.notes,
      });
      setSuccessMessage(result.message || 'Thanks. We have your company details and will follow up if there is a fit.');
      setRequestId(result.requestId || '');
      setFieldErrors({});
      setForm((prev) => ({ ...initialState, contactName: prev.contactName }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit partner application';
      setError(message);
      const responseBody =
        typeof err === 'object' && err !== null && 'responseBody' in err
          ? (err as { responseBody?: { fieldErrors?: Partial<Record<FieldName, string>> } }).responseBody
          : undefined;
      if (responseBody?.fieldErrors) setFieldErrors(responseBody.fieldErrors);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showApprovedState) {
    return (
      <>
        <Seo title="Vendor Onboarding | CorpDeals" description="Vendor workspace access for approved CorpDeals partners." path="/vendor/apply" />
        <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl rounded-[2rem] border border-emerald-200 bg-white p-8 shadow-xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              <BadgeCheck className="h-4 w-4" />
              Partner approved
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900">Your partner workspace is live</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Use your CorpDeals account at <span className="font-semibold text-slate-900">{accountEmailLabel}</span> to manage offers and review leads from the vendor dashboard.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/vendor/dashboard" className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                Open vendor dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/vendor/offers/new" className="inline-flex items-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Create first offer
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Vendor Onboarding | CorpDeals" description="Apply to join the CorpDeals partner roster. Share your business and contact details for review." keywords="vendor onboarding, partner application, employee offer partner, corpdeals launch partner" path="/vendor/apply" />
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.14),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.08),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#eff6ff_46%,_#f8fafc_100%)] py-8 sm:py-10">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
              <Building2 className="h-4 w-4" />
              Back to CorpDeals
            </Link>
            <Link to="/vendor/login" className="text-sm font-medium text-blue-700 hover:text-blue-900">Already approved? Vendor login</Link>
          </div>
          {showPendingState ? (
            <div className="rounded-[2rem] border border-amber-200 bg-white/90 p-8 shadow-xl shadow-amber-100/50 backdrop-blur">
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                <Sparkles className="h-4 w-4" />
                Application in review
              </span>
              <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Your partner application is under review</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                We already have your submission. We will follow up using <span className="font-semibold text-slate-900">{accountEmailLabel}</span> if your business is selected for onboarding or if we need more detail.
              </p>
            </div>
          ) : (
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_430px] xl:items-start">
              <div className="space-y-6">
                <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 px-7 py-8 text-white shadow-2xl shadow-slate-300/40 sm:px-10 sm:py-10">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.45),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(45,212,191,0.24),_transparent_30%)]" />
                  <div className="relative">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">
                      <Sparkles className="h-4 w-4" />
                      Vendor onboarding
                    </span>
                    <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-[3.4rem] lg:leading-[1.02]">Partner with CorpDeals</h1>
                    <p className="mt-5 max-w-xl text-base leading-7 text-slate-200 sm:text-lg">
                      Join CorpDeals to reach verified employee audiences, manage your offers in one place, and start with a simple partner application.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3 text-sm">
                      <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-slate-100">Verified employee audiences</span>
                      <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-slate-100">Vendor workspace</span>
                      <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-slate-100">Simple onboarding</span>
                    </div>
                    {user ? (
                      <div className="mt-6 max-w-xl rounded-[1.5rem] border border-white/15 bg-white/10 p-4 text-sm text-slate-100">
                        <p className="font-semibold text-white">Applying with your current account</p>
                        <p className="mt-1">Account email: <span className="font-medium">{accountEmailLabel}</span></p>
                        <p className="mt-1 text-slate-200">Use the form to share your business contact details.</p>
                      </div>
                    ) : null}
                    {showRejectedState ? (
                      <div className="mt-4 max-w-xl rounded-[1.5rem] border border-rose-300/40 bg-rose-500/10 p-4 text-sm text-rose-100">
                        Your previous application was not approved. You can submit again with updated business or contact details.
                      </div>
                    ) : null}
                    <div className="mt-8">
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">Why businesses join CorpDeals</p>
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      {highlightCards.map(([title, body]) => (
                        <div key={title} className="rounded-[1.75rem] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
                          <p className="text-base font-semibold text-white">{title}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-200">{body}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>

              <section className="rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-2xl shadow-slate-300/40 backdrop-blur sm:p-8 xl:sticky xl:top-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Partner application</p>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Tell us about your business</h2>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">Keep it simple. We just need your company details and a main contact.</p>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">About 2 minutes</div>
                </div>
                {successMessage ? (
                  <div className="mt-6 rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                      <div>
                        <p className="font-semibold">Application received</p>
                        <p className="mt-1 text-sm leading-6">{successMessage}</p>
                        {requestId ? <p className="mt-2 text-xs text-emerald-800">Request ID: {requestId}</p> : null}
                        <div className="mt-4 flex flex-wrap gap-3">
                          <Link to="/vendor/login" className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100">Vendor login</Link>
                          <button type="button" onClick={() => { setSuccessMessage(''); setRequestId(''); }} className="rounded-xl px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100">Submit another application</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
                {error ? <div className="mt-6 rounded-[1.5rem] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

                {!successMessage ? (
                  <form onSubmit={onSubmit} className="mt-6 space-y-5">
                    <div className="rounded-[1.5rem] bg-slate-50 p-5">
                      <SectionHeading number="1" title="Business details" />
                      <div className="mt-4 space-y-4">
                        <label htmlFor="businessName" className="block text-sm font-medium text-slate-700">
                          Business name
                          <input id="businessName" required name="businessName" value={form.businessName} onChange={onChange} placeholder="Business name" aria-invalid={Boolean(fieldErrors.businessName)} aria-describedby={getFieldDescribedBy('businessName')} className={getFieldClassName('businessName')} />
                          {fieldErrors.businessName ? <p id="businessName-error" className="mt-2 text-xs text-red-600">{fieldErrors.businessName}</p> : null}
                        </label>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <label htmlFor="website" className="block text-sm font-medium text-slate-700">
                            Website
                            <input id="website" required name="website" value={form.website} onChange={onChange} placeholder="https://company.com" aria-invalid={Boolean(fieldErrors.website)} aria-describedby={getFieldDescribedBy('website')} className={getFieldClassName('website')} />
                            {fieldErrors.website ? <p id="website-error" className="mt-2 text-xs text-red-600">{fieldErrors.website}</p> : null}
                          </label>
                          <label htmlFor="category" className="block text-sm font-medium text-slate-700">
                            Category
                            <select id="category" required name="category" value={form.category} onChange={onChange} aria-invalid={Boolean(fieldErrors.category)} aria-describedby={getFieldDescribedBy('category')} className={getFieldClassName('category')}>
                              <option value="">Select a category</option>
                              {categoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                            {fieldErrors.category ? <p id="category-error" className="mt-2 text-xs text-red-600">{fieldErrors.category}</p> : null}
                          </label>
                        </div>
                        {form.category === 'Other' ? (
                          <label htmlFor="categoryOther" className="block text-sm font-medium text-slate-700">
                            Please specify
                            <input id="categoryOther" name="categoryOther" value={form.categoryOther} onChange={onChange} placeholder="Category" aria-invalid={Boolean(fieldErrors.categoryOther)} aria-describedby={getFieldDescribedBy('categoryOther')} className={getFieldClassName('categoryOther')} />
                            {fieldErrors.categoryOther ? <p id="categoryOther-error" className="mt-2 text-xs text-red-600">{fieldErrors.categoryOther}</p> : null}
                          </label>
                        ) : null}
                        <label htmlFor="city" className="block text-sm font-medium text-slate-700">
                          City or region
                          <input id="city" required name="city" value={form.city} onChange={onChange} placeholder="City or region" aria-invalid={Boolean(fieldErrors.city)} aria-describedby={getFieldDescribedBy('city')} className={getFieldClassName('city')} />
                          {fieldErrors.city ? <p id="city-error" className="mt-2 text-xs text-red-600">{fieldErrors.city}</p> : null}
                        </label>
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] bg-slate-50 p-5">
                      <SectionHeading number="2" title="Contact details" />
                      <div className="mt-4 space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <label htmlFor="contactName" className="block text-sm font-medium text-slate-700">
                            Contact name
                            <input id="contactName" required name="contactName" value={form.contactName} onChange={onChange} placeholder="Full name" aria-invalid={Boolean(fieldErrors.contactName)} aria-describedby={getFieldDescribedBy('contactName')} className={getFieldClassName('contactName')} />
                            {fieldErrors.contactName ? <p id="contactName-error" className="mt-2 text-xs text-red-600">{fieldErrors.contactName}</p> : null}
                          </label>
                          <label htmlFor="jobTitle" className="block text-sm font-medium text-slate-700">
                            Job title
                            <input id="jobTitle" required name="jobTitle" value={form.jobTitle} onChange={onChange} placeholder="Job title" aria-invalid={Boolean(fieldErrors.jobTitle)} aria-describedby={getFieldDescribedBy('jobTitle')} className={getFieldClassName('jobTitle')} />
                            {fieldErrors.jobTitle ? <p id="jobTitle-error" className="mt-2 text-xs text-red-600">{fieldErrors.jobTitle}</p> : null}
                          </label>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <label htmlFor="workEmail" className="block text-sm font-medium text-slate-700">
                            Work email
                            <div className="relative">
                              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                              <input id="workEmail" required type="email" name="workEmail" value={form.workEmail} onChange={onChange} placeholder="name@company.com" aria-invalid={Boolean(fieldErrors.workEmail)} aria-describedby={getFieldDescribedBy('workEmail', 'workEmail-hint')} className={`${getFieldClassName('workEmail')} pl-11`} />
                            </div>
                            <p id="workEmail-hint" className="mt-2 text-xs leading-5 text-slate-500">
                              We use this to verify that you represent the business.{user ? ' Your CorpDeals login stays the same.' : ' This becomes the main email we use for review.'}
                            </p>
                            {fieldErrors.workEmail ? <p id="workEmail-error" className="mt-2 text-xs text-red-600">{fieldErrors.workEmail}</p> : null}
                          </label>
                          <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
                            Phone
                            <input id="phone" required name="phone" inputMode="tel" value={form.phone} onChange={onChange} placeholder="+1 000 000 0000" aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={getFieldDescribedBy('phone')} className={getFieldClassName('phone')} />
                            {fieldErrors.phone ? <p id="phone-error" className="mt-2 text-xs text-red-600">{fieldErrors.phone}</p> : null}
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] bg-slate-50 p-5">
                      <SectionHeading number="3" title="Additional context" />
                      <div className="mt-4 space-y-4">
                        <label htmlFor="notes" className="block text-sm font-medium text-slate-700">
                          Additional context <span className="font-normal text-slate-500">(optional)</span>
                          <textarea id="notes" name="notes" value={form.notes} onChange={onChange} rows={4} placeholder="Anything helpful about your business, team, or partnership interest" aria-invalid={Boolean(fieldErrors.notes)} aria-describedby={getFieldDescribedBy('notes')} className={getFieldClassName('notes')} />
                          {fieldErrors.notes ? <p id="notes-error" className="mt-2 text-xs text-red-600">{fieldErrors.notes}</p> : null}
                        </label>
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] bg-slate-950 p-5 text-white">
                      <p className="text-sm leading-6 text-slate-200">We review submissions for business fit and partner readiness. Deal details can be added later after approval. This form does not create a binding commitment.</p>
                      <button type="submit" disabled={isSubmitting} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-100 disabled:opacity-60">
                        {isSubmitting ? 'Submitting application...' : 'Submit partner interest'}
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
