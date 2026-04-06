import { Link } from 'react-router-dom';
import Seo from '../components/Seo';

type LegalSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

type LegalPageKey = 'privacy' | 'terms' | 'cookies';

type LegalPageConfig = {
  path: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  effectiveDate: string;
  intro: string;
  sections: LegalSection[];
};

const LEGAL_PAGES: Record<LegalPageKey, LegalPageConfig> = {
  privacy: {
    path: '/privacy-policy',
    title: 'Privacy Policy',
    metaTitle: 'Privacy Policy | CorpDeals',
    metaDescription:
      'Learn what information CorpDeals collects, how it is used, and how we handle employee verification, lead requests, and support inquiries.',
    keywords: 'privacy policy, employee verification data, contact data, corpdeals privacy',
    effectiveDate: 'March 27, 2026',
    intro:
      'CorpDeals collects only the information needed to run employee verification, company-scoped offers, vendor lead workflows, and support operations. This page explains what we collect, why we collect it, and how you can contact us with privacy questions.',
    sections: [
      {
        heading: 'Information We Collect',
        bullets: [
          'Account information such as name, email address, password hash, and role.',
          'Employment verification data such as work email, verification status, company, and verification timestamps.',
          'Offer and application data such as lead submissions, consent records, and activity tied to offers you view or apply to.',
          'Support and contact information you submit through forms on the site.',
        ],
      },
      {
        heading: 'How We Use Information',
        paragraphs: [
          'We use your information to authenticate your account, verify eligibility for company-specific offers, operate vendor lead workflows, respond to support requests, and improve platform reliability.',
          'We do not use your work email as your default marketing inbox. Work email is primarily used to verify eligibility. Contact and product follow-up may be sent to the account email associated with your CorpDeals profile.',
          'We do not sell application data and we do not use application submissions for unrelated marketing. Application details are used only for the specific offer request, consent records, platform operations, and legal or compliance obligations.',
        ],
      },
      {
        heading: 'How Information Is Shared',
        paragraphs: [
          'We share information with vendors only when it is necessary for a lead or offer request that you intentionally submit through the platform.',
          'We may share information with service providers that support infrastructure, email delivery, analytics, and platform operations. These providers may process information only for authorized operational purposes.',
        ],
      },
      {
        heading: 'Retention and Security',
        paragraphs: [
          'We retain account, verification, and lead records for as long as needed to operate the service, satisfy compliance needs, resolve disputes, and maintain audit history.',
          'We use authentication controls, role-based authorization, consent tracking, and access restrictions to protect operational data. No system can guarantee absolute security, but we design the platform to reduce unnecessary exposure.',
        ],
      },
      {
        heading: 'Your Choices',
        paragraphs: [
          'You can contact us to request updates to your contact information, ask questions about account data, or raise privacy concerns.',
          'For privacy-related requests, contact hello@corpdeals.io.',
        ],
      },
    ],
  },
  terms: {
    path: '/terms-of-service',
    title: 'Terms of Service',
    metaTitle: 'Terms of Service | CorpDeals',
    metaDescription:
      'Read the terms that govern account use, employee verification, vendor participation, and offer access on CorpDeals.',
    keywords: 'terms of service, user agreement, vendor terms, corpdeals terms',
    effectiveDate: 'March 27, 2026',
    intro:
      'These Terms of Service govern your use of CorpDeals. By using the platform, you agree to follow these terms and to use the service only for lawful and authorized purposes.',
    sections: [
      {
        heading: 'Eligibility and Accounts',
        bullets: [
          'You must provide accurate account information.',
          'You are responsible for maintaining the security of your login credentials.',
          'You may not impersonate another person or business.',
        ],
      },
      {
        heading: 'Employee Verification and Company Access',
        paragraphs: [
          'Some content and offers are available only to verified employees of specific companies. CorpDeals may require work-email verification or other eligibility checks before granting access.',
          'Verification does not guarantee the continued availability of any offer. Offer availability may change based on vendor participation, company eligibility, or platform rules.',
        ],
      },
      {
        heading: 'Offer and Vendor Content',
        paragraphs: [
          'Offers displayed on CorpDeals may be provided by third-party vendors. Vendors are responsible for the accuracy of their offer details, restrictions, and fulfillment terms.',
          'CorpDeals may review, remove, reject, or limit offers at its discretion to maintain platform quality, compliance, or operational integrity.',
        ],
      },
      {
        heading: 'Acceptable Use',
        bullets: [
          'Do not attempt to bypass verification or authorization controls.',
          'Do not misuse another person’s work email or company identity.',
          'Do not use the service for unlawful, fraudulent, or abusive activity.',
        ],
      },
      {
        heading: 'Service Availability and Liability',
        paragraphs: [
          'CorpDeals may update, suspend, or discontinue parts of the platform at any time.',
          'To the maximum extent permitted by law, CorpDeals is not liable for indirect, incidental, or consequential damages resulting from the use of the service, third-party offers, or platform interruptions.',
        ],
      },
      {
        heading: 'Changes and Contact',
        paragraphs: [
          'We may update these terms from time to time. Continued use of the platform after updates means you accept the revised terms.',
          'Questions about these terms can be sent to hello@corpdeals.io.',
        ],
      },
    ],
  },
  cookies: {
    path: '/cookie-policy',
    title: 'Cookie Policy',
    metaTitle: 'Cookie Policy | CorpDeals',
    metaDescription:
      'Understand how CorpDeals uses cookies and similar technologies for essential functionality, analytics, and user experience.',
    keywords: 'cookie policy, analytics cookies, essential cookies, corpdeals cookies',
    effectiveDate: 'March 27, 2026',
    intro:
      'CorpDeals uses cookies and similar technologies to keep the platform working, maintain session state, understand usage patterns, and improve the experience.',
    sections: [
      {
        heading: 'What Cookies Are',
        paragraphs: [
          'Cookies are small data files stored on your device. They can help remember session state, preferences, and usage information.',
        ],
      },
      {
        heading: 'Cookies We Use',
        bullets: [
          'Essential cookies for authentication, session continuity, and core site functionality.',
          'Preference-related storage for basic experience improvements where applicable.',
          'Analytics-related technologies to understand performance and usage trends.',
        ],
      },
      {
        heading: 'Third-Party Technologies',
        paragraphs: [
          'Some functionality may rely on third-party services such as hosting providers, analytics tools, or security services. These services may use their own cookies or similar technologies under their own policies.',
        ],
      },
      {
        heading: 'Managing Cookies',
        paragraphs: [
          'Most browsers allow you to control or delete cookies through browser settings. Blocking essential cookies may affect sign-in, verification, and other core site functions.',
        ],
      },
      {
        heading: 'Questions',
        paragraphs: [
          'If you have questions about how cookies are used on CorpDeals, contact hello@corpdeals.io.',
        ],
      },
    ],
  },
};

