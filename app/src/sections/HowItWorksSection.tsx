import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Search, ShieldCheck, Unlock, ArrowRight, Zap, Lock, Gift } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    number: '01',
    title: 'Find Your Company',
    description: 'Search for your employer in our database of 12,000+ companies.',
    icon: Search,
    color: 'bg-blue-500',
    lightColor: 'bg-blue-50',
    features: ['Instant search', '12K+ companies', 'Auto-complete'],
  },
  {
    number: '02',
    title: 'Verify in Seconds',
    description: 'We confirm your employment status securely—no paperwork needed.',
    icon: ShieldCheck,
    color: 'bg-green-500',
    lightColor: 'bg-green-50',
    features: ['Work email verify', 'SSO login', 'HR portal connect'],
  },
  {
    number: '03',
    title: 'Unlock Exclusive Deals',
    description: 'Access hundreds of discounts and perks instantly. Start saving today.',
    icon: Unlock,
    color: 'bg-purple-500',
    lightColor: 'bg-purple-50',
    features: ['Instant access', 'No limits', 'New deals weekly'],
  },
];

const HowItWorksSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // Cards animation with stagger
      const cards = cardsRef.current?.querySelectorAll('.step-card');
      if (cards) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 60, rotateX: -10 },
          {
            opacity: 1,
            y: 0,
            rotateX: 0,
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

      // Visual flow animation
      gsap.fromTo(
        visualRef.current,
        { opacity: 0, scale: 0.95 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: visualRef.current,
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
      id="how-it-works"
      className="relative w-full bg-corp-light py-20 lg:py-28 z-30"
      aria-label="How It Works"
    >
      <div className="w-full px-6 lg:px-12">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="eyebrow mb-4 block">SIMPLE PROCESS</span>
          <h2 className="heading-2 text-corp-dark mb-4">
            HOW CORPDEALS WORKS
          </h2>
          <p className="body-text text-lg max-w-xl mx-auto">
            Get access to exclusive employee perks in three simple steps. 
            No complicated setup, no hidden fees.
          </p>
        </div>

        {/* Steps Cards */}
        <div
          ref={cardsRef}
          className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-16"
        >
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="step-card group relative bg-white rounded-3xl p-8 hover:shadow-card-hover transition-all duration-500"
                style={{ perspective: '1000px' }}
              >
                {/* Step Number Badge */}
                <div className={`absolute -top-4 left-8 ${step.color} text-white px-4 py-1 rounded-full font-mono text-sm font-bold`}>
                  STEP {step.number}
                </div>

                {/* Icon */}
                <div className={`w-16 h-16 ${step.lightColor} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-8 h-8 ${step.color.replace('bg-', 'text-').replace('500', '600')}`} />
                </div>

                {/* Content */}
                <h3 className="font-montserrat font-bold text-xl text-corp-dark mb-3 uppercase tracking-wide">
                  {step.title}
                </h3>
                <p className="body-text mb-6">
                  {step.description}
                </p>

                {/* Features List */}
                <ul className="space-y-2">
                  {step.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <div className={`w-5 h-5 ${step.lightColor} rounded-full flex items-center justify-center`}>
                        <Zap className={`w-3 h-3 ${step.color.replace('bg-', 'text-').replace('500', '600')}`} />
                      </div>
                      <span className="font-inter text-sm text-corp-gray">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Arrow connector (desktop) */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <div className="w-8 h-8 bg-corp-blue rounded-full flex items-center justify-center shadow-lg">
                      <ArrowRight className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Visual Journey Flow */}
        <div
          ref={visualRef}
          className="max-w-4xl mx-auto"
        >
          <div className="bg-white rounded-3xl shadow-card p-6 lg:p-8">
            <h3 className="font-montserrat font-bold text-lg text-corp-dark text-center mb-6">
              THE EMPLOYEE JOURNEY
            </h3>
            
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
              {/* Step 1 */}
              <div className="flex items-center gap-4 w-full lg:w-auto">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Search className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-inter font-medium text-corp-dark">Search Company</p>
                  <p className="font-inter text-sm text-corp-gray">e.g., Amazon</p>
                </div>
              </div>

              {/* Arrow */}
              <div className="hidden lg:block">
                <ArrowRight className="w-6 h-6 text-corp-blue" />
              </div>
              <div className="lg:hidden rotate-90">
                <ArrowRight className="w-6 h-6 text-corp-blue" />
              </div>

              {/* Step 2 */}
              <div className="flex items-center gap-4 w-full lg:w-auto">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Lock className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-inter font-medium text-corp-dark">Verify Identity</p>
                  <p className="font-inter text-sm text-corp-gray">Work email check</p>
                </div>
              </div>

              {/* Arrow */}
              <div className="hidden lg:block">
                <ArrowRight className="w-6 h-6 text-corp-blue" />
              </div>
              <div className="lg:hidden rotate-90">
                <ArrowRight className="w-6 h-6 text-corp-blue" />
              </div>

              {/* Step 3 */}
              <div className="flex items-center gap-4 w-full lg:w-auto">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Gift className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="font-inter font-medium text-corp-dark">Access Deals</p>
                  <p className="font-inter text-sm text-corp-gray">Start saving!</p>
                </div>
              </div>
            </div>

            {/* Example */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-center gap-2 text-sm text-corp-gray">
                <span className="font-inter">Example:</span>
                <span className="px-3 py-1 bg-gray-100 rounded-full font-inter">Amazon employee</span>
                <span>→</span>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-inter">Verified ✓</span>
                <span>→</span>
                <span className="px-3 py-1 bg-corp-blue text-white rounded-full font-inter">245 deals unlocked!</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
