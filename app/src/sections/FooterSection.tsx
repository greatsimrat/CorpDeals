import { Link } from 'react-router-dom';

const primaryLinks = [
  { label: 'For Employees', href: '/for-employees' },
  { label: 'For HR Teams', href: '/for-hr-teams' },
  { label: 'For Partners', href: '/for-vendors' },
];

const secondaryLinks = [
  { label: 'About', href: '/about' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Contact Us', href: '/contact' },
  { label: 'Vendor Login', href: '/vendor/login' },
];

const legalLinks = [
  { label: 'Policies', href: '/policies' },
  { label: 'Privacy', href: '/privacy-policy' },
  { label: 'Terms', href: '/terms-of-service' },
  { label: 'Cookies', href: '/cookie-policy' },
];

const FooterSection = () => {
  return (
    <footer className="relative w-full bg-corp-dark py-10" role="contentinfo">
      <div className="mx-auto max-w-6xl px-6 lg:px-12">
        <div className="flex flex-col gap-10 rounded-[2rem] border border-white/8 bg-white/[0.03] px-6 py-8 sm:px-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-md">
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-corp-blue shadow-lg shadow-blue-950/30">
                <span className="font-montserrat text-lg font-bold text-white">C</span>
              </div>
              <div>
                <p className="font-montserrat text-xl font-bold text-white">CorpDeals</p>
                <p className="text-sm text-slate-400">Employee perks, organized by company</p>
              </div>
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
              Search your company, verify your work email once, and unlock employee-only deals
              that actually match your workplace.
            </p>

            <Link
              to="/contact"
              className="mt-5 inline-flex text-sm font-semibold text-blue-300 transition hover:text-white"
            >
              Contact Us
            </Link>
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Explore
              </p>
              <ul className="mt-4 space-y-3">
                {primaryLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-sm text-slate-300 transition hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Company
              </p>
              <ul className="mt-4 space-y-3">
                {secondaryLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-sm text-slate-300 transition hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 border-t border-white/8 pt-5 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>(c) 2026 CorpDeals. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-5">
            {legalLinks.map((link) => (
              <Link key={link.label} to={link.href} className="transition hover:text-white">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
