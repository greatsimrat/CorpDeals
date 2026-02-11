import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Settings, BarChart3, Check, Zap, Shield, Clock } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    title: 'Set Your Own Rules',
    description: 'Choose which companies see your offers. Set caps. Pause anytime. You\'re in control.',
    icon: Settings,
    color: 'bg-blue-500',
    lightColor: 'bg-blue-50',
    benefits: [
      'Company-specific targeting',
      'Daily/weekly offer caps',
      'Pause/resume instantly',
      'Custom eligibility rules',
    ],
  },
  {
    title: 'See What Works',
    description: 'Track views, redemptions, and revenue—without the spreadsheet chaos.',
    icon: BarChart3,
    color: 'bg-purple-500',
    lightColor: 'bg-purple-50',
    benefits: [
      'Real-time redemption tracking',
      'Revenue attribution',
      'Employee engagement metrics',
      'Exportable reports',
    ],
  },
];

const VendorFeaturesSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const analyticsRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // Cards animation
      const cards = cardsRef.current?.querySelectorAll('.feature-card');
      if (cards) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 50, rotateY: -10 },
          {
            opacity: 1,
            y: 0,
            rotateY: 0,
            duration: 0.8,
            stagger: 0.15,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: cardsRef.current,
              start: 'top 80%',
              end: 'top 40%',
              scrub: true,
            },
          }
        );
      }

      // Analytics image animation
      gsap.fromTo(
        analyticsRef.current,
        { opacity: 0, scale: 0.95, y: 30 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: analyticsRef.current,
            start: 'top 85%',
            end: 'top 55%',
            scrub: true,
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full bg-corp-light py-20 lg:py-28 z-80"
      aria-label="Vendor Features"
    >
      <div className="w-full px-6 lg:px-12">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="eyebrow mb-4 block">VENDOR TOOLS</span>
          <h2 className="heading-2 text-corp-dark mb-4">
            EVERYTHING YOU NEED
            <span className="text-corp-blue block">TO SUCCEED</span>
          </h2>
          <p className="body-text text-lg max-w-xl mx-auto">
            Powerful tools to manage your offers, track performance, and grow your business.
          </p>
        </div>

        {/* Feature Cards */}
        <div
          ref={cardsRef}
          className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-16"
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="feature-card bg-white rounded-3xl p-8 hover:shadow-card-hover transition-all duration-500 group"
              >
                {/* Icon */}
                <div className={`w-16 h-16 ${feature.lightColor} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-8 h-8 ${feature.color.replace('bg-', 'text-').replace('500', '600')}`} />
                </div>

                {/* Content */}
                <h3 className="font-montserrat font-bold text-2xl text-corp-dark mb-3 uppercase tracking-wide">
                  {feature.title}
                </h3>
                <p className="body-text mb-6">
                  {feature.description}
                </p>

                {/* Benefits List */}
                <ul className="space-y-3">
                  {feature.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-3">
                      <div className={`w-6 h-6 ${feature.lightColor} rounded-full flex items-center justify-center`}>
                        <Check className={`w-4 h-4 ${feature.color.replace('bg-', 'text-').replace('500', '600')}`} />
                      </div>
                      <span className="font-inter text-corp-dark">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Analytics Preview */}
        <div ref={analyticsRef} className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl shadow-card overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-montserrat font-bold text-lg text-corp-dark">
                  ANALYTICS DASHBOARD
                </h3>
                <p className="font-inter text-sm text-corp-gray">
                  Real-time insights into your offer performance
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="font-inter text-sm text-corp-gray">Live</span>
              </div>
            </div>
            <div className="relative">
              <img
                src="/vendor_analytics.jpg"
                alt="Vendor analytics dashboard showing charts and metrics"
                className="w-full h-auto"
              />
              {/* Overlay stats */}
              <div className="absolute bottom-4 left-4 right-4 flex justify-between">
                <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2">
                  <span className="font-inter text-xs text-corp-gray">Today's Redemptions</span>
                  <span className="block font-montserrat font-bold text-xl text-corp-dark">1,247</span>
                </div>
                <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2">
                  <span className="font-inter text-xs text-corp-gray">Revenue</span>
                  <span className="block font-montserrat font-bold text-xl text-green-600">+$48.2K</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Features Grid */}
        <div className="max-w-4xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-4 p-6 bg-white rounded-2xl">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Zap className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h4 className="font-montserrat font-bold text-corp-dark mb-1">Instant Setup</h4>
              <p className="font-inter text-sm text-corp-gray">Go live in under 10 minutes</p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-6 bg-white rounded-2xl">
            <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h4 className="font-montserrat font-bold text-corp-dark mb-1">Secure & Compliant</h4>
              <p className="font-inter text-sm text-corp-gray">SOC 2 Type II certified</p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-6 bg-white rounded-2xl">
            <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Clock className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <h4 className="font-montserrat font-bold text-corp-dark mb-1">24/7 Support</h4>
              <p className="font-inter text-sm text-corp-gray">Dedicated account manager</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VendorFeaturesSection;
