import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Check, Building2, Users, TrendingUp } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const trustedCompanies = ['Google', 'Microsoft', 'Amazon', 'Meta', 'Apple'];

const HeroSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const badgesRef = useRef<HTMLDivElement>(null);

  // Auto-play entrance animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      // Content entrance
      tl.fromTo(
        contentRef.current?.querySelectorAll('.animate-in') || [],
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.1 },
        0.2
      );

      // Hero image entrance
      tl.fromTo(
        imageRef.current,
        { opacity: 0, scale: 0.95, y: 40 },
        { opacity: 1, scale: 1, y: 0, duration: 1 },
        0.3
      );

      // Stats entrance
      tl.fromTo(
        statsRef.current?.querySelectorAll('.stat-item') || [],
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.08 },
        0.6
      );

      // Badges entrance
      tl.fromTo(
        badgesRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5 },
        0.8
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  // Scroll-driven exit animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: '+=100%',
          pin: true,
          scrub: 0.5,
          onLeaveBack: () => {
            gsap.set([contentRef.current, imageRef.current, statsRef.current], {
              opacity: 1,
              y: 0,
              scale: 1,
            });
          },
        },
      });

      // EXIT (50%-100%)
      scrollTl.fromTo(
        contentRef.current,
        { y: 0, opacity: 1 },
        { y: '-10vh', opacity: 0, ease: 'power2.in' },
        0.5
      );

      scrollTl.fromTo(
        imageRef.current,
        { y: 0, opacity: 1, scale: 1 },
        { y: '-5vh', opacity: 0.3, scale: 0.98, ease: 'power2.in' },
        0.5
      );

      scrollTl.fromTo(
        statsRef.current,
        { y: 0, opacity: 1 },
        { y: '5vh', opacity: 0, ease: 'power2.in' },
        0.5
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full min-h-screen bg-corp-light overflow-hidden z-10"
      aria-label="Hero Section"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-corp-light to-corp-light" />

      {/* Main Content Container */}
      <div className="relative z-10 w-full min-h-screen flex flex-col">
        
        {/* Top Content - Text */}
        <div 
          ref={contentRef}
          className="flex-1 flex flex-col items-center justify-center px-6 lg:px-12 pt-24 pb-8"
        >
          {/* Eyebrow */}
          <div className="animate-in flex items-center gap-2 px-4 py-2 bg-corp-highlight rounded-full mb-6">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="font-inter text-sm text-corp-blue font-medium">
              Now serving 12,000+ companies
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="animate-in heading-1 text-corp-dark text-center max-w-4xl mb-6">
            EXCLUSIVE PERKS FOR
            <br />
            <span className="text-corp-blue">VERIFIED EMPLOYEES</span>
          </h1>

          {/* Subheadline */}
          <p className="animate-in body-text text-lg md:text-xl text-center max-w-2xl mb-8">
            CorpDeals connects your team with exclusive discounts from top brands. 
            Verify once, save forever.
          </p>

          {/* CTA Buttons */}
          <div className="animate-in flex flex-col sm:flex-row items-center gap-4 mb-8">
            <a 
              href="#search" 
              className="btn-primary px-8 py-4 text-base flex items-center gap-2 group"
            >
              Find Your Company
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <a 
              href="#vendors" 
              className="btn-secondary px-8 py-4 text-base"
            >
              For Vendors
            </a>
          </div>

          {/* Trust Indicators */}
          <div className="animate-in flex flex-wrap items-center justify-center gap-6 text-sm text-corp-gray">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span className="font-inter">Free for employees</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span className="font-inter">30-second verification</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span className="font-inter">$2,500+ avg. savings</span>
            </div>
          </div>
        </div>

        {/* Center Hero Image */}
        <div 
          ref={imageRef}
          className="relative w-full px-6 lg:px-12 pb-8"
        >
          <div className="max-w-5xl mx-auto">
            {/* Image Container with rounded corners and shadow */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <img
                src="/hero_main.jpg"
                alt="Happy employees enjoying corporate perks in modern office"
                className="w-full h-auto object-cover"
                loading="eager"
              />
              {/* Subtle overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-corp-light/30 to-transparent" />
            </div>

            {/* Floating Stats Cards - positioned over image */}
            <div 
              ref={statsRef}
              className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-full max-w-3xl px-6"
            >
              <div className="bg-white rounded-2xl shadow-card p-4 md:p-6 grid grid-cols-3 gap-4 md:gap-8">
                <div className="stat-item text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Building2 className="w-5 h-5 text-corp-blue" />
                    <span className="font-montserrat font-bold text-2xl md:text-3xl text-corp-dark">
                      12K+
                    </span>
                  </div>
                  <span className="font-inter text-xs md:text-sm text-corp-gray">
                    Companies
                  </span>
                </div>
                <div className="stat-item text-center border-x border-gray-100">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Users className="w-5 h-5 text-corp-blue" />
                    <span className="font-montserrat font-bold text-2xl md:text-3xl text-corp-dark">
                      5M+
                    </span>
                  </div>
                  <span className="font-inter text-xs md:text-sm text-corp-gray">
                    Employees
                  </span>
                </div>
                <div className="stat-item text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <TrendingUp className="w-5 h-5 text-corp-blue" />
                    <span className="font-montserrat font-bold text-2xl md:text-3xl text-corp-dark">
                      18%
                    </span>
                  </div>
                  <span className="font-inter text-xs md:text-sm text-corp-gray">
                    Avg. Redemption
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trusted By Section */}
        <div 
          ref={badgesRef}
          className="w-full px-6 lg:px-12 pt-16 pb-12"
        >
          <div className="max-w-4xl mx-auto text-center">
            <p className="font-inter text-sm text-corp-gray mb-6 uppercase tracking-wider">
              Trusted by teams at
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
              {trustedCompanies.map((company) => (
                <div 
                  key={company}
                  className="font-montserrat font-bold text-xl md:text-2xl text-gray-300 hover:text-corp-blue transition-colors duration-300"
                >
                  {company}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
