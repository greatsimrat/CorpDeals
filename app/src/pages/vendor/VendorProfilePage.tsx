import { useEffect, useState } from 'react';
import api from '../../services/api';

type VendorProfile = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  businessEmail?: string | null;
  phone?: string | null;
  website?: string | null;
  city?: string | null;
  businessType?: string | null;
  description?: string | null;
  notes?: string | null;
};

type VendorProfileForm = {
  companyName: string;
  contactName: string;
  businessEmail: string;
  phone: string;
  website: string;
  city: string;
  businessType: string;
  description: string;
  notes: string;
};

const toFormState = (profile: VendorProfile | null): VendorProfileForm => ({
  companyName: profile?.companyName || '',
  contactName: profile?.contactName || '',
  businessEmail: profile?.businessEmail || '',
  phone: profile?.phone || '',
  website: profile?.website || '',
  city: profile?.city || '',
  businessType: profile?.businessType || '',
  description: profile?.description || '',
  notes: profile?.notes || '',
});

export default function VendorProfilePage() {
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [form, setForm] = useState<VendorProfileForm>(toFormState(null));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = (await api.getVendorProfile()) as VendorProfile;
      setProfile(response);
      setForm(toFormState(response));
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const saveProfile = async () => {
    if (!profile?.id) return;
    if (!form.companyName.trim() || !form.contactName.trim()) {
      setError('Company name and contact name are required.');
      return;
    }
    try {
      setIsSaving(true);
      setError('');
      setSuccess('');
      await api.updateVendor(profile.id, {
        companyName: form.companyName,
        contactName: form.contactName,
        businessEmail: form.businessEmail || null,
        phone: form.phone || null,
        website: form.website || null,
        city: form.city || null,
        businessType: form.businessType || null,
        description: form.description || null,
        notes: form.notes || null,
      });
      await loadProfile();
      setSuccess('Partner profile updated.');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6">Loading profile...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Profile Settings</h2>
            <p className="mt-1 text-sm text-slate-600">
              Update your partner profile information used for review and operations.
            </p>
            <p className="mt-2 break-all text-sm text-slate-500">Login: {profile?.email}</p>
          </div>
          <button
            type="button"
            onClick={saveProfile}
            disabled={isSaving}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">{success}</div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm text-slate-700">
            Company Name
            <input
              value={form.companyName}
              onChange={(e) => setForm((prev) => ({ ...prev, companyName: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm text-slate-700">
            Contact Name
            <input
              value={form.contactName}
              onChange={(e) => setForm((prev) => ({ ...prev, contactName: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm text-slate-700">
            Business Email
            <input
              type="email"
              value={form.businessEmail}
              onChange={(e) => setForm((prev) => ({ ...prev, businessEmail: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm text-slate-700">
            Phone
            <input
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm text-slate-700">
            Website
            <input
              value={form.website}
              onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm text-slate-700">
            City
            <input
              value={form.city}
              onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm text-slate-700">
            Business Type
            <input
              value={form.businessType}
              onChange={(e) => setForm((prev) => ({ ...prev, businessType: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4">
          <label className="text-sm text-slate-700">
            Description
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              className="mt-1 block min-h-[96px] w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm text-slate-700">
            Notes
            <textarea
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              className="mt-1 block min-h-[96px] w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

