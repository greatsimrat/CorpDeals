import { useRef, useLayoutEffect } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Building2, TrendingUp, Users, DollarSign } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const VendorCTASection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: contentRef.current,
            start: 'top 80%',
            end: 'top 50%',
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
      className="relative w-full bg-corp-light py-20 lg:py-28 z-60"
    >
      <div className="w-full px-6 lg:px-12">
        <div ref={contentRef} className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-br from-corp-dark to-gray-900 rounded-3xl p-8 lg:p-16 text-white overflow-hidden relative">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-96 h-96 bg-corp-blue rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full blur-3xl" />
            </div>
            
            <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full mb-6">
                  <Building2 className="w-4 h-4" />
                  <span className="font-inter text-sm">For Vendors</span>
                </div>
                <h2 className="font-montserrat font-bold text-3xl lg:text-4xl mb-4">
                  REACH VERIFIED EMPLOYEES
                </h2>
                <p className="font-inter text-white/70 text-lg mb-8">
                  Partner with CorpDeals to promote your offers to employees at 
                  12,000+ companies. Pay only for results.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link to="/become-partner" className="btn-primary flex items-center justify-center gap-2">
                    Become a Partner
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <button className="px-6 py-3 bg-white/10 rounded-xl font-inter hover:bg-white/20 transition-colors">
                    Learn More
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                  <Users className="w-8 h-8 mb-4 text-corp-blue" />
                  <span className="block font-montserrat font-bold text-3xl">12K+</span>
                  <span className="font-inter text-white/60 text-sm">Companies</span>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                  <TrendingUp className="w-8 h-8 mb-4 text-green-400" />
                  <span className="block font-montserrat font-bold text-3xl">18%</span>
                  <span className="font-inter text-white/60 text-sm">Avg. Conversion</span>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                  <DollarSign className="w-8 h-8 mb-4 text-amber-400" />
                  <span className="block font-montserrat font-bold text-3xl">$2.5K</span>
                  <span className="font-inter text-white/60 text-sm">Avg. Deal Value</span>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                  <Building2 className="w-8 h-8 mb-4 text-purple-400" />
                  <span className="block font-montserrat font-bold text-3xl">500+</span>
                  <span className="font-inter text-white/60 text-sm">Partners</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VendorCTASection;
