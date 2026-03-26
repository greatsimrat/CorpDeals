import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

type VendorOffer = {
  id: string;
  title: string;
  description?: string | null;
  active: boolean;
  complianceStatus?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  complianceNotes?: string | null;
  expiryDate?: string | null;
  company: { id: string; name: string; slug: string };
  productName?: string | null;
  productModel?: string | null;
  productUrl?: string | null;
  _count?: { leads: number };
};

export default function VendorOffersPage() {
  const [offers, setOffers] = useState<VendorOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOffers = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await api.getVendorOffers();
      setOffers(data as VendorOffer[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load offers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOffers();
  }, []);

  if (isLoading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6">Loading offers...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Offers</h2>
          <p className="text-sm text-slate-600">Create, edit, and submit offers for compliance review.</p>
        </div>
        <Link
          to="/vendor/offers/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          New Offer
        </Link>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[760px]">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Title</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Company</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Product</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Leads</th>
               <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Compliance</th>
               <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((offer) => (
              <tr key={offer.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{offer.title}</p>
                  <p className="line-clamp-1 text-xs text-slate-500">{offer.description || 'No description'}</p>
                  <p className="text-xs text-slate-500">
                    End date:{' '}
                    {offer.expiryDate ? new Date(offer.expiryDate).toLocaleDateString() : 'No end date'}
                  </p>
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">{offer.company.name}</td>
                <td className="px-4 py-3 text-sm text-slate-700">
                  <p>{offer.productName || '-'}</p>
                  <p className="text-xs text-slate-500">{offer.productModel || ''}</p>
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">{offer._count?.leads || 0}</td>
                <td className="px-4 py-3 text-sm">
                  <div className="space-y-1">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        offer.complianceStatus === 'APPROVED'
                          ? 'bg-green-50 text-green-700'
                          : offer.complianceStatus === 'REJECTED'
                          ? 'bg-red-50 text-red-700'
                          : offer.complianceStatus === 'SUBMITTED'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {offer.complianceStatus || 'DRAFT'}
                    </span>
                    <p className="text-xs text-slate-500">
                      Live: {offer.active ? 'Yes' : 'No'}
                    </p>
                    {offer.complianceNotes ? (
                      <p className="max-w-[240px] text-xs text-red-600">{offer.complianceNotes}</p>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  <div className="inline-flex items-center gap-2">
                    <Link
                      to={`/vendor/offers/${offer.id}/edit`}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                    >
                      {offer.complianceStatus === 'REJECTED' ? 'Fix & Resubmit' : 'Edit'}
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {offers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                  No offers found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
