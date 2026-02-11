import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Quote, Star, ArrowRight, Building2 } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const testimonials = [
  {
    quote: "Our team actually uses these perks. The verification keeps it fair, and the deals are genuinely better than what's public.",
    author: 'Lena Park',
    role: 'People Ops Lead',
    company: 'Northwind',
    rating: 5,
    image: '/testimonial_portrait.jpg',
  },
];

const TestimonialSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const quoteRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);

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
        quoteRef.current?.querySelectorAll('.animate-item') || [],
        { x: '30px', opacity: 0 },
        { x: 0, opacity: 1, stagger: 0.05, ease: 'none' },
        0.1
      );

      scrollTl.fromTo(
        logoRef.current,
        { y: '-20px', opacity: 0 },
        { y: 0, opacity: 1, ease: 'none' },
        0.2
      );

      // SETTLE (30%-70%): Hold

      // EXIT (70%-100%)
      scrollTl.fromTo(
        quoteRef.current,
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

  const testimonial = testimonials[0];

  return (
    <section
      ref={sectionRef}
      id="testimonial"
      className="relative w-full h-screen bg-corp-light overflow-hidden z-70"
      aria-label="Customer Testimonial"
    >
      <div className="absolute inset-0 flex">
        {/* Left Portrait Panel */}
        <div
          ref={imageRef}
          className="hidden lg:block w-1/2 h-full relative"
        >
          <img
            src={testimonial.image}
            alt={`${testimonial.author}, ${testimonial.role} at ${testimonial.company}`}
            className="w-full h-full object-cover"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-corp-light/90" />
        </div>

        {/* Right Quote Panel */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div
            ref={quoteRef}
            className="max-w-lg"
          >
            {/* Quote Icon */}
            <div className="animate-item w-16 h-16 bg-corp-highlight rounded-2xl flex items-center justify-center mb-8">
              <Quote className="w-8 h-8 text-corp-blue" />
            </div>

            {/* Rating */}
            <div className="animate-item flex items-center gap-1 mb-6">
              {[...Array(testimonial.rating)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
              ))}
            </div>

            {/* Quote Text */}
            <blockquote className="animate-item font-inter text-2xl lg:text-3xl text-corp-dark leading-relaxed mb-8">
              "{testimonial.quote}"
            </blockquote>

            {/* Attribution */}
            <div className="animate-item flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-corp-dark rounded-xl flex items-center justify-center">
                <span className="text-white font-montserrat font-bold text-xl">
                  {testimonial.author[0]}
                </span>
              </div>
              <div>
                <p className="font-montserrat font-bold text-lg text-corp-dark">
                  {testimonial.author}
                </p>
                <p className="font-inter text-corp-gray">
                  {testimonial.role}, {testimonial.company}
                </p>
              </div>
            </div>

            {/* CTA */}
            <a
              href="#"
              className="animate-item inline-flex items-center gap-2 text-corp-blue font-inter font-medium hover:underline group"
            >
              Read the full story
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>
      </div>

      {/* Logo Card */}
      <div
        ref={logoRef}
        className="absolute hidden lg:flex items-center gap-3 bg-white rounded-2xl shadow-xl p-4"
        style={{
          left: '45%',
          top: '15%',
        }}
      >
        <div className="w-12 h-12 bg-corp-dark rounded-xl flex items-center justify-center">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <span className="block font-montserrat font-bold text-corp-dark">{testimonial.company}</span>
          <span className="block font-inter text-xs text-corp-gray">Tech Company • 500+ employees</span>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden absolute inset-0 flex flex-col bg-corp-light">
        <div className="h-2/5 relative">
          <img
            src={testimonial.image}
            alt={testimonial.author}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-corp-light" />
        </div>
        <div className="flex-1 px-6 pb-8 flex flex-col justify-center">
          <div className="w-10 h-10 bg-corp-highlight rounded-xl flex items-center justify-center mb-4">
            <Quote className="w-5 h-5 text-corp-blue" />
          </div>
          <div className="flex items-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
            ))}
          </div>
          <blockquote className="font-inter text-lg text-corp-dark leading-relaxed mb-4">
            "{testimonial.quote}"
          </blockquote>
          <p className="font-montserrat font-bold text-corp-dark">
            {testimonial.author}
          </p>
          <p className="font-inter text-sm text-corp-gray">
            {testimonial.role}, {testimonial.company}
          </p>
        </div>
      </div>
    </section>
  );
};

export default TestimonialSection;
