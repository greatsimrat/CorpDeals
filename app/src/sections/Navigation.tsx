import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  ChevronDown,
  LogOut,
  Mail,
  MapPin,
  Menu,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getUserDisplayName, getUserInitials } from '../lib/auth';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

const Navigation = () => {
  const { user, isAuthenticated, logout, role, hasVendorAccess } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const displayName = getUserDisplayName(user);
  const initials = getUserInitials(user);
  const loginEmail = user?.loginEmail || user?.email || '';
  const isInternalPortalRole = role === 'ADMIN' || role === 'SALES' || role === 'FINANCE';
  const profileCompany =
    user?.activeVerification?.company?.name ||
    user?.activeCompany?.name ||
    user?.employeeCompany?.name ||
    (role === 'VENDOR' ? user?.vendor?.companyName : null) ||
    null;
  const profileLocation =
    user?.cityName && user?.provinceCode
      ? `${user.cityName}, ${user.provinceCode}`
      : user?.provinceCode || 'Location not set';

  const verificationLabel = user?.activeVerification
    ? `Verified: ${user.activeVerification.company.name} (valid until ${new Date(
        user.activeVerification.expiresAt
      ).toLocaleDateString()})`
    : user?.latestVerification?.status === 'expired'
    ? 'Verification expired - re-verify'
    : null;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    // Track active section for highlighting
    const handleSectionObserver = () => {
      const sections = ['search', 'how-it-works', 'vendors', 'testimonial'];
      const observerOptions = {
        rootMargin: '-50% 0px -50% 0px',
        threshold: 0,
      };

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      }, observerOptions);

      sections.forEach((sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) observer.observe(element);
      });

      return () => observer.disconnect();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    const cleanup = handleSectionObserver();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      cleanup?.();
    };
  }, []);

  const navLinks = [
    { label: 'Find Perks', href: '#search', id: 'search' },
    { label: 'How It Works', href: '#how-it-works', id: 'how-it-works' },
    { label: 'For Vendors', href: '#vendors', id: 'vendors' },
  ];

  const accountLink =
    role === 'ADMIN'
      ? { to: '/admin', label: 'Admin' }
      : role === 'SALES'
      ? { to: '/sales', label: 'Sales' }
      : role === 'FINANCE'
      ? { to: '/finance', label: 'Finance' }
      : role === 'VENDOR' || hasVendorAccess
      ? { to: '/vendor/dashboard', label: 'Vendor Dashboard' }
      : role === 'USER'
      ? { to: '/my-applications', label: 'My Applications' }
      : null;

  const authLandingPath =
    user?.activeVerification?.company?.slug ||
    user?.activeCompany?.slug ||
    user?.employeeCompany?.slug
      ? `/c/${
          user?.activeVerification?.company?.slug ||
          user?.activeCompany?.slug ||
          user?.employeeCompany?.slug
        }`
      : '/';

  const loggedInLinks = [
    { label: 'Find Perks', to: authLandingPath },
    ...(accountLink ? [{ label: accountLink.label, to: accountLink.to }] : []),
  ];

  const verificationStatusText = user?.activeVerification
    ? `Verified until ${new Date(user.activeVerification.expiresAt).toLocaleDateString()}`
    : user?.latestVerification?.status === 'expired'
    ? 'Verification expired'
    : 'Verification pending';

  const scrollToSection = (href: string) => {
    if (pathname !== '/') {
      navigate(`/${href}`);
      setIsMobileMenuOpen(false);
      return;
    }

    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-lg shadow-sm'
          : 'bg-transparent'
      }`}
      role="navigation"
      aria-label="Main Navigation"
    >
      <div className="w-full px-6 lg:px-12">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center gap-2 group"
            aria-label="CorpDeals Home"
          >
            <div className="w-9 h-9 bg-corp-blue rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="text-white font-montserrat font-bold text-lg">C</span>
            </div>
            <span className="font-montserrat font-bold text-xl text-corp-dark">
              CorpDeals
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {isAuthenticated
              ? loggedInLinks.map((link) => (
                  <Link
                    key={link.label}
                    to={link.to}
                    className={`px-4 py-2 rounded-lg font-inter text-sm transition-all duration-300 ${
                      pathname === link.to
                        ? 'text-corp-blue bg-corp-highlight'
                        : 'text-corp-dark hover:text-corp-blue hover:bg-gray-50'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))
              : navLinks.map((link) => (
                  <button
                    key={link.label}
                    onClick={() => scrollToSection(link.href)}
                    className={`px-4 py-2 rounded-lg font-inter text-sm transition-all duration-300 ${
                      activeSection === link.id
                        ? 'text-corp-blue bg-corp-highlight'
                        : 'text-corp-dark hover:text-corp-blue hover:bg-gray-50'
                    }`}
                  >
                    {link.label}
                  </button>
                ))}
            {!isAuthenticated && (
              <Link
                to="/pricing"
                className={`px-4 py-2 rounded-lg font-inter text-sm transition-all duration-300 ${
                  pathname === '/pricing'
                    ? 'text-corp-blue bg-corp-highlight'
                    : 'text-corp-dark hover:text-corp-blue hover:bg-gray-50'
                }`}
              >
                Pricing
              </Link>
            )}
          </div>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/vendor/apply"
                  className="font-inter text-sm text-corp-dark hover:text-corp-blue transition-colors px-4 py-2"
                >
                  Be Our Partner
                </Link>
                <Link to="/login" className="btn-primary text-sm">
                  Sign In / Sign Up
                </Link>
              </>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1.5 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                    aria-label="Open profile menu"
                  >
                    <Avatar className="h-9 w-9 border border-slate-200">
                      <AvatarFallback className="bg-blue-100 text-sm font-bold text-blue-700">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 rounded-2xl border-slate-200 p-0">
                  <div className="border-b border-slate-100 px-4 py-4">
                    <p className="text-base font-semibold text-slate-900">{displayName}</p>
                    <p className="mt-1 text-sm text-slate-500">{loginEmail}</p>
                  </div>
                  <div className="space-y-3 px-4 py-4 text-sm text-slate-600">
                    <div className="flex items-start gap-3">
                      <Building2 className="mt-0.5 h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Company</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {profileCompany || 'No company linked'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Location</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">{profileLocation}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Verification</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {verificationStatusText}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Mail className="mt-0.5 h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Email</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">{loginEmail}</p>
                      </div>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <div className="p-2">
                    {isInternalPortalRole && accountLink ? (
                      <DropdownMenuItem asChild>
                        <Link to={accountLink.to}>{accountLink.label}</Link>
                      </DropdownMenuItem>
                    ) : null}
                    {verificationLabel && !isInternalPortalRole ? (
                      <DropdownMenuItem asChild>
                        <Link
                          to={
                            user?.latestVerification?.company?.slug
                              ? `/verify?company=${encodeURIComponent(user.latestVerification.company.slug)}`
                              : '/verify'
                          }
                        >
                          Verification details
                        </Link>
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuItem
                      onSelect={() => {
                        logout();
                        navigate('/');
                      }}
                      className="text-red-600 focus:text-red-600"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white p-1 shadow-sm"
                    aria-label="Open profile menu"
                  >
                    <Avatar className="h-9 w-9 border border-slate-200">
                      <AvatarFallback className="bg-blue-100 text-sm font-bold text-blue-700">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 rounded-2xl border-slate-200 p-0">
                  <div className="border-b border-slate-100 px-4 py-4">
                    <p className="text-base font-semibold text-slate-900">{displayName}</p>
                    <p className="mt-1 text-sm text-slate-500">{loginEmail}</p>
                  </div>
                  <div className="space-y-3 px-4 py-4 text-sm text-slate-600">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Company</p>
                      <p className="mt-1 font-medium text-slate-900">
                        {profileCompany || 'No company linked'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Location</p>
                      <p className="mt-1 font-medium text-slate-900">{profileLocation}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Verification</p>
                      <p className="mt-1 font-medium text-slate-900">{verificationStatusText}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Email</p>
                      <p className="mt-1 font-medium text-slate-900">{loginEmail}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <div className="p-2">
                    <DropdownMenuItem
                      onSelect={() => {
                        logout();
                        navigate('/');
                      }}
                      className="text-red-600 focus:text-red-600"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            <button
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6 text-corp-dark" />
              ) : (
                <Menu className="w-6 h-6 text-corp-dark" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div 
        className={`lg:hidden bg-white border-t border-gray-100 transition-all duration-300 ${
          isMobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
        }`}
      >
        <div className="px-6 py-4 space-y-2">
          {isAuthenticated
            ? loggedInLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block w-full text-left px-4 py-3 rounded-lg font-inter text-sm transition-colors ${
                    pathname === link.to
                      ? 'text-corp-blue bg-corp-highlight'
                      : 'text-corp-dark hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                </Link>
              ))
            : navLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => scrollToSection(link.href)}
                  className={`block w-full text-left px-4 py-3 rounded-lg font-inter text-sm transition-colors ${
                    activeSection === link.id
                      ? 'text-corp-blue bg-corp-highlight'
                      : 'text-corp-dark hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                </button>
              ))}
          {!isAuthenticated && (
            <Link
              to="/pricing"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block w-full text-left px-4 py-3 rounded-lg font-inter text-sm transition-colors ${
                pathname === '/pricing'
                  ? 'text-corp-blue bg-corp-highlight'
                  : 'text-corp-dark hover:bg-gray-50'
              }`}
            >
              Pricing
            </Link>
          )}
          <div className="pt-4 border-t border-gray-100 space-y-2">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="btn-primary text-sm w-full block text-center"
                >
                  Sign In / Sign Up
                </Link>
                <Link
                  to="/vendor/apply"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full text-left px-4 py-3 font-inter text-sm text-corp-dark"
                >
                  Be Our Partner
                </Link>
              </>
            ) : null}
            {isAuthenticated && !accountLink ? (
              <Link
                to="/vendor/apply"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block w-full text-left px-4 py-3 font-inter text-sm text-corp-dark"
              >
                Be Our Partner
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;

