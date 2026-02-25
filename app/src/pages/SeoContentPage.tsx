import { Link } from 'react-router-dom';
import Seo from '../components/Seo';

type Faq = {
  question: string;
  answer: string;
};

type SeoPage = {
  path: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  heroImage: string;
  intro: string;
  highlights: string[];
  faqs: Faq[];
  ctaLabel: string;
  ctaPath: string;
};

export type SeoPageKey =
  | 'forEmployees'
  | 'forVendors'
  | 'forHrTeams'
  | 'pricing'
  | 'about'
  | 'careers'
  | 'press'
  | 'blog'
  | 'helpCenter'
  | 'apiDocs'
  | 'partnerPortal'
  | 'caseStudies'
  | 'privacyPolicy'
  | 'termsOfService'
  | 'cookiePolicy'
  | 'security';

const genericPage = (
  path: string,
  title: string,
  description: string,
  keywords: string,
  heroImage: string,
  ctaLabel: string,
  ctaPath: string
): SeoPage => ({
  path,
  title,
  metaTitle: `${title} | CorpDeals`,
  metaDescription: description,
  keywords,
  heroImage,
  intro: description,
  highlights: [
    `${title} overview`,
    'Role-based workflow guidance',
    'Clear next steps',
    'Platform support path',
  ],
  faqs: [
    { question: `Who should read ${title}?`, answer: `Anyone who needs quick clarity on ${title} in CorpDeals.` },
    { question: 'Is this page updated?', answer: 'Yes. We update content as workflows and policy details evolve.' },
    { question: 'Where do I go next?', answer: 'Use the call-to-action below for the most relevant next step.' },
  ],
  ctaLabel,
  ctaPath,
});

