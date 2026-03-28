import { Link } from 'react-router-dom';
import Seo from '../components/Seo';

type PolicyCard = {
  title: string;
  path: string;
  image: string;
  summary: string;
  bullets: string[];
};

const POLICY_CARDS: PolicyCard[] = [
  {
    title: 'Privacy Policy',
    path: '/privacy-policy',
    image: '/category_wellness.jpg',
    summary:
      'Explains what personal and operational data is collected, why it is used, and how users can request privacy support.',
    bullets: ['Data collection scope', 'Data usage purposes', 'Consent handling', 'Support request process'],
  },
  {
    title: 'Terms of Service',
    path: '/terms-of-service',
    image: '/category_tech.jpg',
    summary:
      'Defines platform use rules, account responsibilities, and expectations for employee, vendor, and admin workflows.',
    bullets: ['Eligibility requirements', 'Account obligations', 'Offer workflow expectations', 'Policy update notice'],
  },
  {
    title: 'Cookie Policy',
    path: '/cookie-policy',
    image: '/category_food.jpg',
    summary:
      'Outlines cookie usage for essential platform functionality, authentication flow support, and analytics.',
    bullets: ['Essential cookies', 'Analytics cookies', 'Browser-level controls', 'Service impact notes'],
  },
  {
    title: 'Security Overview',
    path: '/security',
    image: '/category_insurance.jpg',
    summary:
      'Describes security controls across authentication, verification-gated access, and lead data workflow handling.',
    bullets: ['Role-based access controls', 'Verification enforcement', 'Consent metadata records', 'Issue reporting path'],
  },
];

export default function PolicyTypesPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'CorpDeals Policy Types',
    itemListElement: POLICY_CARDS.map((card, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: card.title,
      url: `https://corpdeals.io${card.path}`,
    })),
  };

  return (
    <>
      <Seo
        title="Policies | CorpDeals"
        description="Browse the core CorpDeals policy pages including privacy, terms, cookies, and security."
        keywords="policies, privacy policy, terms of service, cookie policy, security policy"
        path="/policies"
        image="/CorpDeals-hero1.webp"
        structuredData={structuredData}
      />
      <div className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between">
            <Link to="/" className="font-semibold text-blue-600 hover:text-blue-700">
              CorpDeals
            </Link>
            <Link to="/" className="text-sm text-slate-600 hover:text-slate-900">
              Back to Home
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-10">
          <section className="rounded-2xl border border-slate-200 bg-white p-8 mb-8">
            <p className="text-xs font-semibold tracking-widest uppercase text-blue-700 mb-3">Legal and Trust Center</p>
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Policies</h1>
            <p className="text-slate-700 leading-7">
              This page brings together the core policy documents that govern how CorpDeals handles privacy, cookies, service usage, and trust-related operational expectations.
            </p>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {POLICY_CARDS.map((card) => (
              <article key={card.title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <img src={card.image} alt={card.title} className="h-44 w-full object-cover" loading="lazy" />
                <div className="p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">{card.title}</h2>
                  <p className="text-slate-700 mb-4 leading-7">{card.summary}</p>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700 mb-5">
                    {card.bullets.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <Link
                    to={card.path}
                    className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Read policy
                  </Link>
                </div>
              </article>
            ))}
          </section>

          <section className="rounded-2xl border border-blue-200 bg-blue-50 p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Need Clarification?</h2>
              <p className="text-slate-700">If you need help understanding one of these policies, contact the CorpDeals team.</p>
            </div>
            <a
              href="mailto:hello@corpdeals.io"
              className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Email hello@corpdeals.io
            </a>
          </section>
        </main>
      </div>
    </>
  );
}
