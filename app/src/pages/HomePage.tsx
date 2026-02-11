import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Navigation from '../sections/Navigation';
import HeroSection from '../sections/HeroSection';
import SearchSection from '../sections/SearchSection';
import HowItWorksSection from '../sections/HowItWorksSection';
import FeaturedDealsSection from '../sections/FeaturedDealsSection';
import CategoriesPreviewSection from '../sections/CategoriesPreviewSection';
import VendorCTASection from '../sections/VendorCTASection';
import FooterSection from '../sections/FooterSection';

gsap.registerPlugin(ScrollTrigger);

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
      <Navigation />
      <main className="relative">
        <HeroSection />
        <SearchSection />
        <HowItWorksSection />
        <FeaturedDealsSection />
        <CategoriesPreviewSection />
        <VendorCTASection />
        <FooterSection />
      </main>
    </>
  );
};

export default HomePage;
