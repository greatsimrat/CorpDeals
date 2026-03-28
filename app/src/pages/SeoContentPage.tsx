import { Link } from 'react-router-dom';
import Seo from '../components/Seo';

type Faq = {
  question: string;
  answer: string;
};

type ContentSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

type ImagePanel = {
  title: string;
  body: string;
  image: string;
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
  sections?: ContentSection[];
  imagePanels?: ImagePanel[];
  faqs: Faq[];
  ctaLabel: string;
  ctaPath: string;
  structuredData?: Array<Record<string, unknown>>;
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
  forEmployees: {
    path: '/for-employees',
    title: 'For Employees',
    metaTitle: 'For Employees | Corporate Discounts, Employee Perks, and Verified Company Deals',
    metaDescription:
      'Learn how employees use CorpDeals to verify work email, unlock corporate discounts, and access company-specific employee perks and savings.',
    keywords:
      'for employees, employee perks, employee discounts, corporate discounts, work email verification, employee savings, company specific deals, employee benefits platform',
    heroImage: '/hero_main.jpg',
    intro:
      'CorpDeals is built for employees who want a cleaner way to access workplace perks, corporate discounts, and company-specific savings. Instead of browsing generic public deals, employees can search their employer, verify work email once, and unlock offers that are actually relevant to their company.',
    highlights: [
      'Search your employer and see if company-specific offers are available',
      'Verify work email once to unlock relevant employee discounts',
      'Access featured deals and categories tied to your company',
      'Apply for offers through a structured and trusted employee flow',
    ],
    sections: [
      {
        heading: 'Why Employees Use CorpDeals',
        paragraphs: [
          'Employees often hear that their company has discounts, but finding them can be confusing. Offers may be scattered across vendor pages, HR portals, PDFs, or outdated internal links. CorpDeals gives employees one place to search by company and unlock the benefits that match their employer.',
          'That makes the experience faster, more trustworthy, and more useful for employees who want real savings without digging through generic coupon sites.',
        ],
      },
      {
        heading: 'How CorpDeals Helps Employees',
        paragraphs: [
          'CorpDeals helps employees discover corporate discounts, employee perks, and workplace savings that are organized by company. Once verified, employees can browse featured deals, explore categories, and apply to relevant offers with less friction.',
          'This is especially useful for employees who want clarity on what is actually available through their employer instead of guessing which offers apply to them.',
        ],
        bullets: [
          'Find your company quickly',
          'Verify eligibility through work email',
          'Unlock employer-specific offers',
          'Browse a cleaner employee savings experience',
        ],
      },
      {
        heading: 'How the Employee Journey Works',
        paragraphs: [
          'The employee journey on CorpDeals is simple. First, search for your company. Second, verify your work email. Third, access the deals and perks available to your employer. Once verified, you can return to your company page and browse featured offers, categories, and the full deal list.',
        ],
        bullets: [
          'Search your company by name',
          'Complete work email verification',
          'Unlock featured deals and categories',
          'Apply to offers and track your activity',
        ],
      },
      {
        heading: 'Why Verification Matters',
        paragraphs: [
          'Verification helps keep employee-only deals relevant and protected. It allows CorpDeals to show company-specific offers only to the employees who are eligible to access them.',
          'That creates a better experience for employees and better trust for vendors who want to provide targeted corporate discount programs.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How do employees use CorpDeals?',
        answer: 'Employees search their company, verify their work email, and unlock the corporate discounts and employee perks available to their employer.'
      },
      {
        question: 'Do I need to verify my work email?',
        answer: 'Yes. Work email verification helps confirm eligibility and unlock company-specific employee offers.'
      },
      {
        question: 'What kinds of employee perks can I find on CorpDeals?',
        answer: 'Employees may find corporate discounts across categories such as telecom, travel, finance, wellness, fitness, insurance, and everyday lifestyle savings.'
      },
      {
        question: 'Why not just use public coupon sites?',
        answer: 'Public coupon sites are usually generic and noisy. CorpDeals is designed to help employees access offers that are structured around their employer and verification status.'
      },
      {
        question: 'Can I use a personal email on CorpDeals?',
        answer: 'Yes. Your account email can be personal, but your work email is used to verify your company eligibility for employee-only deals.'
      },
      {
        question: 'What if my company is not listed?',
        answer: 'You can submit a company request from the homepage search area and the CorpDeals team can review adding your employer.'
      },
    ],
    ctaLabel: 'Verify My Work Email',
    ctaPath: '/verify',
    structuredData: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'For Employees',
        description:
          'Employee guide to corporate discounts, employee perks, work email verification, and company-specific deals on CorpDeals.',
      },
    ],
  },
  forVendors: genericPage(
    '/for-vendors',
    'For Vendors',
    'Vendor overview for lead-only offers, inbox workflows, and dashboard controls.',
    'vendor leads, vendor dashboard, employee marketplace',
    '/vendor_spotlight.jpg',
    'Apply as a Vendor',
    '/vendor/apply'
  ),
  forHrTeams: {
    path: '/for-hr-teams',
    title: 'For HR Teams',
    metaTitle: 'For HR Teams | Employee Benefits, Corporate Discounts, and HR-Friendly Perks Access',
    metaDescription:
      'Learn how CorpDeals helps HR teams offer extra employee benefits, improve employee engagement, and give staff easier access to verified corporate discounts and company-specific perks.',
    keywords:
      'for hr teams, employee benefits platform, employee perks platform, corporate discounts for employees, hr employee engagement, hr benefits access, company perks platform, employee savings program',
    heroImage: '/hero_card_c.jpg',
    intro:
      'CorpDeals helps HR teams provide extra employee benefits without adding another heavy manual process. Instead of asking HR to maintain scattered discount pages, vendor lists, and internal links, CorpDeals gives employees a cleaner way to verify eligibility and access company-specific perks through one structured platform.',
    highlights: [
      'Give employees easier access to company-specific perks and corporate discounts',
      'Support employee engagement with benefits that feel more visible and useful',
      'Reduce the overhead of manually maintaining perk access and vendor information',
      'Use verification to create a cleaner and more trusted employee benefits experience',
    ],
    sections: [
      {
        heading: 'Why HR Teams Need a Better Benefits Access Layer',
        paragraphs: [
          'Many HR teams want to offer more value to employees, but benefits discovery is often fragmented. Employees may not know which discounts exist, which vendors are active, or where to find the right links. Over time, this makes even strong employee perks programs feel underused.',
          'CorpDeals exists to solve that discovery and access problem. We help HR teams make employee benefits more visible, more structured, and easier to use without forcing HR to manually manage every offer relationship day to day.',
        ],
      },
      {
        heading: 'How CorpDeals Helps HR Teams',
        paragraphs: [
          'CorpDeals helps HR teams support employee benefits in a more scalable way. Employees can search their company, verify work email, and unlock the perks that apply to them. That reduces confusion and creates a more modern employee experience around corporate discounts and workplace savings.',
          'For HR, the value is not just more offers. It is better access, clearer employee understanding, and less operational clutter around how benefits are surfaced.',
        ],
        bullets: [
          'Support extra employee benefits without adding more HR admin burden',
          'Improve visibility of employee discounts and corporate savings programs',
          'Give employees a clearer self-serve path to discover perks',
          'Use work-email verification to keep employer access more structured',
        ],
      },
      {
        heading: 'How We Help Employees While Supporting HR Goals',
        paragraphs: [
          'HR teams want employees to actually use the benefits that exist. CorpDeals helps by turning benefits access into a simple employee journey: search company, verify eligibility, browse featured deals, and explore categories.',
          'That supports employee engagement because the benefits feel easier to find, easier to trust, and easier to use. It also makes the program feel more current than a static internal perks list.',
        ],
      },
      {
        heading: 'Why Verification Matters for HR',
        paragraphs: [
          'Verification creates a stronger boundary around employee-only benefits. It helps ensure that company-specific offers are shown to the employees who are meant to access them.',
          'For HR teams, that can improve trust in the program and create a cleaner relationship between employer identity, employee access, and vendor participation.',
        ],
      },
    ],
    imagePanels: [
      {
        title: 'Make benefits easier to discover',
        body: 'Employees should not have to dig through outdated pages or ask around to find company perks. CorpDeals helps centralize discovery around the employer itself.',
        image: '/cta_image.jpg',
      },
      {
        title: 'Support engagement with visible value',
        body: 'A benefits program is stronger when employees can actually see and use it. CorpDeals helps turn invisible perks into an easier employee experience.',
        image: '/vendor_analytics.jpg',
      },
      {
        title: 'Offer extra benefits without more manual upkeep',
        body: 'HR teams can support a more modern perks layer without owning a bloated internal directory of discounts, categories, and vendor links.',
        image: '/hero_card_d.jpg',
      },
    ],
    faqs: [
      {
        question: 'How does CorpDeals help HR teams?',
        answer: 'CorpDeals helps HR teams offer a clearer employee benefits experience by making corporate discounts and company-specific perks easier for employees to find and unlock.'
      },
      {
        question: 'Why is this useful for employee engagement?',
        answer: 'Employees engage more with benefits when they can actually discover and use them. CorpDeals improves visibility and access, which can make benefits feel more valuable in practice.'
      },
      {
        question: 'Does HR need to manage every deal manually?',
        answer: 'No. The goal is to reduce manual overhead by giving employees a structured platform to discover benefits, while still keeping employer-specific access and verification in place.'
      },
      {
        question: 'Can CorpDeals help companies provide extra employee benefits?',
        answer: 'Yes. CorpDeals is designed to help companies extend the employee value proposition through a more organized perks and corporate discounts experience.'
      },
      {
        question: 'Why does verification matter for HR teams?',
        answer: 'Verification helps keep employer-specific offers tied to the right employee audience, which improves trust for employees, HR teams, and participating vendors.'
      },
      {
        question: 'What kinds of benefits can employees access through CorpDeals?',
        answer: 'Employees may access benefits and discounts across categories such as telecom, travel, banking, wellness, fitness, insurance, and other workplace-relevant savings areas.'
      },
    ],
    ctaLabel: 'Contact Us',
    ctaPath: '/about',
    structuredData: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'For HR Teams',
        description:
          'HR-focused page about how CorpDeals helps companies offer extra employee benefits, improve employee engagement, and organize corporate discounts.',
      },
    ],
  },
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
    title: 'About CorpDeals',
    metaTitle: 'About CorpDeals | Employee Perks Platform for Verified Corporate Discounts',
    metaDescription:
      'Learn why CorpDeals exists, how we help employees unlock verified corporate discounts, and how our employee perks platform connects companies, vendors, and trusted offers.',
    keywords:
      'about corpdeals, employee perks platform, corporate discounts platform, verified employee offers, employee benefits marketplace, company specific deals, employee savings platform',
    heroImage: '/hero_main.jpg',
    intro:
      'CorpDeals exists to make employee perks easier to access, easier to trust, and more relevant to the companies people actually work for. Instead of sending employees through generic coupon pages, we use company verification and company-scoped offer access so employees can unlock corporate discounts, employee savings, and verified workplace perks with more confidence.',
    highlights: [
      'Employee perks platform built around company verification and trust',
      'Corporate discounts and employee savings organized by employer',
      'Lead-only marketplace model focused on quality, consent, and relevance',
      'Clear value for employees, vendors, and HR teams',
    ],
    sections: [
      {
        heading: 'Why CorpDeals Exists',
        paragraphs: [
          'Most employee perks programs are fragmented. Employees often do not know which corporate discounts apply to their company, vendors struggle to reach the right audience, and HR teams do not want to maintain another manual benefits catalog. CorpDeals exists to simplify that experience.',
          'We built CorpDeals to give employees a cleaner path: search your company, verify your work email, and unlock the employee deals that match your workplace. That makes the experience more useful than a generic discounts page and more trustworthy than open coupon marketplaces.',
        ],
      },
      {
        heading: 'How We Help Employees',
        paragraphs: [
          'For employees, CorpDeals helps answer a simple question fast: what discounts and perks can I actually access through my company? Instead of browsing random public offers, employees can verify once and see company-specific deals that fit their employment status.',
          'That means less noise, fewer dead ends, and a more relevant employee benefits experience across categories like telecom, travel, finance, wellness, fitness, insurance, and everyday savings.',
        ],
        bullets: [
          'Search by company instead of browsing a generic deal marketplace',
          'Verify employment with work email to unlock relevant offers',
          'Browse featured deals and categories tied to your employer',
          'Access a cleaner employee savings experience with better trust signals',
        ],
      },
      {
        heading: 'How We Help Vendors and Employers',
        paragraphs: [
          'Vendors use CorpDeals to reach verified employee audiences with more relevance and better lead quality. Because the platform is scoped by company and verification status, vendors can launch offers that are more targeted than broad public campaigns.',
          'Employers and HR teams benefit from a simpler benefits-access model. Instead of owning every vendor relationship manually, they can use verification-driven access and let employees discover offers in a structured way.',
        ],
        bullets: [
          'Verified audience access for vendor offers',
          'Higher-quality lead and application flows',
          'Less operational noise for HR and benefits teams',
          'A more structured employee discount and corporate perks workflow',
        ],
      },
      {
        heading: 'What Makes CorpDeals Different',
        paragraphs: [
          'CorpDeals is not trying to be a generic coupon site. Our model is built around verified employee access, company-specific offer discovery, and role-based workflows for admins, vendors, finance, and sales teams.',
          'That operational structure helps the platform stay useful as it scales. Employees get relevance, vendors get cleaner demand, and internal teams get clearer review and approval flows.',
        ],
      },
    ],
    faqs: [
      {
        question: 'What is CorpDeals?',
        answer: 'CorpDeals is an employee perks platform that helps verified employees unlock company-specific corporate discounts, perks, and savings.'
      },
      {
        question: 'Why does CorpDeals exist?',
        answer: 'CorpDeals exists because employee discounts are often hard to find, hard to trust, and poorly organized. We simplify that by making company verification and employer-specific offer access the core workflow.'
      },
      {
        question: 'How does CorpDeals help users?',
        answer: 'CorpDeals helps users search their employer, verify their work email once, and access relevant employee offers without sorting through generic public coupon pages.'
      },
      {
        question: 'Is CorpDeals a coupon platform?',
        answer: 'No. CorpDeals is a verified employee marketplace and employee benefits access platform, not a broad public coupon aggregator.'
      },
      {
        question: 'Who benefits from CorpDeals?',
        answer: 'Employees benefit from cleaner access to relevant savings. Vendors benefit from better audience targeting. HR teams benefit from a simpler and more structured perks-access model.'
      },
      {
        question: 'How are offers targeted on CorpDeals?',
        answer: 'Offers can be tied to a specific company so only verified employees from that employer can access the most relevant deals.'
      },
    ],
    ctaLabel: 'See Employee Journey',
    ctaPath: '/for-employees',
    structuredData: [
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'CorpDeals',
        url: 'https://corpdeals.io/about',
        description:
          'CorpDeals is an employee perks platform for verified corporate discounts, company-specific deals, and employee savings.',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'AboutPage',
        name: 'About CorpDeals',
        description:
          'Learn why CorpDeals exists and how it helps employees, vendors, and HR teams access verified employee perks and corporate discounts.',
      },
    ],
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
    ...(page.structuredData || []),
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

          {page.sections?.map((section) => (
            <section key={section.heading} className="rounded-2xl border border-slate-200 bg-white p-8">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">{section.heading}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="mt-4 first:mt-0 text-slate-700 leading-7">
                  {paragraph}
                </p>
              ))}
              {section.bullets ? (
                <ul className="mt-4 list-disc pl-6 space-y-2 text-slate-700">
                  {section.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}

          {page.imagePanels ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-8">
              <h2 className="text-2xl font-semibold text-slate-900 mb-6">How CorpDeals Supports HR</h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {page.imagePanels.map((panel) => (
                  <article
                    key={panel.title}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                  >
                    <img
                      src={panel.image}
                      alt={panel.title}
                      className="h-44 w-full object-cover"
                      loading="lazy"
                    />
                    <div className="p-5">
                      <h3 className="text-lg font-semibold text-slate-900">{panel.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-slate-700">{panel.body}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

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
