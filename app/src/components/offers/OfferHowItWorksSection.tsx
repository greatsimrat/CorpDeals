import type { DetailItem } from '../../lib/offer-details';

interface OfferHowItWorksSectionProps {
  title: string;
  description?: string;
  items: DetailItem[];
}

export default function OfferHowItWorksSection({
  title,
  description,
  items,
}: OfferHowItWorksSectionProps) {
  if (!items.length) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}
      <ol className="mt-4 space-y-3">
        {items.map((item, index) => (
          <li key={`${item.label || item.title || item.value}-${index}`} className="flex gap-3 rounded-xl border border-slate-200 p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              {index + 1}
            </div>
            <div>
              {item.title || item.label ? (
                <p className="text-sm font-semibold text-slate-900">{item.title || item.label}</p>
              ) : null}
              <p className="text-sm text-slate-600">{item.value || item.body || '-'}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