const PAGES: Record<SeoPageKey, SeoPage> = {
  forEmployees: genericPage(
    '/for-employees',
    'For Employees',
    'Employee guide to verification, company-scoped offers, and lead-only requests.',
    'employee perks, employee verification, corporate discounts',
    '/hero_main.jpg',
    'Verify My Work Email',
    '/verify'
  ),
  forVendors: genericPage(
    '/for-vendors',
    'For Vendors',
    'Vendor overview for lead-only offers, inbox workflows, and dashboard controls.',
    'vendor leads, vendor dashboard, employee marketplace',
    '/vendor_spotlight.jpg',
    'Apply as a Vendor',
    '/vendor/apply'
  ),
  forHrTeams: genericPage(
    '/for-hr-teams',
    'For HR Teams',
    'HR resource for verified access controls and scalable employee perk operations.',
    'hr benefits platform, employee engagement, benefits operations',
    '/hero_card_c.jpg',
    'Open Verification Flow',
    '/verify'
  ),
  pricing: genericPage(
    '/pricing',
    'Pricing',
    'Pricing overview for employee marketplace setup, vendor workflows, and support scope.',
    'corpdeals pricing, employee marketplace pricing',
    '/hero_card_b.jpg',
    'Contact Support',
    '/help-center'
  ),
  about: {
    path: '/about',
    title: 'About Us',
    metaTitle: 'About CorpDeals | Verified Employee Marketplace Platform',
    metaDescription:
      'Learn how CorpDeals connects verified employees and vendors using a lead-only marketplace model designed for trust and conversion quality.',
    keywords:
      'about corpdeals, employee marketplace, verified employee offers, lead-only offers',
    heroImage: '/hero_main.jpg',
    intro:
      'CorpDeals is built to make employee perks simpler and more trustworthy. We use company verification and lead-only offer workflows to avoid coupon noise and improve vendor outcomes.',
    highlights: [
      'Lead-only architecture with no ecommerce redirects',
      'Company-scoped offer access model',
      'Consent-first lead capture and tracking',
      'Clear value for employees, HR teams, and vendors',
    ],
    faqs: [
      { question: 'Is CorpDeals a coupon platform?', answer: 'No. CorpDeals is a verified lead-only marketplace.' },
      { question: 'Who benefits from the platform?', answer: 'Employees, HR teams, and approved vendor partners.' },
      { question: 'How are offers targeted?', answer: 'Each offer is tied to one company with optional product metadata.' },
    ],
    ctaLabel: 'See Employee Journey',
    ctaPath: '/for-employees',
  },
  careers: {
    path: '/careers',
    title: 'Careers',
    metaTitle: 'Careers at CorpDeals | Product, Engineering, Operations',
    metaDescription:
      'Explore career paths at CorpDeals across product engineering, operations, support, and growth in a verification-first marketplace.',
    keywords: 'corpdeals careers, marketplace jobs, product engineering roles',
    heroImage: '/vendor_analytics.jpg',
    intro:
      'We build practical systems for employee benefits access and vendor lead workflows. We value ownership, clarity, and technical rigor.',
    highlights: [
      'Roles across engineering, product, operations, and support',
      'Execution-focused team culture',
      'High-ownership environment',
      'Impact tied to measurable user outcomes',
    ],
    faqs: [
      { question: 'Which teams are hiring?', answer: 'Hiring priorities vary by roadmap and operating needs.' },
      { question: 'How do I find open positions?', answer: 'Use the Help Center contact channel for current openings.' },
      { question: 'What is the hiring process?', answer: 'Typically role alignment, practical evaluation, and team fit interview.' },
    ],
    ctaLabel: 'Contact Hiring Team',
    ctaPath: '/help-center',
  },
  press: {
    path: '/press',
    title: 'Press',
    metaTitle: 'CorpDeals Press | Media Information and Inquiry Guide',
    metaDescription:
      'Press page for media inquiries, company background, and coverage themes related to CorpDeals employee marketplace workflows.',
    keywords: 'corpdeals press, media inquiry, marketplace company news',
    heroImage: '/testimonial_portrait.jpg',
    intro:
      'This page is for journalists, analysts, and media partners who need accurate product context and interview routing.',
    highlights: [
      'Media inquiry intake and response process',
      'Company narrative and product positioning',
      'Coverage themes: verification, perks, and lead quality',
      'Support path for interview and quote requests',
    ],
    faqs: [
      { question: 'Can I request an executive interview?', answer: 'Yes. Include publication, topic, and timeline.' },
      { question: 'Do you provide media background materials?', answer: 'Yes. We share assets and context as needed.' },
      { question: 'Where do press requests go?', answer: 'Use the Help Center route and mark the request as press.' },
    ],
    ctaLabel: 'Contact Press Team',
    ctaPath: '/help-center',
  },
  blog: {
    path: '/blog',
    title: 'Blog',
    metaTitle: 'CorpDeals Blog | Employee Perks and Lead Operations Insights',
    metaDescription:
      'Read practical content on employee verification, offer quality, vendor follow-up workflows, and marketplace growth.',
    keywords: 'employee perks blog, lead operations, vendor strategy, marketplace insights',
    heroImage: '/featured_deal.jpg',
    intro:
      'The CorpDeals blog focuses on implementation-focused content for operators building employee benefit and vendor lead programs.',
    highlights: [
      'Verification workflow guidance',
      'Lead pipeline and conversion quality topics',
      'Vendor operating patterns that scale',
      'Actionable, non-generic playbooks',
    ],
    faqs: [
      { question: 'How often do you publish?', answer: 'Content cadence follows product and program updates.' },
      { question: 'Can readers suggest topics?', answer: 'Yes. Topic requests can be sent through Help Center.' },
      { question: 'Is technical content included?', answer: 'Yes. We cover both strategy and implementation details.' },
    ],
    ctaLabel: 'Read Case Studies',
    ctaPath: '/case-studies',
  },
  helpCenter: {
    path: '/help-center',
    title: 'Help Center',
    metaTitle: 'CorpDeals Help Center | Employee and Vendor Support',
    metaDescription:
      'Support hub for login, verification, vendor onboarding, offer setup, lead status, and platform troubleshooting.',
    keywords: 'help center, vendor support, employee support, verification support',
    heroImage: '/hero_card_a.jpg',
    intro:
      'Help Center is the main support entry point for employees, vendors, and admins using CorpDeals.',
    highlights: [
      'Verification and access troubleshooting',
      'Vendor onboarding and account support',
      'Offer and lead workflow guidance',
      'Issue reporting with route-level context',
    ],
    faqs: [
      { question: 'I cannot log in. What should I do?', answer: 'Check credentials, account role, and verification status first.' },
      { question: 'My company is missing. Can it be added?', answer: 'Yes. Submit company details through support request.' },
      { question: 'How do I report a bug?', answer: 'Share the exact URL, repro steps, and error details.' },
    ],
    ctaLabel: 'Back to Home',
    ctaPath: '/',
  },
  apiDocs: {
    path: '/api-docs',
    title: 'API Docs',
    metaTitle: 'CorpDeals API Docs | Authentication, Offers, and Leads',
    metaDescription:
      'Technical API overview for authentication, company verification, offer retrieval, and lead lifecycle operations.',
    keywords: 'api docs, lead api, vendor api, verification api',
    heroImage: '/hero_card_b.jpg',
    intro:
      'API Docs page explains the main integration surfaces used in CorpDeals workflows and role-based access patterns.',
    highlights: [
      'Auth and role handling',
      'Verification-gated access rules',
      'Offer and lead endpoint domains',
      'Operational integration recommendations',
    ],
    faqs: [
      { question: 'Do APIs support vendor lead updates?', answer: 'Yes. Vendor routes support status and note updates.' },
      { question: 'Are all endpoints public?', answer: 'No. Many routes require authentication and role checks.' },
      { question: 'How should clients handle verification errors?', answer: 'Redirect users into verification flow when required.' },
    ],
    ctaLabel: 'Go to Vendor Login',
    ctaPath: '/vendor/login',
  },
  partnerPortal: {
    path: '/partner-portal',
    title: 'Partner Portal',
    metaTitle: 'Partner Portal | Vendor Offer and Lead Management',
    metaDescription:
      'Partner portal overview for approved vendors managing lead-only offers, lead status updates, and dashboard workflows.',
    keywords: 'partner portal, vendor portal, offer management, lead status dashboard',
    heroImage: '/vendor_spotlight.jpg',
    intro:
      'Partner Portal is the operating dashboard for approved vendors in CorpDeals.',
    highlights: [
      'Create, edit, activate, and deactivate offers',
      'Filter and review incoming leads',
      'Progress lead status from new to closed',
      'Add internal notes and export data',
    ],
    faqs: [
      { question: 'How do I access the portal?', answer: 'Vendor approval and password setup are required first.' },
      { question: 'Can I manage multiple offers?', answer: 'Yes. Vendors can manage all offers in their scope.' },
      { question: 'How are new leads delivered?', answer: 'By both email notification and dashboard listing.' },
    ],
    ctaLabel: 'Vendor Login',
    ctaPath: '/vendor/login',
  },
  caseStudies: {
    path: '/case-studies',
    title: 'Case Studies',
    metaTitle: 'CorpDeals Case Studies | Verified Access and Lead Outcomes',
    metaDescription:
      'Case studies on employee verification impact, lead quality improvements, vendor response speed, and operational scalability.',
    keywords: 'case studies, employee marketplace outcomes, lead quality improvements',
    heroImage: '/company_google.jpg',
    intro:
      'Case studies show how teams improve employee access quality and vendor pipeline outcomes using CorpDeals.',
    highlights: [
      'Verification completion and access quality',
      'Lead response-time improvements',
      'Status progression and conversion insights',
      'Operational design patterns that scale',
    ],
    faqs: [
      { question: 'Are these based on real workflows?', answer: 'Yes. They reflect real operating patterns and outcomes.' },
      { question: 'Can we request deeper analysis?', answer: 'Yes. Contact support with your use case and requirements.' },
      { question: 'Do studies include both employee and vendor views?', answer: 'Yes. They cover end-to-end journey impacts.' },
    ],
    ctaLabel: 'Contact Team',
    ctaPath: '/help-center',
  },
  privacyPolicy: genericPage(
    '/privacy-policy',
    'Privacy Policy',
    'Policy details about data collection, use, consent capture, and support channels.',
    'privacy policy, data handling',
    '/category_wellness.jpg',
    'Read Terms',
    '/terms-of-service'
  ),
  termsOfService: genericPage(
    '/terms-of-service',
    'Terms of Service',
    'Platform terms covering eligibility, account responsibilities, and usage expectations.',
    'terms of service, user agreement',
    '/category_tech.jpg',
    'Read Privacy Policy',
    '/privacy-policy'
  ),
  cookiePolicy: genericPage(
    '/cookie-policy',
    'Cookie Policy',
    'Cookie usage guidance for core features, analytics, and browser-level controls.',
    'cookie policy, analytics cookies',
    '/category_food.jpg',
    'Read Security',
    '/security'
  ),
  security: genericPage(
    '/security',
    'Security',
    'Security overview for access controls, verification enforcement, and lead data protection.',
    'security overview, role-based access',
    '/category_insurance.jpg',
    'Open Help Center',
    '/help-center'
  ),
};

