import OfferFinePrintSection from './OfferFinePrintSection';
import OfferHowItWorksSection from './OfferHowItWorksSection';
import OfferSpecsSection from './OfferSpecsSection';
import type { OfferDetailSection } from '../../lib/offer-details';

interface OfferDynamicSectionRendererProps {
  sections: OfferDetailSection[];
}

const renderFaqSection = (section: OfferDetailSection) => {
  if (!section.items.length) return null;

  return (
    <section key={section.title} className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
      {section.description ? <p className="mt-2 text-sm text-slate-600">{section.description}</p> : null}
      <div className="mt-4 space-y-3">
        {section.items.map((item, index) => (
          <details
            key={`${item.label || item.title || item.value}-${index}`}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            open={index === 0}
          >
            <summary className="cursor-pointer text-sm font-semibold text-slate-900">
              {item.title || item.label || `Question ${index + 1}`}
            </summary>
            <p className="mt-2 text-sm text-slate-600">{item.value || item.body || '-'}</p>
          </details>
        ))}
      </div>
    </section>
  );
};

export default function OfferDynamicSectionRenderer({
  sections,
}: OfferDynamicSectionRendererProps) {
  return (
    <>
      {sections.map((section, index) => {
        if (section.type === 'specs' || section.type === 'pricing' || section.type === 'eligibility') {
          return (
            <OfferSpecsSection
              key={`${section.type}-${index}`}
              title={section.title || 'Offer details'}
              description={section.description}
              items={section.items}
            />
          );
        }

        if (
          section.type === 'how_it_works' ||
          section.type === 'included_items' ||
          section.type === 'booking_rules' ||
          section.type === 'timing_rules'
        ) {
          return (
            <OfferHowItWorksSection
              key={`${section.type}-${index}`}
              title={section.title || 'How it works'}
              description={section.description}
              items={section.items}
            />
          );
        }

        if (section.type === 'faq') {
          return renderFaqSection(section);
        }

        return (
          <OfferFinePrintSection
            key={`${section.type}-${index}`}
            title={section.title || 'Additional details'}
            description={section.description}
            content={section.content}
            items={section.items}
          />
        );
      })}
    </>
  );
}
