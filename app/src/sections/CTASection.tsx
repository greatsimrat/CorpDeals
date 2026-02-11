import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, MessageCircle, Sparkles, Check } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const benefits = [
  'Free for teams under 100',
  'Setup in 10 minutes',
  'No credit card required',
  'Cancel anytime',
];

const trustedLogos = ['Google', 'Microsoft', 'Amazon', 'Meta', 'Apple'];

const CTASection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: '+=100%',
          pin: true,
          scrub: 0.5,
        },
      });

      // ENTRANCE (0%-30%)
      scrollTl.fromTo(
        cardRef.current,
        { y: '40vh', opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, ease: 'none' },
        0
      );

      scrollTl.fromTo(
        contentRef.current?.querySelectorAll('.animate-item') || [],
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.05, ease: 'none' },
        0.1
      );

      // SETTLE (30%-70%): Hold

      // EXIT (70%-100%)
      scrollTl.fromTo(
        cardRef.current,
        { y: 0, opacity: 1 },
        { y: '-15vh', opacity: 0, ease: 'power2.in' },
        0.7
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full h-screen bg-corp-light overflow-hidden z-90"
      aria-label="Call to Action"
    >
      {/* Main Card */}
      <div
        ref={cardRef}
        className="absolute inset-x-6 lg:inset-x-12 top-1/2 -translate-y-1/2 max-w-5xl mx-auto"
      >
        <div className="bg-white rounded-[32px] shadow-2xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-5">
            
            {/* Left Image */}
            <div className="hidden lg:block lg:col-span-2 relative">
              <img
                src="/cta_image.jpg"
                alt="Team collaborating on employee perks"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/50" />
            </div>

            {/* Right Content */}
            <div
              ref={contentRef}
              className="lg:col-span-3 p-8 lg:p-12 flex flex-col justify-center"
            >
              {/* Badge */}
              <div className="animate-item inline-flex items-center gap-2 px-4 py-2 bg-green-100 rounded-full w-fit mb-6">
                <Sparkles className="w-4 h-4 text-green-600" />
                <span className="font-inter text-sm font-medium text-green-700">
                  Start Free Today
                </span>
              </div>

              {/* Headline */}
              <h2 className="animate-item heading-2 text-corp-dark mb-4">
                READY TO BRING
                <span className="text-corp-blue block">BETTER PERKS?</span>
              </h2>

              {/* Description */}
              <p className="animate-item body-text text-lg mb-6">
                Launch in a day. No integration required. Start free and see why 
                thousands of companies choose CorpDeals.
              </p>

              {/* Benefits */}
              <div className="animate-item flex flex-wrap gap-3 mb-8">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-green-600" />
                    </div>
                    <span className="font-inter text-sm text-corp-gray">{benefit}</span>
                  </div>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="animate-item flex flex-col sm:flex-row gap-4 mb-10">
                <button className="btn-primary flex items-center justify-center gap-2 px-8 py-4 text-base">
                  Request a Demo
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button className="btn-secondary flex items-center justify-center gap-2 px-8 py-4 text-base">
                  <MessageCircle className="w-5 h-5" />
                  Talk to Sales
                </button>
              </div>

              {/* Trust Logos */}
              <div className="animate-item pt-6 border-t border-gray-100">
                <p className="font-inter text-sm text-corp-gray mb-4">
                  Trusted by teams at
                </p>
                <div className="flex flex-wrap items-center gap-6">
                  {trustedLogos.map((logo) => (
                    <span
                      key={logo}
                      className="font-montserrat font-bold text-lg text-gray-300"
                    >
                      {logo}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden absolute inset-0 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
          <h2 className="heading-3 text-corp-dark mb-4">
            READY FOR BETTER PERKS?
          </h2>
          <p className="body-text mb-6">
            Launch in a day. No integration required.
          </p>
          <button className="btn-primary w-full mb-3">
            Request Demo
          </button>
          <button className="btn-secondary w-full">
            Talk to Sales
          </button>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
