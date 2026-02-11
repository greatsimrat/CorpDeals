import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowUpRight, TrendingUp } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const categories = [
  {
    title: 'Travel',
    image: '/category_travel.jpg',
    deals: '2,400+',
    trending: true,
    savings: 'Up to 30%',
    size: 'large',
  },
  {
    title: 'Wellness',
    image: '/category_wellness.jpg',
    deals: '1,800+',
    trending: false,
    savings: 'Up to 25%',
    size: 'large',
  },
  {
    title: 'Tech',
    image: '/category_tech.jpg',
    deals: '950+',
    trending: true,
    savings: 'Up to 20%',
    size: 'wide',
  },
  {
    title: 'Food & Dining',
    image: '/category_food.jpg',
    deals: '3,200+',
    trending: true,
    savings: 'Up to 35%',
    size: 'small',
  },
  {
    title: 'Fitness',
    image: '/category_fitness.jpg',
    deals: '720+',
    trending: false,
    savings: 'Up to 40%',
    size: 'small',
  },
  {
    title: 'Insurance',
    image: '/category_insurance.jpg',
    deals: '150+',
    trending: false,
    savings: 'Up to 15%',
    size: 'small',
  },
];

const CategoriesSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const cards = cardsRef.current?.querySelectorAll('.category-card');
      if (cards) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 50, scale: 0.95 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.6,
            stagger: 0.08,
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
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="categories"
      className="relative w-full bg-corp-light py-20 lg:py-28 z-50"
      aria-label="Deal Categories"
    >
      <div className="w-full px-6 lg:px-12">
        {/* Section Header */}
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row lg:items-end lg:justify-between mb-12">
          <div>
            <span className="eyebrow mb-4 block">BROWSE CATEGORIES</span>
            <h2 className="heading-2 text-corp-dark">
              EXPLORE PERKS BY
              <span className="text-corp-blue block lg:inline"> CATEGORY</span>
            </h2>
          </div>
          <p className="body-text max-w-md mt-4 lg:mt-0">
            From travel to tech, find deals that match your lifestyle. 
            New offers added weekly.
          </p>
        </div>

        {/* Categories Grid */}
        <div
          ref={cardsRef}
          className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {/* Row 1 - Large cards */}
          {categories.slice(0, 2).map((category) => (
            <div
              key={category.title}
              className="category-card group relative overflow-hidden rounded-3xl cursor-pointer lg:col-span-2 h-72 lg:h-80"
            >
              <img
                src={category.image}
                alt={`${category.title} deals and discounts`}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              
              {/* Trending Badge */}
              {category.trending && (
                <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 bg-corp-blue rounded-full">
                  <TrendingUp className="w-3.5 h-3.5 text-white" />
                  <span className="font-inter text-xs font-medium text-white">Trending</span>
                </div>
              )}
              
              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex items-end justify-between">
                  <div>
                    <span className="font-inter text-sm text-white/80 mb-1 block">
                      {category.deals} deals
                    </span>
                    <h3 className="font-montserrat font-bold text-2xl text-white uppercase mb-2">
                      {category.title}
                    </h3>
                    <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-lg font-inter text-sm text-white">
                      {category.savings} off
                    </span>
                  </div>
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:bg-corp-blue transition-all duration-300 group-hover:scale-110">
                    <ArrowUpRight className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Row 2 - Wide card */}
          <div
            className="category-card group relative overflow-hidden rounded-3xl cursor-pointer lg:col-span-2 h-72 lg:h-80"
          >
            <img
              src={categories[2].image}
              alt={`${categories[2].title} deals and discounts`}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            {categories[2].trending && (
              <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 bg-corp-blue rounded-full">
                <TrendingUp className="w-3.5 h-3.5 text-white" />
                <span className="font-inter text-xs font-medium text-white">Trending</span>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="flex items-end justify-between">
                <div>
                  <span className="font-inter text-sm text-white/80 mb-1 block">
                    {categories[2].deals} deals
                  </span>
                  <h3 className="font-montserrat font-bold text-2xl text-white uppercase mb-2">
                    {categories[2].title}
                  </h3>
                  <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-lg font-inter text-sm text-white">
                    {categories[2].savings} off
                  </span>
                </div>
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:bg-corp-blue transition-all duration-300">
                  <ArrowUpRight className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Row 2 - Three smaller cards */}
          {categories.slice(3).map((category) => (
            <div
              key={category.title}
              className="category-card group relative overflow-hidden rounded-3xl cursor-pointer h-64"
            >
              <img
                src={category.image}
                alt={`${category.title} deals and discounts`}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              {category.trending && (
                <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 bg-corp-blue rounded-full">
                  <TrendingUp className="w-3.5 h-3.5 text-white" />
                  <span className="font-inter text-xs font-medium text-white">Trending</span>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <span className="font-inter text-xs text-white/80 mb-1 block">
                  {category.deals} deals
                </span>
                <h3 className="font-montserrat font-bold text-xl text-white uppercase mb-2">
                  {category.title}
                </h3>
                <span className="inline-block px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-lg font-inter text-xs text-white">
                  {category.savings} off
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-12">
          <button className="btn-secondary px-8 py-4">
            View All Categories
          </button>
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
