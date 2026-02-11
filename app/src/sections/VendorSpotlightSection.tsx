import { useRef, useLayoutEffect } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Building2, TrendingUp, Target, BarChart3, Check } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const vendorBenefits = [
  'Target specific companies',
  'Verified employee access only',
  'Real-time analytics dashboard',
  'Pay-for-performance pricing',
];

const VendorSpotlightSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: '+=120%',
          pin: true,
          scrub: 0.5,
        },
      });

      // ENTRANCE (0%-30%)
      scrollTl.fromTo(
        imageRef.current,
        { x: '-50vw', opacity: 0 },
        { x: 0, opacity: 1, ease: 'none' },
        0
      );

      scrollTl.fromTo(
        contentRef.current?.querySelectorAll('.animate-item') || [],
        { x: '30px', opacity: 0 },
        { x: 0, opacity: 1, stagger: 0.05, ease: 'none' },
        0.1
      );

      scrollTl.fromTo(
        statsRef.current,
        { y: 30, opacity: 0, scale: 0.9 },
        { y: 0, opacity: 1, scale: 1, ease: 'none' },
        0.2
      );

      // SETTLE (30%-70%): Hold

      // EXIT (70%-100%)
      scrollTl.fromTo(
        contentRef.current,
        { x: 0, opacity: 1 },
        { x: '20vw', opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        imageRef.current,
        { x: 0, opacity: 1 },
        { x: '-20vw', opacity: 0.5, ease: 'power2.in' },
        0.7
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="vendors"
      className="relative w-full h-screen bg-corp-light overflow-hidden z-60"
      aria-label="For Vendors"
    >
      <div className="absolute inset-0 flex">
        {/* Left Image Panel */}
        <div
          ref={imageRef}
          className="hidden lg:block w-1/2 h-full relative"
        >
          <img
            src="/vendor_spotlight.jpg"
            alt="Vendor team collaborating"
            className="w-full h-full object-cover"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-corp-light/90" />
          
          {/* Stats overlay card */}
          <div
            ref={statsRef}
            className="absolute bottom-12 left-12 bg-white rounded-3xl shadow-2xl p-6 max-w-xs"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-corp-blue rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="font-mono text-xs uppercase text-corp-gray">Partner Network</span>
                <span className="block font-montserrat font-bold text-2xl text-corp-dark">
                  12,000+
                </span>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <span className="font-inter text-sm text-corp-dark">
                  <strong>18%</strong> avg. redemption rate
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Content Panel */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div
            ref={contentRef}
            className="max-w-lg"
          >
            {/* Eyebrow */}
            <div className="animate-item inline-flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-full mb-6">
              <Target className="w-4 h-4 text-purple-600" />
              <span className="font-inter text-sm font-medium text-purple-700">
                For Vendors
              </span>
            </div>

            {/* Headline */}
            <h2 className="animate-item heading-2 text-corp-dark mb-6">
              REACH TEAMS THAT
              <span className="text-corp-blue block">ACTUALLY ENGAGE</span>
            </h2>

            {/* Description */}
            <p className="animate-item body-text text-lg mb-8">
              Promote offers to verified employees at companies you choose. 
              Set caps, track redemption, and pay only for results.
            </p>

            {/* Benefits List */}
            <div className="animate-item space-y-3 mb-8">
              {vendorBenefits.map((benefit) => (
                <div key={benefit} className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="font-inter text-corp-dark">{benefit}</span>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="animate-item flex flex-col sm:flex-row gap-4">
              <Link to="/become-partner" className="btn-primary flex items-center justify-center gap-2 px-8 py-4">
                Become a Partner
                <ArrowRight className="w-5 h-5" />
              </Link>
              <button className="btn-secondary flex items-center justify-center gap-2 px-8 py-4">
                <BarChart3 className="w-5 h-5" />
                View Analytics Demo
              </button>
            </div>

            {/* Trust badge */}
            <div className="animate-item mt-8 flex items-center gap-3 pt-6 border-t border-gray-200">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div 
                    key={i}
                    className="w-8 h-8 bg-gray-200 rounded-full border-2 border-white flex items-center justify-center"
                  >
                    <span className="text-xs font-bold text-gray-500">{String.fromCharCode(64 + i)}</span>
                  </div>
                ))}
              </div>
              <p className="font-inter text-sm text-corp-gray">
                <strong>500+</strong> vendors already partnered
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden absolute inset-0 flex flex-col bg-corp-light">
        <div className="h-2/5 relative">
          <img
            src="/vendor_spotlight.jpg"
            alt="Vendor team"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-corp-light" />
        </div>
        <div className="flex-1 px-6 pb-8 flex flex-col justify-center">
          <span className="eyebrow mb-2">FOR VENDORS</span>
          <h2 className="heading-3 text-corp-dark mb-4">
            REACH ENGAGED TEAMS
          </h2>
          <p className="body-text mb-6">
            Promote offers to verified employees at companies you choose.
          </p>
          <Link to="/become-partner" className="btn-primary w-full block text-center">
            Become a Partner
          </Link>
        </div>
      </div>
    </section>
  );
};

export default VendorSpotlightSection;
