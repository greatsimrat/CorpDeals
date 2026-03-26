import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Seo from '../../components/Seo';

type FormState = {
  businessName: string;
  contactName: string;
  contactEmail: string;
  phone: string;
  website: string;
  category: string;
  city: string;
  notes: string;
};

const initialState: FormState = {
  businessName: '',
  contactName: '',
  contactEmail: '',
  phone: '',
  website: '',
  category: '',
  city: '',
  notes: '',
};

export default function VendorApplyPage() {
  const [form, setForm] = useState<FormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccessMessage('');
    try {
      const result = await api.submitVendorApplication(form);
      setSuccessMessage(result.message || 'We’ll review and contact you within 1–2 business days.');
      setForm(initialState);
    } catch (err: any) {
      setError(err.message || 'Failed to submit vendor application');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Seo
        title="Vendor Application | CorpDeals"
        description="Apply to become a CorpDeals vendor partner and publish lead-only offers for verified employee audiences."
        keywords="vendor application, become partner, employee marketplace vendor onboarding"
        path="/vendor/apply"
      />
      <div className="min-h-screen bg-slate-50 py-10">
        <div className="mx-auto w-full max-w-3xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-semibold text-slate-900">Vendor Application</h1>
          <Link to="/vendor/login" className="text-sm font-medium text-blue-600 hover:underline">
            Vendor login
          </Link>
        </div>

        <form onSubmit={onSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {successMessage ? (
            <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-green-800">
              {successMessage}
            </div>
          ) : null}
          {error ? (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700 md:col-span-2">
              Business name
              <input
                required
                name="businessName"
                value={form.businessName}
                onChange={onChange}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Contact name
              <input
                required
                name="contactName"
                value={form.contactName}
                onChange={onChange}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Contact email
              <input
                required
                type="email"
                name="contactEmail"
                value={form.contactEmail}
                onChange={onChange}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Phone
              <input
                name="phone"
                value={form.phone}
                onChange={onChange}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Website
              <input
                name="website"
                value={form.website}
                onChange={onChange}
                placeholder="https://example.com"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Category
              <input
                name="category"
                value={form.category}
                onChange={onChange}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              City
              <input
                name="city"
                value={form.city}
                onChange={onChange}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="text-sm font-medium text-slate-700 md:col-span-2">
              Notes
              <textarea
                name="notes"
                value={form.notes}
                onChange={onChange}
                rows={4}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit application'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </>
  );
}
