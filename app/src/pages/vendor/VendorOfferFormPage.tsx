import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

type Company = { id: string; name: string; slug: string };

type VendorOffer = {
  id: string;
  company: { id: string; name: string; slug: string };
  title: string;
  description?: string | null;
  productName?: string | null;
  productModel?: string | null;
  productUrl?: string | null;
  expiryDate?: string | null;
  active: boolean;
  termsText?: string | null;
  cancellationPolicyText?: string | null;
  redemptionInstructionsText?: string | null;
  restrictionsText?: string | null;
  usePlatformDefaultTerms?: boolean;
  usePlatformDefaultCancellationPolicy?: boolean;
  coverageType?: 'COMPANY_WIDE' | 'PROVINCE_SPECIFIC' | 'CITY_SPECIFIC';
  provinceCode?: string | null;
  cityName?: string | null;
  complianceStatus?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  complianceNotes?: string | null;
};

type PolicyDefaults = {
  termsTemplate: { title: string; bodyText: string };
  cancellationTemplate: { title: string; bodyText: string };
};

type FormState = {
  companyId: string;
  title: string;
  description: string;
  productName: string;
  productModel: string;
  productUrl: string;
  expiryDate: string;
  coverageType: 'COMPANY_WIDE' | 'PROVINCE_SPECIFIC' | 'CITY_SPECIFIC';
  provinceCode: string;
  cityName: string;
  usePlatformDefaultTerms: boolean;
  usePlatformDefaultCancellationPolicy: boolean;
  termsText: string;
  cancellationPolicyText: string;
  redemptionInstructionsText: string;
  restrictionsText: string;
  vendorAttestationAccepted: boolean;
};

const defaultPolicyTemplates: PolicyDefaults = {
  termsTemplate: {
    title: 'Default Offer Terms template',
    bodyText: `This offer is provided by the participating vendor for verified employees only.
Offer details, pricing, and availability are subject to change without notice.
The offer may not be combined with other promotions unless explicitly stated.
Proof of employment and identity may be required at redemption.
Misuse, fraud, or unauthorized sharing may result in cancellation.
Additional product- or service-specific conditions may apply.`,
  },
  cancellationTemplate: {
    title: 'Default Cancellation/Refund template',
    bodyText: `Cancellation and refund eligibility is determined by the vendor and may vary by product or service.
Requests must be submitted through the vendor's published support channels.
If approved, refunds are issued to the original payment method unless otherwise required by law.
Processing times may vary based on payment provider timelines.
Non-refundable fees or partially used services may be excluded where legally permitted.
Questions should be directed to the vendor first; CorpDeals does not process refunds on the vendor's behalf.`,
  },
};

const provinceOptions = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];

