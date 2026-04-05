import type { DetailItem } from '../../lib/offer-details';

interface OfferFinePrintSectionProps {
  title: string;
  description?: string;
  content?: string;
  items: DetailItem[];
}

export default function OfferFinePrintSection({
  title,
  description,
  content,
  items,
}: OfferFinePrintSectionProps) {
  if (!content && !description && !items.length) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}
      {content ? <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">{content}</p> : null}
      {items.length ? (
        <ul className="mt-4 space-y-3">
          {items.map((item, index) => (
            <li key={`${item.label || item.title || item.value}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              {item.title || item.label ? (
                <p className="text-sm font-semibold text-slate-900">{item.title || item.label}</p>
              ) : null}
              <p className="mt-1 text-sm text-slate-600">{item.value || item.body || '-'}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