export default function SeoContentPage({ pageKey }: { pageKey: SeoPageKey }) {
  const page = PAGES[pageKey];

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: page.metaTitle,
      description: page.metaDescription,
      url: `https://corpdeals.io${page.path}`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: page.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    },
  ];

  return (
    <>
      <Seo
        title={page.metaTitle}
        description={page.metaDescription}
        keywords={page.keywords}
        path={page.path}
        image={page.heroImage}
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

        <main className="mx-auto max-w-6xl px-6 py-10 space-y-8">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <img src={page.heroImage} alt={page.title} className="h-52 w-full object-cover" />
            <div className="p-8">
              <p className="text-xs font-semibold tracking-widest uppercase text-blue-700 mb-3">CorpDeals Resource</p>
              <h1 className="text-3xl font-bold text-slate-900 mb-4">{page.title}</h1>
              <p className="text-slate-700 leading-7">{page.intro}</p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">What This Page Covers</h2>
            <ul className="list-disc pl-6 space-y-2 text-slate-700">
              {page.highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {page.faqs.map((faq) => (
                <div key={faq.question} className="rounded-xl border border-slate-200 p-4">
                  <h3 className="font-medium text-slate-900">{faq.question}</h3>
                  <p className="mt-2 text-slate-700">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-blue-200 bg-blue-50 p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Next Step</h2>
              <p className="text-slate-700">Continue with the most relevant action for this topic.</p>
            </div>
            <Link
              to={page.ctaPath}
              className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {page.ctaLabel}
            </Link>
          </section>
        </main>
      </div>
    </>
  );
}