const emptyForm: FormState = {
  companyId: '',
  title: '',
  description: '',
  productName: '',
  productModel: '',
  productUrl: '',
  expiryDate: '',
  coverageType: 'COMPANY_WIDE',
  provinceCode: '',
  cityName: '',
  usePlatformDefaultTerms: true,
  usePlatformDefaultCancellationPolicy: true,
  termsText: '',
  cancellationPolicyText: '',
  redemptionInstructionsText: '',
  restrictionsText: '',
  vendorAttestationAccepted: false,
};

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function VendorOfferFormPage() {
  const navigate = useNavigate();
  const { offerId } = useParams();
  const isEdit = useMemo(() => Boolean(offerId), [offerId]);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [policyDefaults, setPolicyDefaults] = useState<PolicyDefaults>(defaultPolicyTemplates);
  const [existingOffer, setExistingOffer] = useState<VendorOffer | null>(null);
  const [billing, setBilling] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submitMode, setSubmitMode] = useState<'draft' | 'review' | null>(null);
  const [error, setError] = useState('');

  const minExpiryDate = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDateInput(tomorrow);
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        setIsLoading(true);
        setError('');
        const [companyData, defaults, offers, billingData] = await Promise.all([
          api.getCompanies(),
          api.getVendorPolicyDefaults().catch(() => defaultPolicyTemplates),
          isEdit ? api.getVendorOffers() : Promise.resolve([]),
          api.getVendorBilling().catch(() => null),
        ]);

        setCompanies(companyData as Company[]);
        setPolicyDefaults(defaults as PolicyDefaults);
        setBilling(billingData);

        if (isEdit) {
          const selected = (offers as VendorOffer[]).find((item) => item.id === offerId);
          if (!selected) {
            setError('Offer not found');
            return;
          }

          setExistingOffer(selected);
          setForm({
            companyId: selected.company.id,
            title: selected.title || '',
            description: selected.description || '',
            productName: selected.productName || '',
            productModel: selected.productModel || '',
            productUrl: selected.productUrl || '',
            expiryDate: selected.expiryDate
              ? new Date(selected.expiryDate).toISOString().slice(0, 10)
              : '',
            coverageType: selected.coverageType || 'COMPANY_WIDE',
            provinceCode: selected.provinceCode || '',
            cityName: selected.cityName || '',
            usePlatformDefaultTerms: selected.usePlatformDefaultTerms ?? true,
            usePlatformDefaultCancellationPolicy:
              selected.usePlatformDefaultCancellationPolicy ?? true,
            termsText: selected.termsText || '',
            cancellationPolicyText: selected.cancellationPolicyText || '',
            redemptionInstructionsText: selected.redemptionInstructionsText || '',
            restrictionsText: selected.restrictionsText || '',
            vendorAttestationAccepted: false,
          });
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load offer form');
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [isEdit, offerId]);

  const update = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const effectiveTermsPreview = form.usePlatformDefaultTerms
    ? policyDefaults.termsTemplate.bodyText
    : form.termsText;
  const effectiveCancellationPreview = form.usePlatformDefaultCancellationPolicy
    ? policyDefaults.cancellationTemplate.bodyText
    : form.cancellationPolicyText;

  const validateCommonFields = () => {
    if (!form.companyId || !form.title || !form.description) {
      return 'Company, title, and description are required';
    }
    if (form.expiryDate && form.expiryDate < minExpiryDate) {
      return 'Offer end date must be in the future';
    }
    if (form.coverageType !== 'COMPANY_WIDE' && !form.provinceCode) {
      return 'Province code is required for location-specific offers';
    }
    if (form.coverageType === 'CITY_SPECIFIC' && !form.cityName.trim()) {
      return 'City name is required for city-specific offers';
    }
    return '';
  };

  const persistDraft = async (): Promise<string> => {
    const payload = {
      companyId: form.companyId,
      title: form.title,
      description: form.description,
      productName: form.productName || null,
      productModel: form.productModel || null,
      productUrl: form.productUrl || null,
      expiryDate: form.expiryDate || null,
      coverageType: form.coverageType,
      provinceCode: form.coverageType === 'COMPANY_WIDE' ? null : form.provinceCode || null,
      cityName: form.coverageType === 'CITY_SPECIFIC' ? form.cityName.trim() || null : null,
      usePlatformDefaultTerms: form.usePlatformDefaultTerms,
      usePlatformDefaultCancellationPolicy: form.usePlatformDefaultCancellationPolicy,
      termsText: form.termsText,
      cancellationPolicyText: form.cancellationPolicyText,
      redemptionInstructionsText: form.redemptionInstructionsText || null,
      restrictionsText: form.restrictionsText || null,
    };

    if (isEdit && offerId) {
      await api.updateVendorOffer(offerId, payload);
      return offerId;
    }
    const created = await api.createVendorOffer(payload);
    return String(created.id);
  };

  const onSaveDraft = async () => {
    setError('');
    if (!isEdit && billing && !billing.canCreateOffer) {
      setError(billing.createOfferMessage || 'An active billing plan is required before you can create an offer');
      return;
    }
    const validationError = validateCommonFields();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitMode('draft');
    try {
      await persistDraft();
      navigate('/vendor/offers');
    } catch (err: any) {
      setError(err.message || 'Failed to save draft');
    } finally {
      setSubmitMode(null);
    }
  };

  const onSubmitForReview = async () => {
    setError('');
    if (!isEdit && billing && !billing.canCreateOffer) {
      setError(billing.createOfferMessage || 'An active billing plan is required before you can create an offer');
      return;
    }
    if (billing && !billing.canPublishOffer) {
      setError(
        billing.publishOfferMessage || 'An active billing plan is required before offers can be submitted'
      );
      return;
    }
    const validationError = validateCommonFields();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!form.vendorAttestationAccepted) {
      setError('You must accept the vendor attestation before submitting for review');
      return;
    }
    if (!effectiveTermsPreview.trim()) {
      setError('Terms & Conditions are required for submit');
      return;
    }
    if (!effectiveCancellationPreview.trim()) {
      setError('Cancellation/Refund policy is required for submit');
      return;
    }

    setSubmitMode('review');
    try {
      const savedOfferId = await persistDraft();
      await api.submitVendorOfferForReview(savedOfferId, {
        usePlatformDefaultTerms: form.usePlatformDefaultTerms,
        usePlatformDefaultCancellationPolicy: form.usePlatformDefaultCancellationPolicy,
        termsText: form.termsText,
        cancellationPolicyText: form.cancellationPolicyText,
        redemptionInstructionsText: form.redemptionInstructionsText || null,
        restrictionsText: form.restrictionsText || null,
        vendorAttestationAccepted: form.vendorAttestationAccepted,
      });
      navigate('/vendor/offers');
    } catch (err: any) {
      setError(err.message || 'Failed to submit offer for review');
    } finally {
      setSubmitMode(null);
    }
  };

  if (isLoading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{isEdit ? 'Edit Offer' : 'Create Offer'}</h2>
          {existingOffer?.complianceStatus ? (
            <p className="mt-1 text-sm text-slate-600">
              Compliance status: {existingOffer.complianceStatus}
              {existingOffer.complianceNotes ? ` - ${existingOffer.complianceNotes}` : ''}
            </p>
          ) : null}
        </div>
        <Link to="/vendor/offers" className="text-sm font-medium text-blue-600 hover:underline">
          Back to offers
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        {error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {!isEdit && billing && !billing.canCreateOffer ? (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {billing.createOfferMessage || 'An active billing plan is required before you can create an offer.'}{' '}
            <Link to="/vendor/billing" className="font-semibold underline">
              Review billing
            </Link>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700 md:col-span-2">
            Select company
            <select
              required
              value={form.companyId}
              onChange={(e) => update({ companyId: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="">Select a company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-slate-700 md:col-span-2">
            Title
            <input
              required
              value={form.title}
              onChange={(e) => update({ title: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="text-sm font-medium text-slate-700 md:col-span-2">
            Description
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(e) => update({ description: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Product name (optional)
            <input
              value={form.productName}
              onChange={(e) => update({ productName: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Product model (optional)
            <input
              value={form.productModel}
              onChange={(e) => update({ productModel: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="text-sm font-medium text-slate-700 md:col-span-2">
            Product link (optional)
            <input
              value={form.productUrl}
              onChange={(e) => update({ productUrl: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              placeholder="https://"
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Offer end date (optional)
            <input
              type="date"
              value={form.expiryDate}
              min={minExpiryDate}
              onChange={(e) => update({ expiryDate: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Offer visibility
            <select
              value={form.coverageType}
              onChange={(e) =>
                update({
                  coverageType: e.target.value as FormState['coverageType'],
                  provinceCode:
                    e.target.value === 'COMPANY_WIDE' ? '' : form.provinceCode,
                  cityName: e.target.value === 'CITY_SPECIFIC' ? form.cityName : '',
                })
              }
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="COMPANY_WIDE">Company-wide</option>
              <option value="PROVINCE_SPECIFIC">Province-specific</option>
              <option value="CITY_SPECIFIC">City-specific</option>
            </select>
          </label>

          {form.coverageType !== 'COMPANY_WIDE' ? (
            <label className="text-sm font-medium text-slate-700">
              Province code
              <select
                value={form.provinceCode}
                onChange={(e) => update({ provinceCode: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              >
                <option value="">Select province</option>
                {provinceOptions.map((provinceCode) => (
                  <option key={provinceCode} value={provinceCode}>
                    {provinceCode}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {form.coverageType === 'CITY_SPECIFIC' ? (
            <label className="text-sm font-medium text-slate-700 md:col-span-2">
              City name
              <input
                value={form.cityName}
                onChange={(e) => update({ cityName: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                placeholder="Vancouver"
              />
            </label>
          ) : null}
        </div>

        <div className="mt-8 space-y-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-base font-semibold text-slate-900">Policies</h3>

          <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.usePlatformDefaultTerms}
                onChange={(e) => update({ usePlatformDefaultTerms: e.target.checked })}
              />
              Use platform default Terms & Conditions
            </label>

            {!form.usePlatformDefaultTerms ? (
              <label className="block text-sm font-medium text-slate-700">
                Custom Terms & Conditions (required for submit)
                <textarea
                  rows={6}
                  value={form.termsText}
                  onChange={(e) => update({ termsText: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
            ) : null}

            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Preview - Terms & Conditions
              </p>
              <pre className="whitespace-pre-wrap text-sm text-slate-700">{effectiveTermsPreview}</pre>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.usePlatformDefaultCancellationPolicy}
                onChange={(e) =>
                  update({ usePlatformDefaultCancellationPolicy: e.target.checked })
                }
              />
              Use platform default Cancellation Policy
            </label>

            {!form.usePlatformDefaultCancellationPolicy ? (
              <label className="block text-sm font-medium text-slate-700">
                Custom Cancellation/Refund Policy (required for submit)
                <textarea
                  rows={6}
                  value={form.cancellationPolicyText}
                  onChange={(e) => update({ cancellationPolicyText: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
            ) : null}

            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Preview - Cancellation/Refund Policy
              </p>
              <pre className="whitespace-pre-wrap text-sm text-slate-700">
                {effectiveCancellationPreview}
              </pre>
            </div>
          </div>

          <label className="block text-sm font-medium text-slate-700">
            Restrictions (optional)
            <textarea
              rows={4}
              value={form.restrictionsText}
              onChange={(e) => update({ restrictionsText: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              placeholder="Eligible employees, exclusions, or usage limits"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Redemption instructions (optional)
            <textarea
              rows={4}
              value={form.redemptionInstructionsText}
              onChange={(e) => update({ redemptionInstructionsText: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <label className="inline-flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.vendorAttestationAccepted}
              onChange={(e) => update({ vendorAttestationAccepted: e.target.checked })}
              className="mt-0.5"
            />
            <span>
              I confirm this offer is accurate, I have authority to publish it, and I agree to
              CorpDeals vendor terms.{' '}
              <Link to="/vendor/terms" className="text-blue-600 hover:underline">
                View terms
              </Link>
            </span>
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={submitMode !== null || (!isEdit && billing && !billing.canCreateOffer)}
            className="rounded-md border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {submitMode === 'draft' ? 'Saving draft...' : 'Save Draft'}
          </button>
          <button
            type="button"
            onClick={onSubmitForReview}
            disabled={
              submitMode !== null ||
              !form.vendorAttestationAccepted ||
              (!isEdit && billing && !billing.canCreateOffer) ||
              (billing && !billing.canPublishOffer)
            }
            className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitMode === 'review' ? 'Submitting...' : 'Submit for Review'}
          </button>
        </div>
      </div>
    </div>
  );
}
