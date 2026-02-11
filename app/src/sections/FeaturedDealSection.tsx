import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Percent, Clock, Users, Star } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const dealHighlights = [
  { icon: Percent, label: 'Up to 40% off', sublabel: 'Top brands' },
  { icon: Clock, label: 'Limited time', sublabel: 'Flash deals' },
  { icon: Users, label: 'Employee only', sublabel: 'Verified access' },
];

const FeaturedDealSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
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
        cardRef.current,
        { x: '50vw', opacity: 0, scale: 0.95 },
        { x: 0, opacity: 1, scale: 1, ease: 'none' },
        0
      );

      scrollTl.fromTo(
        contentRef.current?.querySelectorAll('.animate-item') || [],
        { x: '-30px', opacity: 0 },
        { x: 0, opacity: 1, stagger: 0.05, ease: 'none' },
        0.1
      );

      scrollTl.fromTo(
        statsRef.current?.querySelectorAll('.stat-pill') || [],
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.05, ease: 'none' },
        0.2
      );

      // SETTLE (30%-70%): Hold

      // EXIT (70%-100%)
      scrollTl.fromTo(
        cardRef.current,
        { x: 0, opacity: 1 },
        { x: '-30vw', opacity: 0, ease: 'power2.in' },
        0.7
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full h-screen bg-corp-light overflow-hidden z-40"
      aria-label="Featured Deal"
    >
      {/* Main Card Container */}
      <div
        ref={cardRef}
        className="absolute inset-x-6 lg:inset-x-12 top-1/2 -translate-y-1/2 max-w-6xl mx-auto"
      >
        <div className="bg-white rounded-[32px] shadow-2xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            
            {/* Left Content */}
            <div
              ref={contentRef}
              className="p-8 lg:p-12 flex flex-col justify-center order-2 lg:order-1"
            >
              {/* Badge */}
              <div className="animate-item inline-flex items-center gap-2 px-4 py-2 bg-amber-100 rounded-full w-fit mb-6">
                <Star className="w-4 h-4 text-amber-600 fill-amber-600" />
                <span className="font-inter text-sm font-medium text-amber-700">
                  Featured Deal
                </span>
              </div>

              {/* Headline */}
              <h2 className="animate-item heading-2 text-corp-dark mb-4">
                SAVE ON EVERYDAY
                <span className="text-corp-blue block">ESSENTIALS</span>
              </h2>

              {/* Description */}
              <p className="animate-item body-text text-lg mb-8">
                From daily essentials to big purchases—employees get verified access 
                to discounts that actually matter. Average savings of $2,500 per year.
              </p>

              {/* Stats Pills */}
              <div ref={statsRef} className="animate-item flex flex-wrap gap-3 mb-8">
                {dealHighlights.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div 
                      key={item.label}
                      className="stat-pill flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-xl"
                    >
                      <Icon className="w-5 h-5 text-corp-blue" />
                      <div>
                        <span className="font-inter text-sm font-medium text-corp-dark block">
                          {item.label}
                        </span>
                        <span className="font-inter text-xs text-corp-gray">
                          {item.sublabel}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* CTA */}
              <div className="animate-item flex flex-col sm:flex-row gap-4">
                <button className="btn-primary flex items-center justify-center gap-2 px-8 py-4">
                  Browse All Deals
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button className="btn-secondary flex items-center justify-center gap-2 px-8 py-4">
                  See How It Works
                </button>
              </div>
            </div>

            {/* Right Image */}
            <div className="relative h-64 lg:h-auto order-1 lg:order-2">
              <img
                src="/featured_deal.jpg"
                alt="Employee enjoying coffee with exclusive discount"
                className="w-full h-full object-cover"
              />
              {/* Gradient overlay for mobile */}
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent lg:bg-gradient-to-l" />
              
              {/* Floating discount badge */}
              <div className="absolute top-6 right-6 bg-white rounded-2xl shadow-lg p-4">
                <div className="text-center">
                  <span className="block font-montserrat font-bold text-3xl text-corp-blue">
                    40%
                  </span>
                  <span className="block font-inter text-xs text-corp-gray">
                    MAX SAVINGS
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedDealSection;
