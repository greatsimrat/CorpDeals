export interface Company {
  id: string;
  name: string;
  logo: string;
  domain: string;
  employeeCount: string;
  headquarters: string;
  description: string;
  verified: boolean;
  totalDeals: number;
  categories: string[];
  featuredDeals: string[];
  bannerImage: string;
  color: string;
}

export const companies: Company[] = [
  {
    id: 'amazon',
    name: 'Amazon',
    logo: 'A',
    domain: 'amazon.com',
    employeeCount: '1.5M+',
    headquarters: 'Seattle, WA',
    description: 'Amazon employees get exclusive access to discounts on banking, automotive, telecom, and lifestyle services.',
    verified: true,
    totalDeals: 245,
    categories: ['banking', 'automotive', 'telecom', 'insurance', 'travel', 'retail'],
    featuredDeals: ['coast-capital-mortgage', 'kia-bc-discount', 'telus-employee-plan'],
    bannerImage: '/company_amazon.jpg',
    color: '#FF9900',
  },
  {
    id: 'google',
    name: 'Google',
    logo: 'G',
    domain: 'google.com',
    employeeCount: '190K+',
    headquarters: 'Mountain View, CA',
    description: 'Google employees enjoy premium perks across technology, wellness, and financial services.',
    verified: true,
    totalDeals: 189,
    categories: ['banking', 'technology', 'wellness', 'travel', 'insurance'],
    featuredDeals: ['chase-sapphire', 'apple-employee-discount', 'equinox-membership'],
    bannerImage: '/company_google.jpg',
    color: '#4285F4',
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    logo: 'M',
    domain: 'microsoft.com',
    employeeCount: '220K+',
    headquarters: 'Redmond, WA',
    description: 'Microsoft employees receive exclusive offers on software, hardware, and lifestyle services.',
    verified: true,
    totalDeals: 167,
    categories: ['banking', 'technology', 'automotive', 'travel', 'retail'],
    featuredDeals: ['bmw-employee', 'adobe-creative-cloud', 'marriott-corporate'],
    bannerImage: '/company_microsoft.jpg',
    color: '#00A4EF',
  },
  {
    id: 'apple',
    name: 'Apple',
    logo: '🍎',
    domain: 'apple.com',
    employeeCount: '160K+',
    headquarters: 'Cupertino, CA',
    description: 'Apple employees access premium discounts on automotive, financial, and lifestyle brands.',
    verified: true,
    totalDeals: 156,
    categories: ['automotive', 'banking', 'wellness', 'travel', 'insurance'],
    featuredDeals: ['mercedes-employee', 'wells-fargo-mortgage', 'four-seasons'],
    bannerImage: '/company_apple.jpg',
    color: '#555555',
  },
  {
    id: 'meta',
    name: 'Meta',
    logo: 'M',
    domain: 'meta.com',
    employeeCount: '85K+',
    headquarters: 'Menlo Park, CA',
    description: 'Meta employees enjoy exclusive perks across technology, wellness, and travel.',
    verified: true,
    totalDeals: 134,
    categories: ['technology', 'wellness', 'travel', 'banking', 'retail'],
    featuredDeals: ['oculus-employee', 'peloton-discount', 'airbnb-corporate'],
    bannerImage: '/company_meta.jpg',
    color: '#0668E1',
  },
  {
    id: 'netflix',
    name: 'Netflix',
    logo: 'N',
    domain: 'netflix.com',
    employeeCount: '12K+',
    headquarters: 'Los Gatos, CA',
    description: 'Netflix employees get exclusive entertainment and lifestyle discounts.',
    verified: true,
    totalDeals: 98,
    categories: ['entertainment', 'travel', 'wellness', 'dining'],
    featuredDeals: ['amc-unlimited', 'delta-skymiles', 'spa-weekly'],
    bannerImage: '/company_netflix.jpg',
    color: '#E50914',
  },
];

export const getCompanyById = (id: string): Company | undefined => {
  return companies.find(company => company.id === id);
};

export const searchCompanies = (query: string): Company[] => {
  const lowerQuery = query.toLowerCase();
  return companies.filter(company => 
    company.name.toLowerCase().includes(lowerQuery) ||
    company.domain.toLowerCase().includes(lowerQuery)
  );
};
