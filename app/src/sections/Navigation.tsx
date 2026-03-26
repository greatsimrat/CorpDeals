import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const Navigation = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');

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
      const sections = ['search', 'how-it-works', 'categories', 'vendors', 'testimonial'];
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
    { label: 'Categories', href: '#categories', id: 'categories' },
    { label: 'For Vendors', href: '#vendors', id: 'vendors' },
  ];

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
            {navLinks.map((link) => (
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
          </div>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            {verificationLabel && (
              <Link
                to={
                  user?.latestVerification?.company?.slug
                    ? `/verify?company=${encodeURIComponent(user.latestVerification.company.slug)}`
                    : '/verify'
                }
                className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                  user?.activeVerification
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {verificationLabel}
              </Link>
            )}
            <Link
              to="/vendor/login"
              className="font-inter text-sm text-corp-dark hover:text-corp-blue transition-colors px-4 py-2"
            >
              Vendor Login
            </Link>
            {!isAuthenticated ? (
              <Link to="/login" className="btn-primary text-sm">
                Login
              </Link>
            ) : (
              <button onClick={logout} className="btn-primary text-sm">
                Logout
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
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

      {/* Mobile Menu */}
      <div 
        className={`lg:hidden bg-white border-t border-gray-100 transition-all duration-300 ${
          isMobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
        }`}
      >
        <div className="px-6 py-4 space-y-2">
          {navLinks.map((link) => (
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
          <div className="pt-4 border-t border-gray-100 space-y-2">
            {verificationLabel && (
              <Link
                to={
                  user?.latestVerification?.company?.slug
                    ? `/verify?company=${encodeURIComponent(user.latestVerification.company.slug)}`
                    : '/verify'
                }
                className={`block w-full text-left px-4 py-3 rounded-lg text-xs font-medium ${
                  user?.activeVerification
                    ? 'bg-green-50 text-green-700'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                {verificationLabel}
              </Link>
            )}
            <Link
              to="/vendor/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block w-full text-left px-4 py-3 font-inter text-sm text-corp-dark"
            >
              Vendor Login
            </Link>
            {!isAuthenticated ? (
              <Link to="/login" className="btn-primary text-sm w-full block text-center">
                Login
              </Link>
            ) : (
              <button onClick={logout} className="btn-primary text-sm w-full">
                Logout
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;

