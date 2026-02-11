export interface Offer {
  id: string;
  title: string;
  companyId: string;
  categoryId: string;
  vendorName: string;
  vendorLogo: string;
  description: string;
  discountValue: string;
  discountType: 'percentage' | 'fixed' | 'special';
  originalPrice?: string;
  discountedPrice?: string;
  terms: string[];
  howToClaim: string[];
  expiryDate: string;
  featured: boolean;
  verified: boolean;
  location?: string;
  image: string;
  leads: number;
  rating: number;
  reviews: number;
}

export const offers: Offer[] = [
  // Amazon Offers
  {
    id: 'coast-capital-mortgage',
    title: 'Exclusive Mortgage Rates for Amazon Employees',
    companyId: 'amazon',
    categoryId: 'banking',
    vendorName: 'Coast Capital Savings',
    vendorLogo: 'CC',
    description: 'Amazon employees in British Columbia receive preferential mortgage rates and waived application fees. Special rates for new purchases, refinancing, and renewals.',
    discountValue: '0.5% off',
    discountType: 'percentage',
    originalPrice: '5.24%',
    discountedPrice: '4.74%',
    terms: [
      'Valid for Amazon employees with BC address',
      'Minimum mortgage amount: $200,000',
      'Valid for new purchases and renewals',
      'Subject to credit approval',
    ],
    howToClaim: [
      'Verify your Amazon employment status',
      'Schedule a consultation with Coast Capital mortgage specialist',
      'Provide your Amazon employee ID',
      'Complete mortgage application',
    ],
    expiryDate: '2026-12-31',
    featured: true,
    verified: true,
    location: 'British Columbia, Canada',
    image: '/offer_mortgage.jpg',
    leads: 145,
    rating: 4.8,
    reviews: 89,
  },
  {
    id: 'kia-bc-discount',
    title: '$500 CAD Off Any New Kia Vehicle',
    companyId: 'amazon',
    categoryId: 'automotive',
    vendorName: 'Kia Canada - BC Dealers',
    vendorLogo: 'Kia',
    description: 'Amazon BC employees receive $500 CAD discount on any new Kia vehicle purchase or lease. Valid at participating BC dealerships.',
    discountValue: '$500 CAD',
    discountType: 'fixed',
    terms: [
      'Valid for Amazon employees in British Columbia',
      'Applies to new vehicle purchases and leases',
      'Cannot be combined with other offers',
      'Valid ID and proof of employment required',
    ],
    howToClaim: [
      'Visit any participating Kia dealership in BC',
      'Present your Amazon employee badge or pay stub',
      'Mention CorpDeals Amazon employee discount',
      'Discount applied at purchase',
    ],
    expiryDate: '2026-06-30',
    featured: true,
    verified: true,
    location: 'British Columbia, Canada',
    image: '/offer_kia.jpg',
    leads: 234,
    rating: 4.6,
    reviews: 156,
  },
  {
    id: 'telus-employee-plan',
    title: 'Telus Employee Advantage Plan - 25% Off',
    companyId: 'amazon',
    categoryId: 'telecom',
    vendorName: 'Telus',
    vendorLogo: 'T',
    description: 'Amazon employees save 25% on unlimited data plans, home internet, and TV bundles. Family plans included.',
    discountValue: '25% off',
    discountType: 'percentage',
    originalPrice: '$85/mo',
    discountedPrice: '$63.75/mo',
    terms: [
      'Valid for active Amazon employees',
      'Up to 5 lines per employee account',
      '2-year term agreement required',
      'Employee verification required annually',
    ],
    howToClaim: [
      'Visit Telus.com/corpdeals or any Telus store',
      'Verify with your Amazon work email',
      'Select your preferred plan',
      'Discount applied automatically',
    ],
    expiryDate: '2026-12-31',
    featured: true,
    verified: true,
    location: 'Canada',
    image: '/offer_telus.jpg',
    leads: 567,
    rating: 4.5,
    reviews: 423,
  },
  {
    id: 'amazon-chase-card',
    title: 'Chase Amazon Employee Credit Card - $200 Bonus',
    companyId: 'amazon',
    categoryId: 'banking',
    vendorName: 'Chase Bank',
    vendorLogo: 'Chase',
    description: 'Exclusive Chase credit card for Amazon employees with $200 signup bonus, 5% back on Amazon purchases, and no annual fee.',
    discountValue: '$200 bonus',
    discountType: 'fixed',
    terms: [
      'Valid for active Amazon employees',
      'Spend $500 in first 3 months for bonus',
      'Subject to credit approval',
      'Must verify employment status',
    ],
    howToClaim: [
      'Apply online at Chase.com/amazon-employee',
      'Verify with Amazon employee ID',
      'Receive decision within minutes',
      'Card shipped within 7-10 business days',
    ],
    expiryDate: '2026-03-31',
    featured: false,
    verified: true,
    location: 'United States',
    image: '/offer_creditcard.jpg',
    leads: 892,
    rating: 4.7,
    reviews: 634,
  },
  
  // Google Offers
  {
    id: 'chase-sapphire',
    title: 'Chase Sapphire Preferred - 80,000 Points Bonus',
    companyId: 'google',
    categoryId: 'banking',
    vendorName: 'Chase Bank',
    vendorLogo: 'Chase',
    description: 'Google employees receive enhanced 80,000 points signup bonus (worth $1,000 in travel) plus premium travel benefits.',
    discountValue: '80K points',
    discountType: 'special',
    terms: [
      'Valid for Google employees only',
      'Spend $4,000 in first 3 months',
      'Subject to credit approval',
      'Annual fee: $95',
    ],
    howToClaim: [
      'Apply via Google perks portal',
      'Verify Google employment',
      'Complete application',
      'Bonus posts after qualifying spend',
    ],
    expiryDate: '2026-06-30',
    featured: true,
    verified: true,
    location: 'United States',
    image: '/offer_chase.jpg',
    leads: 445,
    rating: 4.9,
    reviews: 312,
  },
  {
    id: 'apple-employee-discount',
    title: 'Apple Employee Purchase Program - 10% Off',
    companyId: 'google',
    categoryId: 'technology',
    vendorName: 'Apple',
    vendorLogo: '🍎',
    description: 'Google employees save 10% on Mac, iPad, Apple Watch, and accessories through Apple EPP.',
    discountValue: '10% off',
    discountType: 'percentage',
    terms: [
      'Valid for active Google employees',
      'Up to 3 units per product per year',
      'Cannot be combined with education pricing',
      'Employee verification required',
    ],
    howToClaim: [
      'Visit Apple.com/google-epp',
      'Sign in with Google SSO',
      'Shop with employee pricing',
      'Discount applied at checkout',
    ],
    expiryDate: '2026-12-31',
    featured: true,
    verified: true,
    location: 'Global',
    image: '/offer_apple.jpg',
    leads: 1234,
    rating: 4.8,
    reviews: 892,
  },
  {
    id: 'equinox-membership',
    title: 'Equinox Corporate Membership - 20% Off',
    companyId: 'google',
    categoryId: 'wellness',
    vendorName: 'Equinox',
    vendorLogo: 'EQ',
    description: 'Google employees receive 20% off Equinox memberships plus waived initiation fee. Access to all locations.',
    discountValue: '20% off',
    discountType: 'percentage',
    originalPrice: '$220/mo',
    discountedPrice: '$176/mo',
    terms: [
      'Valid for Google employees',
      '12-month commitment required',
      'Valid at all Equinox locations',
      'Must verify employment quarterly',
    ],
    howToClaim: [
      'Visit Equinox.com/google',
      'Verify with Google email',
      'Select membership type',
      'Start your fitness journey',
    ],
    expiryDate: '2026-12-31',
    featured: false,
    verified: true,
    location: 'United States',
    image: '/offer_equinox.jpg',
    leads: 678,
    rating: 4.6,
    reviews: 445,
  },

  // Microsoft Offers
  {
    id: 'bmw-employee',
    title: 'BMW Employee Pricing - $2,000 Off',
    companyId: 'microsoft',
    categoryId: 'automotive',
    vendorName: 'BMW USA',
    vendorLogo: 'BMW',
    description: 'Microsoft employees receive exclusive BMW employee pricing, equivalent to $2,000+ off MSRP on new vehicles.',
    discountValue: '$2,000+ off',
    discountType: 'fixed',
    terms: [
      'Valid for Microsoft employees',
      'New BMW vehicles only',
      'Cannot be combined with other offers',
      'Proof of employment required',
    ],
    howToClaim: [
      'Visit participating BMW dealer',
      'Present Microsoft employee badge',
      'Mention Microsoft Employee Program',
      'Pricing applied to purchase',
    ],
    expiryDate: '2026-12-31',
    featured: true,
    verified: true,
    location: 'United States',
    image: '/offer_bmw.jpg',
    leads: 345,
    rating: 4.7,
    reviews: 234,
  },
  {
    id: 'adobe-creative-cloud',
    title: 'Adobe Creative Cloud - 40% Off Annual Plan',
    companyId: 'microsoft',
    categoryId: 'technology',
    vendorName: 'Adobe',
    vendorLogo: 'Ad',
    description: 'Microsoft employees save 40% on Adobe Creative Cloud All Apps plan. Full suite of creative tools.',
    discountValue: '40% off',
    discountType: 'percentage',
    originalPrice: '$54.99/mo',
    discountedPrice: '$32.99/mo',
    terms: [
      'Valid for active Microsoft employees',
      'Annual subscription required',
      'Must verify employment annually',
      'Full Creative Cloud access',
    ],
    howToClaim: [
      'Visit Adobe.com/microsoft',
      'Verify with Microsoft SSO',
      'Select Creative Cloud plan',
      'Discount applied automatically',
    ],
    expiryDate: '2026-12-31',
    featured: true,
    verified: true,
    location: 'Global',
    image: '/offer_adobe.jpg',
    leads: 1567,
    rating: 4.9,
    reviews: 1123,
  },
  {
    id: 'marriott-corporate',
    title: 'Marriott Corporate Rates - Up to 25% Off',
    companyId: 'microsoft',
    categoryId: 'travel',
    vendorName: 'Marriott Bonvoy',
    vendorLogo: 'M',
    description: 'Microsoft employees receive up to 25% off at 7,000+ Marriott properties worldwide plus elite status fast-track.',
    discountValue: '25% off',
    discountType: 'percentage',
    terms: [
      'Valid for Microsoft employees',
      'Subject to availability',
      'Must book through corporate portal',
      'Employee verification required',
    ],
    howToClaim: [
      'Book via Microsoft travel portal',
      'Verify employment status',
      'Search Marriott properties',
      'Corporate rates displayed automatically',
    ],
    expiryDate: '2026-12-31',
    featured: false,
    verified: true,
    location: 'Global',
    image: '/offer_marriott.jpg',
    leads: 789,
    rating: 4.6,
    reviews: 567,
  },
];

export const getOfferById = (id: string): Offer | undefined => {
  return offers.find(offer => offer.id === id);
};

export const getOffersByCompany = (companyId: string): Offer[] => {
  return offers.filter(offer => offer.companyId === companyId);
};

export const getOffersByCategory = (categoryId: string): Offer[] => {
  return offers.filter(offer => offer.categoryId === categoryId);
};

export const getFeaturedOffers = (companyId?: string): Offer[] => {
  let filtered = offers.filter(offer => offer.featured);
  if (companyId) {
    filtered = filtered.filter(offer => offer.companyId === companyId);
  }
  return filtered;
};

export const getOffersByCompanyAndCategory = (companyId: string, categoryId: string): Offer[] => {
  return offers.filter(offer => offer.companyId === companyId && offer.categoryId === categoryId);
};
