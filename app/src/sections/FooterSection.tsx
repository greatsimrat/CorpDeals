import { useRef, useLayoutEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Mail, Phone, MapPin, Send, Linkedin, Twitter, Instagram, Check } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const footerLinks = {
  product: [
    { label: 'For Employees', href: '#search' },
    { label: 'For Vendors', href: '#vendors' },
    { label: 'For HR Teams', href: '#how-it-works' },
    { label: 'Pricing', href: '#' },
  ],
  company: [
    { label: 'About Us', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Press', href: '#' },
    { label: 'Blog', href: '#' },
  ],
  resources: [
    { label: 'Help Center', href: '#' },
    { label: 'API Docs', href: '#' },
    { label: 'Partner Portal', href: '#' },
    { label: 'Case Studies', href: '#testimonial' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
    { label: 'Cookie Policy', href: '#' },
    { label: 'Security', href: '#' },
  ],
};

const FooterSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: '',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        formRef.current,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 85%',
            end: 'top 60%',
            scrub: true,
          },
        }
      );

      gsap.fromTo(
        linksRef.current?.querySelectorAll('.link-column') || [],
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.08,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: linksRef.current,
            start: 'top 85%',
            end: 'top 60%',
            scrub: true,
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setFormData({ name: '', email: '', company: '', message: '' });
    }, 3000);
  };

  return (
    <footer
      ref={sectionRef}
      className="relative w-full bg-corp-dark pt-20 pb-8 z-100"
      role="contentinfo"
    >
      <div className="w-full px-6 lg:px-12">
        <div className="max-w-6xl mx-auto">
          
          {/* Top Section - Contact Form & Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 mb-16">
            
            {/* Contact Form */}
            <div ref={formRef}>
              <h3 className="font-montserrat font-bold text-3xl text-white uppercase mb-2">
                Let's Talk
              </h3>
              <p className="font-inter text-gray-400 mb-8">
                Have questions? We'd love to hear from you. Send us a message.
              </p>

              {isSubmitted ? (
                <div className="bg-corp-blue/20 rounded-2xl p-8 text-center">
                  <div className="w-16 h-16 bg-corp-blue rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="font-montserrat font-bold text-xl text-white mb-2">
                    Message Sent!
                  </h4>
                  <p className="font-inter text-gray-400">
                    We'll get back to you within 24 hours.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3.5 bg-white/10 rounded-xl text-white placeholder:text-gray-500 font-inter outline-none focus:ring-2 focus:ring-corp-blue/50 transition-all"
                        required
                      />
                    </div>
                    <div className="relative">
                      <input
                        type="email"
                        placeholder="Work email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3.5 bg-white/10 rounded-xl text-white placeholder:text-gray-500 font-inter outline-none focus:ring-2 focus:ring-corp-blue/50 transition-all"
                        required
                      />
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Company (optional)"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-4 py-3.5 bg-white/10 rounded-xl text-white placeholder:text-gray-500 font-inter outline-none focus:ring-2 focus:ring-corp-blue/50 transition-all"
                  />
                  <textarea
                    placeholder="How can we help?"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3.5 bg-white/10 rounded-xl text-white placeholder:text-gray-500 font-inter outline-none focus:ring-2 focus:ring-corp-blue/50 transition-all resize-none"
                    required
                  />
                  <button
                    type="submit"
                    className="btn-primary w-full flex items-center justify-center gap-2 py-4"
                  >
                    <Send className="w-5 h-5" />
                    Send Message
                  </button>
                </form>
              )}
            </div>

            {/* Company Info */}
            <div className="lg:pl-8">
              {/* Logo */}
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-corp-blue rounded-xl flex items-center justify-center">
                  <span className="text-white font-montserrat font-bold text-xl">C</span>
                </div>
                <div>
                  <span className="font-montserrat font-bold text-2xl text-white block">
                    CorpDeals
                  </span>
                  <span className="font-inter text-sm text-gray-400">
                    Employee perks that matter
                  </span>
                </div>
              </div>

              {/* Contact Details */}
              <div className="space-y-4 mb-8">
                <a
                  href="mailto:hello@corpdeals.io"
                  className="flex items-center gap-4 text-gray-400 hover:text-white transition-colors group"
                >
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-corp-blue transition-colors">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-inter text-sm text-gray-500 block">Email</span>
                    <span className="font-inter">hello@corpdeals.io</span>
                  </div>
                </a>
                <a
                  href="tel:1-800-555-0142"
                  className="flex items-center gap-4 text-gray-400 hover:text-white transition-colors group"
                >
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-corp-blue transition-colors">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-inter text-sm text-gray-500 block">Phone</span>
                    <span className="font-inter">1-800-555-0142</span>
                  </div>
                </a>
                <div className="flex items-center gap-4 text-gray-400">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-inter text-sm text-gray-500 block">Location</span>
                    <span className="font-inter">San Francisco, CA</span>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="flex items-center gap-3">
                {[
                  { icon: Linkedin, label: 'LinkedIn' },
                  { icon: Twitter, label: 'Twitter' },
                  { icon: Instagram, label: 'Instagram' },
                ].map(({ icon: Icon, label }) => (
                  <a
                    key={label}
                    href="#"
                    aria-label={label}
                    className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-corp-blue transition-all"
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Links Grid */}
          <div ref={linksRef} className="grid grid-cols-2 md:grid-cols-4 gap-8 py-12 border-t border-white/10">
            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category} className="link-column">
                <h4 className="font-montserrat font-bold text-white uppercase text-sm mb-4">
                  {category}
                </h4>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="font-inter text-gray-400 hover:text-white transition-colors text-sm"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-white/10">
            <p className="font-inter text-sm text-gray-500">
              © 2026 CorpDeals. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="font-inter text-sm text-gray-500 hover:text-white transition-colors">
                Privacy
              </a>
              <a href="#" className="font-inter text-sm text-gray-500 hover:text-white transition-colors">
                Terms
              </a>
              <a href="#" className="font-inter text-sm text-gray-500 hover:text-white transition-colors">
                Cookies
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
