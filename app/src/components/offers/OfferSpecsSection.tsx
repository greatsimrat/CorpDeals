import type { DetailItem } from '../../lib/offer-details';

interface OfferSpecsSectionProps {
  title: string;
  description?: string;
  items: DetailItem[];
}

export default function OfferSpecsSection({
  title,
  description,
  items,
}: OfferSpecsSectionProps) {
  if (!items.length) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((item, index) => (
          <div
            key={`${item.label || item.title || item.value}-${index}`}
            className="rounded-xl border border-slate-200 p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              {item.label || item.title || 'Detail'}
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">{item.value || item.body || '-'}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
