import type { DetailItem } from '../../lib/offer-details';

interface OfferHighlightsSectionProps {
  items: DetailItem[];
}

export default function OfferHighlightsSection({ items }: OfferHighlightsSectionProps) {
  if (!items.length) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Offer highlights</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => (
          <div key={`${item.label || item.title || item.value}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              {item.label || item.title || 'Highlight'}
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">{item.value || item.body || '-'}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
