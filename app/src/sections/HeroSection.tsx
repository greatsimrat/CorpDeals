import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ArrowRight, Building2, CheckCircle2, TrendingUp, Users } from 'lucide-react';

const trustedCompanies = [
  { name: 'Amazon', src: '/company-logos/amazon.svg', imgClassName: 'h-10 md:h-11' },
  { name: 'Microsoft', src: '/company-logos/microsoft.svg', imgClassName: 'h-10 md:h-11' },
  { name: 'Google', src: '/company-logos/google.svg', imgClassName: 'h-10 md:h-11' },
  { name: 'BC Hydro', src: '/company-logos/bchydro.svg', imgClassName: 'h-12 md:h-[3.35rem]' },
  {
    name: 'City of Surrey',
    src: '/company-logos/cityofsurrey.svg',
    logoSurfaceClass: 'rounded-xl bg-[#0054A6] px-3 py-2',
    imgClassName: 'h-10 md:h-11',
  },
  { name: 'Fraser Health', src: '/company-logos/fraserhealth.svg', imgClassName: 'h-12 md:h-[3.1rem]' },
  { name: 'Salesforce', src: '/company-logos/salesforce.svg', imgClassName: 'h-12 md:h-[3.15rem]' },
  { name: 'Adobe', src: '/company-logos/adobe.svg', imgClassName: 'h-10 md:h-11' },
  { name: 'Shopify', src: '/company-logos/shopify.svg', imgClassName: 'h-12 md:h-[3.15rem]' },
  { name: 'Dell', src: '/company-logos/dell.svg', imgClassName: 'h-12 md:h-[3.2rem]' },
  { name: 'Samsung', src: '/company-logos/samsung.svg', imgClassName: 'h-11 md:h-12' },
  { name: 'PayPal', src: '/company-logos/paypal.svg', imgClassName: 'h-11 md:h-12' },
];

const proofPoints = [
  'Verify your work email once',
  'Access trusted EPP and exclusive corporate offers',
  'See deals matched to your company and location',
];

const HeroSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const trustRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });

      timeline.fromTo(
        contentRef.current?.querySelectorAll('.hero-copy') || [],
        { opacity: 0, y: 28 },
        { opacity: 1, y: 0, duration: 0.72, stagger: 0.1 },
        0.1
      );

      timeline.fromTo(
        imageRef.current,
        { opacity: 0, x: 40, scale: 0.97 },
        { opacity: 1, x: 0, scale: 1, duration: 0.9 },
        0.22
      );

      timeline.fromTo(
        trustRef.current?.querySelectorAll('.hero-trust-item') || [],
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.06 },
        0.5
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_34%),linear-gradient(180deg,#ffffff_0%,#f8fbff_54%,#eef4ff_100%)]"
      aria-label="Hero Section"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8rem] top-[-6rem] h-72 w-72 rounded-full bg-blue-200/35 blur-3xl" />
        <div className="absolute bottom-[-10rem] right-[-4rem] h-80 w-80 rounded-full bg-amber-100/55 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 pb-14 pt-28 lg:px-12 lg:pb-20 lg:pt-32">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(460px,1.1fr)] lg:gap-14">
          <div ref={contentRef} className="max-w-2xl">
            <div className="hero-copy inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/90 px-4 py-2 text-sm font-medium text-blue-700 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Trusted Employee Purchase Program (EPP) access
            </div>

            <h1 className="hero-copy mt-6 font-montserrat text-4xl font-bold leading-[1.02] tracking-[-0.03em] text-slate-950 sm:text-5xl lg:text-6xl">
              Unlock exclusive Employee Purchase Program (EPP) deals through your company
            </h1>

            <p className="hero-copy mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              Search your employer, verify your work email once, and access trusted Employee
              Purchase Program (EPP) and exclusive corporate offers across telecom, banking,
              travel, wellness, and more.
            </p>

            <div className="hero-copy mt-8 flex flex-col items-start gap-3 sm:flex-row">
              <a
                href="#search"
                className="inline-flex items-center gap-2 rounded-2xl bg-corp-blue px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700"
              >
                View my company deals
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                to="/verify"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Verify work email
              </Link>
            </div>

            <p className="hero-copy mt-4 text-sm text-slate-600">
              Includes trusted EPP and exclusive employee offers from leading brands.
            </p>

            <div className="hero-copy mt-3 flex flex-wrap items-center gap-4 text-sm">
              <a href="#how-it-works" className="font-medium text-corp-blue hover:underline">
                How it works
              </a>
              <Link to="/for-vendors" className="font-medium text-corp-blue hover:underline">
                For vendors
              </Link>
              <Link to="/pricing" className="font-medium text-corp-blue hover:underline">
                Pricing
              </Link>
            </div>

            <div className="hero-copy mt-8 grid gap-3 sm:grid-cols-3">
              {proofPoints.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/80 bg-white/85 px-4 py-4 shadow-sm backdrop-blur"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                    <p className="text-sm font-medium leading-6 text-slate-700">{item}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div ref={imageRef} className="relative">
            <div className="absolute -left-5 top-10 hidden rounded-2xl border border-white/80 bg-white/95 px-4 py-3 shadow-xl backdrop-blur md:block">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">How it works</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">Search. Verify. Unlock EPP deals.</p>
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white p-3 shadow-[0_32px_70px_-28px_rgba(15,23,42,0.38)]">
              <div className="overflow-hidden rounded-[1.5rem]">
                <img
                  src="/CorpDeals-hero1.webp"
                  alt="Professionals reviewing employee discount options together"
                  className="h-[320px] w-full object-cover object-center sm:h-[420px] lg:h-[520px]"
                  loading="eager"
                />
              </div>
            </div>

            <div className="relative z-10 mx-auto -mt-10 grid max-w-xl gap-3 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-xl sm:grid-cols-3 sm:p-5">
              <div className="rounded-2xl bg-slate-50 px-4 py-4 text-left">
                <div className="flex items-center gap-2 text-blue-700">
                  <Building2 className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Access</span>
                </div>
                <p className="mt-2 text-xl font-bold text-slate-950">Company-specific</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Deals matched to your employer profile</p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-4 text-left">
                <div className="flex items-center gap-2 text-violet-700">
                  <Users className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Offer quality</span>
                </div>
                <p className="mt-2 text-xl font-bold text-slate-950">Trusted EPP + corporate</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Verified employee-focused offer access</p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-4 text-left">
                <div className="flex items-center gap-2 text-emerald-700">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Coverage</span>
                </div>
                <p className="mt-2 text-xl font-bold text-slate-950">Telecom to wellness</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Key categories employees use most</p>
              </div>
            </div>

          </div>
        </div>

        <div
          ref={trustRef}
          className="mt-12 border-t border-slate-200/80 pt-8 sm:mt-14 lg:mt-16"
        >
          <p className="text-left text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
            Employers in the CorpDeals search network include
          </p>

          <div className="logo-marquee mt-6">
            <div className="logo-marquee-track">
              {[...trustedCompanies, ...trustedCompanies].map((company, index) => (
                <div
                  key={`${company.name}-${index}`}
                  className="hero-trust-item logo-marquee-item flex h-16 items-center justify-center"
                  aria-hidden={index >= trustedCompanies.length}
                >
                  <div className={company.logoSurfaceClass || ''}>
                    <img
                      src={company.src}
                      alt={index < trustedCompanies.length ? company.name : ''}
                      className={`h-10 w-auto max-w-none object-contain md:h-11 ${company.imgClassName || ''}`}
                    />
                  </div>
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
