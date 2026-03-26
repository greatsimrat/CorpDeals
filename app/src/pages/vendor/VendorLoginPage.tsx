import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import Seo from '../../components/Seo';

export default function VendorLoginPage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await api.vendorLogin(email, password);
      await refreshUser();
      navigate('/vendor/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Vendor login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Seo
        title="Vendor Login | CorpDeals"
        description="Approved vendors can sign in to manage lead-only offers, track leads, and update lead status."
        keywords="vendor login, partner portal, lead dashboard, corpdeals vendor"
        path="/vendor/login"
      />
      <div className="min-h-screen bg-slate-50 py-10">
        <div className="mx-auto w-full max-w-md px-4">
        <h1 className="mb-2 text-2xl font-semibold text-slate-900">Vendor Login</h1>
        <p className="mb-6 text-sm text-slate-600">Approved vendors can sign in here.</p>

        <form onSubmit={onSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {error ? (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <label className="mb-4 block text-sm font-medium text-slate-700">
            Email
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="mb-6 block text-sm font-medium text-slate-700">
            Password
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          New vendor?{' '}
          <Link to="/vendor/apply" className="font-medium text-blue-600 hover:underline">
            Apply here
          </Link>
        </p>
        </div>
      </div>
    </>
  );
}

