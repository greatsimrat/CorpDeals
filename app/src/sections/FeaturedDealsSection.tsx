import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Star } from 'lucide-react';
import { offers } from '../data/offers';

gsap.registerPlugin(ScrollTrigger);

const FeaturedDealsSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  const featuredOffers = offers.filter(o => o.featured).slice(0, 3);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const cards = cardsRef.current?.querySelectorAll('.deal-card');
      if (cards) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 50 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: cardsRef.current,
              start: 'top 80%',
              end: 'top 50%',
              scrub: true,
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full bg-corp-light py-20 lg:py-28 z-40"
    >
      <div className="w-full px-6 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="eyebrow mb-4 block">TRENDING NOW</span>
            <h2 className="heading-2 text-corp-dark mb-4">
              FEATURED DEALS
            </h2>
            <p className="body-text text-lg max-w-xl mx-auto">
              Handpicked offers with the highest savings and best employee reviews.
            </p>
          </div>

          <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredOffers.map((offer) => (
              <a
                key={offer.id}
                href={`/offer/${offer.id}`}
                className="deal-card group bg-white rounded-2xl shadow-card overflow-hidden hover:shadow-card-hover transition-all duration-300"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={offer.image}
                    alt={offer.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4 bg-corp-blue text-white px-3 py-1 rounded-full text-sm font-inter font-medium">
                    {offer.discountValue}
                  </div>
                  <div className="absolute top-4 right-4 bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-inter font-medium flex items-center gap-1">
                    <Star className="w-3 h-3 fill-white" /> Featured
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-bold">
                      {offer.vendorLogo}
                    </div>
                    <span className="font-inter text-sm text-corp-gray">{offer.vendorName}</span>
                  </div>
                  <h3 className="font-montserrat font-bold text-lg text-corp-dark mb-2 line-clamp-2">
                    {offer.title}
                  </h3>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span className="font-inter text-sm text-corp-gray">{offer.rating}</span>
                    </div>
                    <span className="text-corp-blue font-inter text-sm font-medium flex items-center gap-1">
                      View Deal <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedDealsSection;
