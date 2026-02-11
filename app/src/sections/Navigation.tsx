import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');

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
          <a 
            href="#" 
            className="flex items-center gap-2 group"
            aria-label="CorpDeals Home"
          >
            <div className="w-9 h-9 bg-corp-blue rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="text-white font-montserrat font-bold text-lg">C</span>
            </div>
            <span className="font-montserrat font-bold text-xl text-corp-dark">
              CorpDeals
            </span>
          </a>

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
          </div>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <button 
              onClick={() => scrollToSection('#vendors')}
              className="font-inter text-sm text-corp-dark hover:text-corp-blue transition-colors px-4 py-2"
            >
              Vendor Login
            </button>
            <button 
              onClick={() => scrollToSection('#search')}
              className="btn-primary text-sm"
            >
              Get Started
            </button>
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
          <div className="pt-4 border-t border-gray-100 space-y-2">
            <button 
              onClick={() => scrollToSection('#vendors')}
              className="block w-full text-left px-4 py-3 font-inter text-sm text-corp-dark"
            >
              Vendor Login
            </button>
            <button 
              onClick={() => scrollToSection('#search')}
              className="btn-primary text-sm w-full"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
