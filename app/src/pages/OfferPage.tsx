import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle, Star, MapPin, Calendar, Users,
  Check, AlertCircle, Phone, Mail, User, Briefcase,
  MessageSquare, Shield, Clock
} from 'lucide-react';
import { getOfferById } from '../data/offers';
import { getCompanyById } from '../data/companies';
// import { getCategoryById } from '../data/categories';
import { useLeads } from '../context/LeadContext';

const OfferPage = () => {
  const { offerId } = useParams<{ offerId: string }>();
  const navigate = useNavigate();
  const { addLead, getLeadsByOffer } = useLeads();
  
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    employeeId: '',
    message: '',
  });

  const offer = offerId ? getOfferById(offerId) : undefined;
  const company = offer ? getCompanyById(offer.companyId) : undefined;
  const offerLeads = offerId ? getLeadsByOffer(offerId) : [];

  useEffect(() => {
    if (!offer && offerId) {
      navigate('/');
    }
    window.scrollTo(0, 0);
  }, [offer, offerId, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (offer) {
      addLead({
        offerId: offer.id,
        companyId: offer.companyId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        employeeId: formData.employeeId,
        message: formData.message,
      });
      setFormSubmitted(true);
    }
  };

  if (!offer || !company) {
    return (
      <div className="min-h-screen bg-corp-light flex items-center justify-center">
        <div className="text-center">
          <h1 className="heading-2 text-corp-dark mb-4">Offer Not Found</h1>
          <Link to="/" className="btn-primary">Go Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-corp-light">
      {/* Navigation */}
      <nav className="bg-white/95 backdrop-blur-lg shadow-sm sticky top-0 z-50">
        <div className="w-full px-6 lg:px-12">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 bg-corp-blue rounded-xl flex items-center justify-center">
                <span className="text-white font-montserrat font-bold text-lg">C</span>
              </div>
              <span className="font-montserrat font-bold text-xl text-corp-dark">CorpDeals</span>
            </Link>
            <Link 
              to={`/company/${company.id}`} 
              className="flex items-center gap-2 text-corp-gray hover:text-corp-blue transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-inter text-sm">Back to {company.name}</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Offer Hero */}
      <section className="relative">
        <div className="h-64 lg:h-96 overflow-hidden">
          <img
            src={offer.image}
            alt={offer.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 w-full px-6 lg:px-12 pb-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="bg-corp-blue text-white px-4 py-1.5 rounded-full font-inter font-medium">
                {offer.discountValue} OFF
              </span>
              {offer.featured && (
                <span className="bg-amber-500 text-white px-4 py-1.5 rounded-full font-inter font-medium flex items-center gap-1">
                  <Star className="w-4 h-4 fill-white" /> Featured
                </span>
              )}
              <span className="bg-white/20 backdrop-blur-sm text-white px-4 py-1.5 rounded-full font-inter font-medium flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Verified
              </span>
            </div>
            <h1 className="font-montserrat font-bold text-3xl lg:text-5xl text-white max-w-3xl">
              {offer.title}
            </h1>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 lg:py-16">
        <div className="w-full px-6 lg:px-12">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column - Offer Details */}
              <div className="lg:col-span-2 space-y-8">
                {/* Vendor Info */}
                <div className="bg-white rounded-2xl shadow-card p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-corp-highlight rounded-2xl flex items-center justify-center text-2xl font-bold">
                      {offer.vendorLogo}
                    </div>
                    <div>
                      <h2 className="font-montserrat font-bold text-xl text-corp-dark">{offer.vendorName}</h2>
                      <div className="flex items-center gap-3 text-sm text-corp-gray">
                        <span className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                          {offer.rating} ({offer.reviews} reviews)
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {offerLeads.length} claimed
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="font-inter text-corp-gray leading-relaxed">
                    {offer.description}
                  </p>
                </div>

                {/* Pricing */}
                {(offer.originalPrice || offer.discountedPrice) && (
                  <div className="bg-white rounded-2xl shadow-card p-6">
                    <h3 className="font-montserrat font-bold text-lg text-corp-dark mb-4">Pricing</h3>
                    <div className="flex items-center gap-6">
                      {offer.originalPrice && (
                        <div>
                          <span className="font-inter text-sm text-corp-gray">Regular Price</span>
                          <span className="block font-montserrat font-bold text-2xl text-corp-gray line-through">
                            {offer.originalPrice}
                          </span>
                        </div>
                      )}
                      {offer.discountedPrice && (
                        <div>
                          <span className="font-inter text-sm text-corp-gray">Employee Price</span>
                          <span className="block font-montserrat font-bold text-3xl text-corp-blue">
                            {offer.discountedPrice}
                          </span>
                        </div>
                      )}
                      <div className="ml-auto bg-green-100 text-green-700 px-4 py-2 rounded-xl font-inter font-medium">
                        Save {offer.discountValue}
                      </div>
                    </div>
                  </div>
                )}

                {/* How to Claim */}
                <div className="bg-white rounded-2xl shadow-card p-6">
                  <h3 className="font-montserrat font-bold text-lg text-corp-dark mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-corp-blue" />
                    How to Claim This Offer
                  </h3>
                  <ol className="space-y-4">
                    {offer.howToClaim.map((step, index) => (
                      <li key={index} className="flex items-start gap-4">
                        <span className="w-8 h-8 bg-corp-blue text-white rounded-full flex items-center justify-center font-inter font-bold flex-shrink-0">
                          {index + 1}
                        </span>
                        <span className="font-inter text-corp-dark pt-1">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Terms & Conditions */}
                <div className="bg-gray-50 rounded-2xl p-6">
                  <h3 className="font-montserrat font-bold text-lg text-corp-dark mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-corp-gray" />
                    Terms & Conditions
                  </h3>
                  <ul className="space-y-2">
                    {offer.terms.map((term, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="font-inter text-sm text-corp-gray">{term}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Location & Expiry */}
                <div className="flex flex-wrap gap-4">
                  {offer.location && (
                    <div className="flex items-center gap-2 text-corp-gray">
                      <MapPin className="w-5 h-5" />
                      <span className="font-inter">{offer.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-corp-gray">
                    <Calendar className="w-5 h-5" />
                    <span className="font-inter">Expires: {new Date(offer.expiryDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Right Column - Lead Form */}
              <div className="lg:col-span-1">
                <div className="sticky top-24">
                  {!showLeadForm && !formSubmitted && (
                    <div className="bg-white rounded-2xl shadow-card p-6">
                      <h3 className="font-montserrat font-bold text-xl text-corp-dark mb-4">
                        Claim This Offer
                      </h3>
                      <p className="font-inter text-corp-gray mb-6">
                        Enter your details to get connected with {offer.vendorName}. 
                        They'll verify your {company.name} employment and process your discount.
                      </p>
                      <div className="space-y-4 mb-6">
                        <div className="flex items-center gap-3 text-sm text-corp-gray">
                          <Shield className="w-5 h-5 text-green-500" />
                          <span>Secure verification</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-corp-gray">
                          <Clock className="w-5 h-5 text-corp-blue" />
                          <span>Response within 24 hours</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-corp-gray">
                          <CheckCircle className="w-5 h-5 text-corp-blue" />
                          <span>No spam, ever</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowLeadForm(true)}
                        className="btn-primary w-full py-4 text-lg"
                      >
                        Get This Deal
                      </button>
                    </div>
                  )}

                  {showLeadForm && !formSubmitted && (
                    <div className="bg-white rounded-2xl shadow-card p-6">
                      <h3 className="font-montserrat font-bold text-xl text-corp-dark mb-2">
                        Get Connected
                      </h3>
                      <p className="font-inter text-sm text-corp-gray mb-6">
                        {offer.vendorName} will contact you to verify your employment and provide the discount.
                      </p>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block font-inter text-sm text-corp-dark mb-1">
                              First Name *
                            </label>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-corp-gray" />
                              <input
                                type="text"
                                required
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl font-inter outline-none focus:ring-2 focus:ring-corp-blue/30"
                                placeholder="John"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block font-inter text-sm text-corp-dark mb-1">
                              Last Name *
                            </label>
                            <input
                              type="text"
                              required
                              value={formData.lastName}
                              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                              className="w-full px-4 py-3 bg-gray-50 rounded-xl font-inter outline-none focus:ring-2 focus:ring-corp-blue/30"
                              placeholder="Smith"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block font-inter text-sm text-corp-dark mb-1">
                            Work Email *
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-corp-gray" />
                            <input
                              type="email"
                              required
                              value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl font-inter outline-none focus:ring-2 focus:ring-corp-blue/30"
                              placeholder={`you@${company.domain}`}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block font-inter text-sm text-corp-dark mb-1">
                            Phone Number
                          </label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-corp-gray" />
                            <input
                              type="tel"
                              value={formData.phone}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                              className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl font-inter outline-none focus:ring-2 focus:ring-corp-blue/30"
                              placeholder="(555) 123-4567"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block font-inter text-sm text-corp-dark mb-1">
                            Employee ID
                          </label>
                          <div className="relative">
                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-corp-gray" />
                            <input
                              type="text"
                              value={formData.employeeId}
                              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                              className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl font-inter outline-none focus:ring-2 focus:ring-corp-blue/30"
                              placeholder="Optional"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block font-inter text-sm text-corp-dark mb-1">
                            Message (Optional)
                          </label>
                          <div className="relative">
                            <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-corp-gray" />
                            <textarea
                              value={formData.message}
                              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                              rows={3}
                              className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl font-inter outline-none focus:ring-2 focus:ring-corp-blue/30 resize-none"
                              placeholder="Any specific questions or requirements..."
                            />
                          </div>
                        </div>
                        <button type="submit" className="btn-primary w-full py-4">
                          Submit Request
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowLeadForm(false)}
                          className="w-full py-3 text-corp-gray font-inter hover:text-corp-dark transition-colors"
                        >
                          Cancel
                        </button>
                      </form>
                    </div>
                  )}

                  {formSubmitted && (
                    <div className="bg-white rounded-2xl shadow-card p-6 text-center">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      </div>
                      <h3 className="font-montserrat font-bold text-xl text-corp-dark mb-2">
                        Request Submitted!
                      </h3>
                      <p className="font-inter text-corp-gray mb-6">
                        {offer.vendorName} will contact you within 24 hours to verify your 
                        {company.name} employment and process your {offer.discountValue} discount.
                      </p>
                      <div className="bg-corp-highlight rounded-xl p-4 mb-6">
                        <p className="font-inter text-sm text-corp-dark">
                          <strong>What's next?</strong>
                        </p>
                        <ul className="text-left text-sm text-corp-gray mt-2 space-y-1">
                          <li>• Check your email for confirmation</li>
                          <li>• Have your employee ID ready</li>
                          <li>• Respond to vendor within 48 hours</li>
                        </ul>
                      </div>
                      <Link to={`/company/${company.id}`} className="btn-primary w-full">
                        Browse More Deals
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-corp-dark text-white py-8">
        <div className="w-full px-6 lg:px-12">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-corp-blue rounded-xl flex items-center justify-center">
                <span className="font-montserrat font-bold">C</span>
              </div>
              <span className="font-montserrat font-bold text-xl">CorpDeals</span>
            </div>
            <p className="font-inter text-white/60 text-sm">
              Verified employee perks platform
            </p>
            <Link to="/vendor-portal" className="text-corp-blue font-inter text-sm hover:underline">
              Vendor Portal →
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default OfferPage;
