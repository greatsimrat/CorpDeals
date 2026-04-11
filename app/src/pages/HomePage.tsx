import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Navigation from '../sections/Navigation';
import HeroSection from '../sections/HeroSection';
import SearchSection from '../sections/SearchSection';
import HowItWorksSection from '../sections/HowItWorksSection';
import VendorCTASection from '../sections/VendorCTASection';
import FooterSection from '../sections/FooterSection';
import Seo from '../components/Seo';

gsap.registerPlugin(ScrollTrigger);

const homeStructuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'CorpDeals',
    url: 'https://corpdeals.io',
    description:
      'CorpDeals helps verified employees access trusted Employee Purchase Program (EPP) and exclusive corporate offers from leading brands.',
    logo: 'https://corpdeals.io/CorpDeals-hero1.webp',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'CorpDeals',
    url: 'https://corpdeals.io',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://corpdeals.io/?company={company_name}',
      'query-input': 'required name=company_name',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How CorpDeals works',
    description:
      'Search your company, verify your work email, and unlock Employee Purchase Program (EPP) and employee deals.',
    totalTime: 'PT3M',
    step: [
      {
        '@type': 'HowToStep',
        name: 'Search your company',
        text: 'Find your employer and preview available deals.',
      },
      {
        '@type': 'HowToStep',
        name: 'Verify your work email',
        text: 'Confirm your employment with a one-time verification code.',
      },
      {
        '@type': 'HowToStep',
        name: 'Access and claim deals',
        text: 'Browse offer categories and redeem perks from partner vendors.',
      },
    ],
  },
];

const HomePage = () => {
  useEffect(() => {
    // Refresh ScrollTrigger after mount
    const timer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);

    return () => {
      clearTimeout(timer);
      ScrollTrigger.getAll().forEach(st => st.kill());
    };
  }, []);

  return (
    <>
      <Seo
        title="CorpDeals | Company EPP and Employee Deals in One Place"
        description="Search your employer, verify your work email once, and access trusted Employee Purchase Program (EPP) and exclusive corporate offers across telecom, banking, travel, wellness, and more."
        keywords="employee perks, corporate discounts, employee-only deals, work email verification, company benefits platform, corporate benefits"
        path="/"
        image="/CorpDeals-hero1.webp"
        structuredData={homeStructuredData}
      />
      <Navigation />
      <main className="relative">
        <HeroSection />
        <SearchSection />
        <HowItWorksSection />
        <VendorCTASection />
        <FooterSection />
      </main>
    </>
  );
};

export default HomePage;