export default function LegalPage({ pageKey }: { pageKey: LegalPageKey }) {
  const page = LEGAL_PAGES[pageKey];
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.metaTitle,
    description: page.metaDescription,
    url: `https://corpdeals.io${page.path}`,
  };

  return (
    <>
      <Seo
        title={page.metaTitle}
        description={page.metaDescription}
        keywords={page.keywords}
        path={page.path}
        image="/CorpDeals-hero1.webp"
        structuredData={structuredData}
      />
      <div className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
            <Link to="/" className="font-semibold text-blue-600 hover:text-blue-700">
              CorpDeals
            </Link>
            <Link to="/" className="text-sm text-slate-600 hover:text-slate-900">
              Back to Home
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-6 py-10">
          <section className="rounded-2xl border border-slate-200 bg-white p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
              Legal
            </p>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">{page.title}</h1>
            <p className="mt-2 text-sm text-slate-500">Effective date: {page.effectiveDate}</p>
            <p className="mt-6 text-slate-700 leading-7">{page.intro}</p>
          </section>

          <div className="mt-6 space-y-6">
            {page.sections.map((section) => (
              <section
                key={section.heading}
                className="rounded-2xl border border-slate-200 bg-white p-8"
              >
                <h2 className="text-2xl font-semibold text-slate-900">{section.heading}</h2>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className="mt-4 text-slate-700 leading-7">
                    {paragraph}
                  </p>
                ))}
                {section.bullets ? (
                  <ul className="mt-4 list-disc space-y-2 pl-6 text-slate-700">
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>

          <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Questions about our policies?</h2>
              <p className="text-slate-700">Contact the CorpDeals team at hello@corpdeals.io.</p>
            </div>
            <Link
              to="/policies"
              className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              View All Policies
            </Link>
          </section>
        </main>
      </div>
    </>
  );
}
