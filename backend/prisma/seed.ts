import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { WARM_COMPANY_CATALOG } from './company-warm-catalog';

dotenv.config({ path: '.env.local' });
dotenv.config();

const prisma = new PrismaClient();

const mergeUniqueCompanies = <T extends { slug: string }>(preferred: T[], additions: T[]) => {
  const seen = new Set(preferred.map((company) => company.slug));
  return preferred.concat(additions.filter((company) => !seen.has(company.slug)));
};

const DEFAULT_OFFER_TERMS_TEMPLATE = `This offer is provided by the participating vendor for verified employees only.
Offer details, pricing, and availability are subject to change without notice.
The offer may not be combined with other promotions unless explicitly stated.
Proof of employment and identity may be required at redemption.
Misuse, fraud, or unauthorized sharing may result in cancellation.
Additional product- or service-specific conditions may apply.`;

const DEFAULT_CANCELLATION_TEMPLATE = `Cancellation and refund eligibility is determined by the vendor and may vary by product or service.
Requests must be submitted through the vendor's published support channels.
If approved, refunds are issued to the original payment method unless otherwise required by law.
Processing times may vary based on payment provider timelines.
Non-refundable fees or partially used services may be excluded where legally permitted.
Questions should be directed to the vendor first; CorpDeals does not process refunds on the vendor's behalf.`;

const QA_COMPANY_PROFILES = [
  {
    name: 'Amazon',
    slug: 'amazon',
    domain: 'amazon.com',
    allowedDomains: ['amazon.com'],
    employeeCount: '1.5M+',
    headquarters: 'Seattle, WA',
    brandColor: '#FF9900',
    verified: true,
    defaultProvinceCode: 'BC',
    defaultCityName: 'Vancouver',
    defaultLocationLabel: 'Vancouver, BC',
    qaEmail: 'qa.amazon.employee@amazon.com',
    qaUserName: 'Amazon Vancouver Employee',
  },
  {
    name: 'Google',
    slug: 'google',
    domain: 'google.com',
    allowedDomains: ['google.com', 'alphabet.com'],
    employeeCount: '190K+',
    headquarters: 'Mountain View, CA',
    brandColor: '#4285F4',
    verified: true,
    defaultProvinceCode: 'ON',
    defaultCityName: 'Toronto',
    defaultLocationLabel: 'Toronto, ON',
    qaEmail: 'qa.google.employee@google.com',
    qaUserName: 'Google Toronto Employee',
  },
  {
    name: 'Microsoft',
    slug: 'microsoft',
    domain: 'microsoft.com',
    allowedDomains: ['microsoft.com'],
    employeeCount: '220K+',
    headquarters: 'Redmond, WA',
    brandColor: '#00A4EF',
    verified: true,
    defaultProvinceCode: 'BC',
    defaultCityName: 'Vancouver',
    defaultLocationLabel: 'Vancouver, BC',
    qaEmail: 'qa.microsoft.vancouver@microsoft.com',
    qaUserName: 'Microsoft Vancouver Employee',
  },
  {
    name: 'Apple',
    slug: 'apple',
    domain: 'apple.com',
    allowedDomains: ['apple.com'],
    employeeCount: '160K+',
    headquarters: 'Cupertino, CA',
    brandColor: '#555555',
    verified: true,
    defaultProvinceCode: 'BC',
    defaultCityName: 'Vancouver',
    defaultLocationLabel: 'Vancouver, BC',
    qaEmail: 'qa.apple.employee@apple.com',
    qaUserName: 'Apple Vancouver Employee',
  },
  {
    name: 'Meta',
    slug: 'meta',
    domain: 'meta.com',
    allowedDomains: ['meta.com', 'facebook.com'],
    employeeCount: '85K+',
    headquarters: 'Menlo Park, CA',
    brandColor: '#0668E1',
    verified: true,
    defaultProvinceCode: 'ON',
    defaultCityName: 'Toronto',
    defaultLocationLabel: 'Toronto, ON',
    qaEmail: 'qa.meta.employee@meta.com',
    qaUserName: 'Meta Toronto Employee',
  },
  {
    name: 'BC Hydro',
    slug: 'bc-hydro',
    domain: 'bchydro.com',
    allowedDomains: ['bchydro.com'],
    employeeCount: '7K+',
    headquarters: 'Vancouver, BC',
    brandColor: '#00A651',
    verified: true,
    defaultProvinceCode: 'BC',
    defaultCityName: 'Vancouver',
    defaultLocationLabel: 'Vancouver, BC',
    qaEmail: 'qa.bchydro.employee@bchydro.com',
    qaUserName: 'BC Hydro Vancouver Employee',
  },
  {
    name: 'City of Vancouver',
    slug: 'city-of-vancouver',
    domain: 'vancouver.ca',
    allowedDomains: ['vancouver.ca'],
    employeeCount: '10K+',
    headquarters: 'Vancouver, BC',
    brandColor: '#0077B6',
    verified: true,
    defaultProvinceCode: 'BC',
    defaultCityName: 'Vancouver',
    defaultLocationLabel: 'Vancouver, BC',
    qaEmail: 'qa.cityofvancouver.employee@vancouver.ca',
    qaUserName: 'City of Vancouver Employee',
  },
];

const QA_VENDOR_DEFINITIONS = [
  {
    key: 'qa-banking',
    email: 'qa.vendor.banking@corpdeals.io',
    userName: 'Banking QA Vendor',
    companyName: 'Banking QA Vendor',
    contactName: 'Banking Partnerships Team',
    phone: '604-555-1100',
    website: 'https://example.com/banking',
    businessType: 'Banking & Finance',
    description: 'QA banking vendor used for realistic end-to-end offer testing.',
    city: 'Vancouver',
  },
  {
    key: 'qa-automotive',
    email: 'qa.vendor.automotive@corpdeals.io',
    userName: 'Automotive QA Vendor',
    companyName: 'Automotive QA Vendor',
    contactName: 'Automotive Partnerships Team',
    phone: '604-555-1200',
    website: 'https://example.com/automotive',
    businessType: 'Automotive',
    description: 'QA automotive vendor used for realistic end-to-end offer testing.',
    city: 'Vancouver',
  },
  {
    key: 'qa-telecom',
    email: 'qa.vendor.telecom@corpdeals.io',
    userName: 'Telecom QA Vendor',
    companyName: 'Telecom QA Vendor',
    contactName: 'Telecom Partnerships Team',
    phone: '604-555-1300',
    website: 'https://example.com/telecom',
    businessType: 'Telecom',
    description: 'QA telecom vendor used for realistic end-to-end offer testing.',
    city: 'Toronto',
  },
  {
    key: 'qa-insurance',
    email: 'qa.vendor.insurance@corpdeals.io',
    userName: 'Insurance QA Vendor',
    companyName: 'Insurance QA Vendor',
    contactName: 'Insurance Partnerships Team',
    phone: '604-555-1400',
    website: 'https://example.com/insurance',
    businessType: 'Insurance',
    description: 'QA insurance vendor used for realistic end-to-end offer testing.',
    city: 'Vancouver',
  },
  {
    key: 'qa-travel',
    email: 'qa.vendor.travel@corpdeals.io',
    userName: 'Travel QA Vendor',
    companyName: 'Travel QA Vendor',
    contactName: 'Travel Partnerships Team',
    phone: '604-555-1500',
    website: 'https://example.com/travel',
    businessType: 'Travel',
    description: 'QA travel vendor used for realistic end-to-end offer testing.',
    city: 'Toronto',
  },
  {
    key: 'qa-technology',
    email: 'qa.vendor.technology@corpdeals.io',
    userName: 'Technology QA Vendor',
    companyName: 'Technology QA Vendor',
    contactName: 'Technology Partnerships Team',
    phone: '604-555-1600',
    website: 'https://example.com/technology',
    businessType: 'Technology',
    description: 'QA technology vendor used for realistic end-to-end offer testing.',
    city: 'Vancouver',
  },
  {
    key: 'qa-fitness',
    email: 'qa.vendor.fitness@corpdeals.io',
    userName: 'Fitness QA Vendor',
    companyName: 'Fitness QA Vendor',
    contactName: 'Fitness Partnerships Team',
    phone: '604-555-1700',
    website: 'https://example.com/fitness',
    businessType: 'Wellness',
    description: 'QA wellness vendor used for realistic end-to-end offer testing.',
    city: 'Vancouver',
  },
  {
    key: 'qa-retail',
    email: 'qa.vendor.retail@corpdeals.io',
    userName: 'Retail QA Vendor',
    companyName: 'Retail QA Vendor',
    contactName: 'Retail Partnerships Team',
    phone: '604-555-1800',
    website: 'https://example.com/retail',
    businessType: 'Retail',
    description: 'QA retail vendor used for realistic end-to-end offer testing.',
    city: 'Toronto',
  },
  {
    key: 'qa-restaurant',
    email: 'qa.vendor.restaurant@corpdeals.io',
    userName: 'Restaurant QA Vendor',
    companyName: 'Restaurant QA Vendor',
    contactName: 'Restaurant Partnerships Team',
    phone: '604-555-1900',
    website: 'https://example.com/restaurant',
    businessType: 'Dining',
    description: 'QA restaurant vendor used for realistic end-to-end offer testing.',
    city: 'Vancouver',
  },
  {
    key: 'qa-movies',
    email: 'qa.vendor.movies@corpdeals.io',
    userName: 'Movies QA Vendor',
    companyName: 'Movies QA Vendor',
    contactName: 'Entertainment Partnerships Team',
    phone: '604-555-1950',
    website: 'https://example.com/movies',
    businessType: 'Entertainment',
    description: 'QA movie and streaming vendor used for realistic end-to-end offer testing.',
    city: 'Toronto',
  },
  {
    key: 'qa-fun-park',
    email: 'qa.vendor.funpark@corpdeals.io',
    userName: 'Fun Park QA Vendor',
    companyName: 'Fun Park QA Vendor',
    contactName: 'Attractions Partnerships Team',
    phone: '604-555-1970',
    website: 'https://example.com/funpark',
    businessType: 'Entertainment',
    description: 'QA attractions vendor used for realistic end-to-end offer testing.',
    city: 'Vancouver',
  },
];

const QA_IMAGE_BY_ROOT_CATEGORY: Record<string, string> = {
  banking: '/category_banking.jpg',
  automotive: '/category_automotive.jpg',
  telecom: '/category_telecom.jpg',
  insurance: '/category_insurance.jpg',
  travel: '/category_travel.jpg',
  technology: '/category_tech.jpg',
  wellness: '/category_wellness.jpg',
  retail: '/category_retail.jpg',
  dining: '/category_food.jpg',
  entertainment: '/category_entertainment.jpg',
};

const QA_BLUEPRINTS_BY_CATEGORY: Record<string, any> = {
  banking: {
    templateType: 'BANKING',
    vendorKeys: ['bmo', 'qa-banking'],
    offers: [
      {
        title: 'Everyday Banking Rewards Package',
        productName: 'Rewards Banking Package',
        productModel: 'Priority Banking',
        discountValue: '$300 bonus',
        discountType: 'FIXED',
        originalPrice: '$29.95/mo',
        discountedPrice: '$0 for 12 months',
        summary: 'unlock a premium everyday banking bundle with waived monthly fees and priority advisor access.',
        bestFor: 'day-to-day banking and direct deposit',
        specs: [
          { label: 'Advisor access', value: 'Dedicated onboarding specialist' },
          { label: 'Fee waiver', value: 'Monthly plan fee waived for the first year' },
        ],
        pricing: [
          { label: 'Welcome value', value: '$300 cash bonus after qualifying payroll deposits' },
          { label: 'Account fee', value: '$0 for 12 months, then regular pricing applies' },
        ],
        includedItems: ['Unlimited transactions', 'e-Transfers included', 'Priority branch appointments'],
        finePrint: ['Payroll setup is required to earn the welcome bonus.', 'One package per verified employee.'],
      },
      {
        title: 'Mortgage and Savings Review',
        productName: 'Mortgage and Savings Review',
        productModel: 'Homeowner Advisory',
        discountValue: '0.65% rate discount',
        discountType: 'PERCENTAGE',
        originalPrice: '5.59%',
        discountedPrice: '4.94%',
        summary: 'receive a combined mortgage-rate reduction and high-interest savings review through a dedicated banking team.',
        bestFor: 'mortgage shoppers and long-term savers',
        specs: [
          { label: 'Mortgage support', value: 'Pre-approval and closing coordination' },
          { label: 'Savings bonus', value: 'Preferred high-interest account pricing' },
        ],
        pricing: [
          { label: 'Rate advantage', value: 'Up to 0.65% off select mortgage rates' },
          { label: 'Application fee', value: 'Waived on eligible mortgage files' },
        ],
        includedItems: ['Mortgage consultation', 'Savings account review', 'Closing checklist'],
        finePrint: ['Subject to credit approval and property appraisal.', 'Savings rates may change without notice.'],
      },
    ],
  },
  'personal-banking': {
    templateType: 'BANKING',
    vendorKeys: ['qa-banking', 'bmo'],
    offers: [
      {
        title: 'Premium Chequing and Savings Bundle',
        productName: 'Premium Chequing Bundle',
        productModel: 'Everyday Banking',
        discountValue: '$250 bonus',
        discountType: 'FIXED',
        originalPrice: '$22.95/mo',
        discountedPrice: '$0 for 10 months',
        summary: 'get a premium chequing account bundle with an employee cash bonus and savings rate boost.',
        bestFor: 'everyday banking and short-term savings goals',
        specs: [
          { label: 'Transactions', value: 'Unlimited debit and online bill payments' },
          { label: 'Savings boost', value: '0.75% promotional rate increase for six months' },
        ],
        pricing: [
          { label: 'Monthly fee', value: '$0 for 10 months' },
          { label: 'Bonus trigger', value: '$250 after payroll and two pre-authorized payments' },
        ],
        includedItems: ['Unlimited e-Transfers', 'Savings account companion rate', 'Digital card controls'],
        finePrint: ['Offer limited to new chequing clients.', 'Bonus paid after all qualifying actions are complete.'],
      },
      {
        title: 'Family Banking Fee Waiver Plan',
        productName: 'Family Fee Waiver Plan',
        productModel: 'Household Banking',
        discountValue: 'Annual fee waived',
        discountType: 'SPECIAL',
        summary: 'set up a household banking plan with no annual fees and preferred family account pricing.',
        bestFor: 'families consolidating multiple accounts',
        specs: [
          { label: 'Linked accounts', value: 'Up to four family members on one plan' },
          { label: 'Support', value: 'Shared appointment booking and digital alerts' },
        ],
        pricing: [
          { label: 'Plan cost', value: 'Annual plan fee waived for the first year' },
          { label: 'Extra accounts', value: 'Reduced monthly pricing on linked accounts' },
        ],
        includedItems: ['Joint account setup', 'Shared savings goals', 'Fraud monitoring tools'],
        finePrint: ['All linked members must meet account eligibility rules.', 'Standard overdraft fees still apply.'],
      },
    ],
  },
  'credit-cards': {
    templateType: 'BANKING',
    vendorKeys: ['chase', 'qa-banking'],
    offers: [
      {
        title: 'Cashback Credit Card Offer',
        productName: 'Employee Cashback Card',
        productModel: 'Cashback Rewards',
        discountValue: '$200 welcome bonus',
        discountType: 'FIXED',
        summary: 'earn enhanced cashback on groceries, transit, and streaming with an employee-only signup bonus.',
        bestFor: 'everyday purchases and monthly bills',
        specs: [
          { label: 'Cashback', value: '4% on groceries and gas, 2% on transit' },
          { label: 'Perk', value: 'No annual fee on the primary card' },
        ],
        pricing: [
          { label: 'Bonus', value: '$200 after $1,000 spend in 90 days' },
          { label: 'APR', value: 'Variable rates apply after statement due date' },
        ],
        includedItems: ['Digital wallet support', 'Mobile insurance', 'Purchase protection'],
        finePrint: ['Subject to credit approval.', 'Cashback categories may have annual caps.'],
      },
      {
        title: 'Low-Interest Balance Transfer Card',
        productName: 'Balance Transfer Card',
        productModel: 'Low Interest',
        discountValue: '1.99% intro APR',
        discountType: 'SPECIAL',
        summary: 'move existing balances to a low-rate employee card with a twelve-month introductory APR.',
        bestFor: 'consolidating existing credit card balances',
        specs: [
          { label: 'Intro APR', value: '1.99% for 12 months on balance transfers' },
          { label: 'Transfer window', value: 'Transfers must be initiated within 60 days' },
        ],
        pricing: [
          { label: 'Transfer fee', value: '1% introductory transfer fee on approved balances' },
          { label: 'Annual fee', value: '$0' },
        ],
        includedItems: ['Fraud alerts', 'Virtual card numbers', 'Card lock controls'],
        finePrint: ['Transfer approval depends on credit review.', 'Regular APR applies after the intro period.'],
      },
    ],
  },
  automotive: {
    templateType: 'GENERIC',
    vendorKeys: ['kia', 'qa-automotive'],
    offers: [
      {
        title: 'New Vehicle Employee Discount',
        productName: 'Vehicle Savings Program',
        productModel: 'Purchase and Lease',
        discountValue: '$1,500 off',
        discountType: 'FIXED',
        summary: 'save on eligible new vehicle purchases or leases with employee pricing and dealer support.',
        bestFor: 'new vehicle shoppers',
        specs: [
          { label: 'Eligible inventory', value: 'Select 2026 model-year inventory' },
          { label: 'Support', value: 'Corporate dealer liaison included' },
        ],
        pricing: [
          { label: 'Savings', value: 'Up to $1,500 off MSRP on approved models' },
          { label: 'Financing', value: 'Preferred financing tiers available' },
        ],
        includedItems: ['Dealer introduction', 'Pricing certificate', 'Trade-in appraisal support'],
        finePrint: ['Inventory varies by dealership.', 'Cannot be stacked with fleet cash incentives.'],
      },
      {
        title: 'Family SUV Lease Upgrade',
        productName: 'SUV Lease Upgrade',
        productModel: 'Employee Lease',
        discountValue: '$85/mo savings',
        discountType: 'FIXED',
        summary: 'upgrade to a family SUV lease with employee monthly pricing and included service credits.',
        bestFor: 'families comparing lease options',
        specs: [
          { label: 'Lease term', value: '36 to 48 months on approved models' },
          { label: 'Service perk', value: 'Complimentary first-year maintenance credit' },
        ],
        pricing: [
          { label: 'Monthly reduction', value: 'Up to $85/mo versus standard retail lease offers' },
          { label: 'Down payment', value: 'Flexible down payment options available' },
        ],
        includedItems: ['Test-drive booking', 'Lease comparison call', 'Maintenance credit'],
        finePrint: ['Insurance and licensing are not included.', 'Credit approval is required.'],
      },
    ],
  },
  telecom: {
    templateType: 'TELECOM',
    vendorKeys: ['telus', 'qa-telecom'],
    offers: [
      {
        title: '5G Mobile and Internet Bundle',
        productName: '5G Bundle',
        productModel: 'Mobile + Home',
        discountValue: '25% off',
        discountType: 'PERCENTAGE',
        originalPrice: '$120/mo',
        discountedPrice: '$90/mo',
        summary: 'combine a premium 5G mobile plan with home internet savings under one employee bundle.',
        bestFor: 'employees bundling mobile and home services',
        specs: [
          { label: 'Mobile data', value: 'Unlimited 5G data with premium speed allotment' },
          { label: 'Home internet', value: 'Gigabit home internet can be added to the bundle' },
        ],
        pricing: [
          { label: 'Bundle rate', value: '$90/mo on qualifying plans' },
          { label: 'Family lines', value: 'Add up to 4 discounted lines' },
        ],
        includedItems: ['Mobile service', 'Home internet bundle option', 'Online account setup'],
        finePrint: ['Taxes and device financing are billed separately.', 'Plan availability depends on service address.'],
      },
      {
        title: 'Family Connectivity Savings Plan',
        productName: 'Family Connectivity Plan',
        productModel: 'Shared Savings',
        discountValue: '$20 per extra line',
        discountType: 'FIXED',
        summary: 'lock in employee savings on multiple mobile lines with shared account management.',
        bestFor: 'families with multiple mobile lines',
        specs: [
          { label: 'Extra lines', value: 'Discount applies to up to four additional lines' },
          { label: 'Roaming', value: 'North America roaming options available' },
        ],
        pricing: [
          { label: 'Primary line', value: 'Preferred employee pricing on flagship plans' },
          { label: 'Additional lines', value: '$20 monthly savings per extra line' },
        ],
        includedItems: ['Shared billing dashboard', 'Roaming plan options', 'Upgrade support'],
        finePrint: ['Hardware upgrade pricing varies by device.', 'Annual employment verification may be required.'],
      },
    ],
  },
  'broadband-internet': {
    templateType: 'TELECOM',
    vendorKeys: ['qa-telecom', 'telus'],
    offers: [
      {
        title: 'Work-From-Home Fibre Plan',
        productName: 'Fibre 1G',
        productModel: 'Home Broadband',
        discountValue: '15% off',
        discountType: 'PERCENTAGE',
        originalPrice: '$95/mo',
        discountedPrice: '$80.75/mo',
        summary: 'access employee pricing on gigabit fibre internet designed for remote work and streaming.',
        bestFor: 'remote work setups and high-bandwidth households',
        specs: [
          { label: 'Speed', value: 'Up to 1 Gbps download on supported addresses' },
          { label: 'Wi-Fi', value: 'Advanced Wi-Fi hardware included' },
        ],
        pricing: [
          { label: 'Employee rate', value: '$80.75/mo on approved plans' },
          { label: 'Install', value: 'Professional install credit included' },
        ],
        includedItems: ['Wi-Fi hardware', 'Installation credit', 'Remote setup guide'],
        finePrint: ['Service availability depends on address eligibility.', 'Equipment return fees may apply.'],
      },
      {
        title: 'Unlimited Broadband Bundle',
        productName: 'Unlimited Broadband Bundle',
        productModel: 'Home Connectivity',
        discountValue: 'Free router upgrade',
        discountType: 'SPECIAL',
        summary: 'secure unlimited broadband pricing with a complimentary router upgrade for employee households.',
        bestFor: 'households upgrading older home internet equipment',
        specs: [
          { label: 'Data policy', value: 'Unlimited monthly usage on eligible plans' },
          { label: 'Hardware', value: 'Premium router upgrade included' },
        ],
        pricing: [
          { label: 'Upgrade value', value: 'Router upgrade included at no extra cost' },
          { label: 'Contract', value: '12 or 24 month terms available' },
        ],
        includedItems: ['Unlimited usage', 'Router upgrade', 'Priority install scheduling'],
        finePrint: ['Upgrade availability varies by inventory.', 'Early cancellation charges can apply.'],
      },
    ],
  },
  'mobile-plans': {
    templateType: 'TELECOM',
    vendorKeys: ['telus', 'qa-telecom'],
    offers: [
      {
        title: '50GB Premium Mobile Plan',
        productName: '50GB Premium Plan',
        productModel: '5G Mobile',
        discountValue: '$18/mo savings',
        discountType: 'FIXED',
        originalPrice: '$83/mo',
        discountedPrice: '$65/mo',
        summary: 'choose a premium 50GB 5G mobile plan with reduced monthly pricing and roaming perks.',
        bestFor: 'employees using mobile hotspots and business travel',
        specs: [
          { label: 'Data', value: '50GB high-speed 5G data before speed management' },
          { label: 'Roaming', value: 'North America roaming included on select plans' },
        ],
        pricing: [
          { label: 'Employee rate', value: '$65/mo before taxes' },
          { label: 'Device options', value: 'Financing available on compatible devices' },
        ],
        includedItems: ['5G service', 'Roaming option', 'eSIM support'],
        finePrint: ['Device financing is billed separately.', 'Roaming inclusions vary by plan tier.'],
      },
      {
        title: 'Shared Family Mobile Plan',
        productName: 'Shared Family Plan',
        productModel: 'Family Mobility',
        discountValue: '10GB bonus data',
        discountType: 'SPECIAL',
        summary: 'add family lines with bonus shared data and reduced monthly pricing for verified employees.',
        bestFor: 'families managing multiple devices',
        specs: [
          { label: 'Shared data', value: 'Bonus 10GB added to family data pool' },
          { label: 'Line support', value: 'Up to five lines per account' },
        ],
        pricing: [
          { label: 'Primary line', value: 'Preferred employee monthly pricing' },
          { label: 'Add-a-line', value: 'Reduced monthly pricing on eligible family lines' },
        ],
        includedItems: ['Shared data pool', 'Online account controls', 'Optional device protection'],
        finePrint: ['Bonus data may expire if employment verification lapses.', 'Additional taxes apply.'],
      },
    ],
  },
  insurance: {
    templateType: 'GENERIC',
    vendorKeys: ['qa-insurance', 'qa-banking'],
    offers: [
      {
        title: 'Home and Auto Insurance Bundle',
        productName: 'Home and Auto Bundle',
        productModel: 'Employee Protection',
        discountValue: '18% off',
        discountType: 'PERCENTAGE',
        summary: 'bundle home and auto coverage with employee pricing and a dedicated licensed advisor.',
        bestFor: 'households reviewing annual insurance renewals',
        specs: [
          { label: 'Coverage', value: 'Home, tenant, condo, and auto options available' },
          { label: 'Advisor', value: 'Licensed advisor consult included' },
        ],
        pricing: [
          { label: 'Bundle saving', value: 'Up to 18% off combined policy pricing' },
          { label: 'Payments', value: 'Monthly and annual billing options' },
        ],
        includedItems: ['Coverage review', 'Claims support guide', 'Bundled renewal reminder'],
        finePrint: ['Savings vary by driving history and home profile.', 'Coverage is subject to underwriting.'],
      },
      {
        title: 'Travel Medical Protection Package',
        productName: 'Travel Medical Package',
        productModel: 'Emergency Coverage',
        discountValue: '$75 annual savings',
        discountType: 'FIXED',
        summary: 'add emergency travel medical coverage and trip interruption protection at employee pricing.',
        bestFor: 'employees planning personal or business travel',
        specs: [
          { label: 'Coverage term', value: 'Single-trip and annual multi-trip options' },
          { label: 'Benefits', value: 'Emergency medical and trip interruption protection' },
        ],
        pricing: [
          { label: 'Annual saving', value: '$75 off annual travel coverage' },
          { label: 'Deductible', value: 'Multiple deductible tiers available' },
        ],
        includedItems: ['Emergency medical coverage', 'Trip interruption cover', '24/7 claims hotline'],
        finePrint: ['Pre-existing condition exclusions may apply.', 'Policy wording governs final coverage.'],
      },
    ],
  },
  travel: {
    templateType: 'TRAVEL',
    vendorKeys: ['marriott', 'qa-travel'],
    offers: [
      {
        title: 'Employee Flight and Hotel Savings',
        productName: 'Travel Saver Package',
        productModel: 'Flight + Stay',
        discountValue: '20% off',
        discountType: 'PERCENTAGE',
        summary: 'book flights and hotel stays through an employee travel package with discounted rates and support.',
        bestFor: 'weekend getaways and business travel extensions',
        specs: [
          { label: 'Booking mix', value: 'Flights, hotels, and car rentals available' },
          { label: 'Support', value: 'Corporate travel desk assistance' },
        ],
        pricing: [
          { label: 'Typical saving', value: 'Up to 20% off eligible packages' },
          { label: 'Inventory', value: 'Rates depend on travel dates and availability' },
        ],
        includedItems: ['Travel desk access', 'Discounted hotel rates', 'Flight savings options'],
        bookingRules: ['Book through the employee travel booking link.', 'Rates are subject to blackout dates and availability.'],
        finePrint: ['Airfare rules vary by carrier and fare type.', 'Taxes and destination fees are not discounted.'],
      },
      {
        title: 'Baggage-Inclusive Fare Offer',
        productName: 'Baggage-Inclusive Fare',
        productModel: 'Air Travel',
        discountValue: '$120 fare credit',
        discountType: 'FIXED',
        summary: 'travel with a discounted fare that includes checked baggage and priority support for employee bookings.',
        bestFor: 'employees booking domestic or cross-border trips',
        specs: [
          { label: 'Fare perk', value: 'Includes one checked bag on eligible itineraries' },
          { label: 'Support', value: 'Priority assistance for itinerary changes' },
        ],
        pricing: [
          { label: 'Fare credit', value: '$120 fare credit on qualifying bookings' },
          { label: 'Change support', value: 'Preferred change handling via the booking desk' },
        ],
        includedItems: ['Checked baggage benefit', 'Preferred support', 'Fare credit'],
        bookingRules: ['Eligible only on selected routes and carriers.', 'Booking must be completed through the employee portal.'],
        finePrint: ['Carrier-specific conditions still apply.', 'Credits cannot be redeemed for prior bookings.'],
      },
    ],
  },
  'hotels-stays': {
    templateType: 'TRAVEL',
    vendorKeys: ['marriott', 'qa-travel'],
    offers: [
      {
        title: 'City Break Hotel Rate',
        productName: 'City Break Rate',
        productModel: 'Hotel Stay',
        discountValue: '22% off',
        discountType: 'PERCENTAGE',
        summary: 'save on city hotel stays with late checkout and employee-rate inventory at participating properties.',
        bestFor: 'short stays, conferences, and weekend trips',
        specs: [
          { label: 'Perk', value: 'Late checkout on participating bookings' },
          { label: 'Inventory', value: 'Employee-rate rooms at selected properties' },
        ],
        pricing: [
          { label: 'Employee rate', value: 'Up to 22% off standard room pricing' },
          { label: 'Breakfast', value: 'Package upgrades available at select hotels' },
        ],
        includedItems: ['Hotel discount', 'Late checkout option', 'Direct booking support'],
        bookingRules: ['Book within the approved employee booking window.', 'Property blackout dates may apply.'],
        finePrint: ['Resort fees and local taxes are extra.', 'Late checkout is subject to availability.'],
      },
      {
        title: 'Extended Stay Savings',
        productName: 'Extended Stay Package',
        productModel: 'Long Stay',
        discountValue: 'Third night reduced',
        discountType: 'SPECIAL',
        summary: 'book longer hotel stays with reduced nightly pricing and employee support for itinerary changes.',
        bestFor: 'extended stays and project travel',
        specs: [
          { label: 'Stay length', value: 'Best value on stays of three nights or longer' },
          { label: 'Flexibility', value: 'Preferred support for itinerary changes' },
        ],
        pricing: [
          { label: 'Savings', value: 'Reduced nightly pricing on the third night and beyond' },
          { label: 'Availability', value: 'Rates vary by property and length of stay' },
        ],
        includedItems: ['Extended stay pricing', 'Booking support', 'Project travel flexibility'],
        bookingRules: ['Long-stay inventory can be limited during peak periods.', 'Book using the employee hotel booking link.'],
        finePrint: ['Minimum stay requirements apply.', 'Property cancellation windows vary.'],
      },
    ],
  },
  technology: {
    templateType: 'GENERIC',
    vendorKeys: ['apple', 'qa-technology'],
    offers: [
      {
        title: 'Device and Accessory Savings',
        productName: 'Employee Device Savings',
        productModel: 'Hardware Purchase',
        discountValue: '12% off',
        discountType: 'PERCENTAGE',
        summary: 'save on eligible laptops, tablets, monitors, and accessories through an employee hardware program.',
        bestFor: 'refreshing personal work-from-home equipment',
        specs: [
          { label: 'Eligible devices', value: 'Laptops, tablets, monitors, and accessories' },
          { label: 'Limit', value: 'Annual quantity limits apply by product family' },
        ],
        pricing: [
          { label: 'Discount', value: 'Up to 12% off select hardware' },
          { label: 'Checkout', value: 'Employee pricing applied during sign-in' },
        ],
        includedItems: ['Hardware savings', 'Accessory pricing', 'Employee checkout flow'],
        finePrint: ['Availability varies by region and inventory.', 'Some premium launches may be excluded.'],
      },
      {
        title: 'Hybrid Work Tech Bundle',
        productName: 'Hybrid Work Bundle',
        productModel: 'Productivity Hardware',
        discountValue: '$180 bundle savings',
        discountType: 'FIXED',
        summary: 'bundle a laptop accessory kit with audio and monitor discounts for hybrid work setups.',
        bestFor: 'employees building a home office setup',
        specs: [
          { label: 'Bundle items', value: 'Monitor, keyboard, headset, and webcam savings' },
          { label: 'Support', value: 'Online purchase guidance for bundle configuration' },
        ],
        pricing: [
          { label: 'Bundle savings', value: '$180 off selected hybrid work bundles' },
          { label: 'Shipping', value: 'Standard shipping included on eligible orders' },
        ],
        includedItems: ['Bundle pricing', 'Accessory selection guide', 'Standard shipping'],
        finePrint: ['Bundle SKUs vary by stock levels.', 'Items must be purchased in the same order to qualify.'],
      },
    ],
  },
  'software-productivity': {
    templateType: 'GENERIC',
    vendorKeys: ['adobe', 'qa-technology'],
    offers: [
      {
        title: 'AI Productivity Suite Discount',
        productName: 'AI Productivity Suite',
        productModel: 'Annual Subscription',
        discountValue: '35% off',
        discountType: 'PERCENTAGE',
        originalPrice: '$29.99/mo',
        discountedPrice: '$19.49/mo',
        summary: 'save on a software bundle covering documents, creative work, and AI productivity features.',
        bestFor: 'employees using creative and document tools outside work',
        specs: [
          { label: 'Apps', value: 'Docs, design, and AI productivity tools included' },
          { label: 'Billing', value: 'Annual subscription with employee pricing' },
        ],
        pricing: [
          { label: 'Employee rate', value: '$19.49/mo on annual billing' },
          { label: 'Regular price', value: '$29.99/mo' },
        ],
        includedItems: ['Desktop apps', 'Cloud storage', 'AI assistant credits'],
        finePrint: ['Commercial use restrictions may apply.', 'Pricing renews at the then-current employee rate.'],
      },
      {
        title: 'Creative Apps Pack Offer',
        productName: 'Creative Apps Pack',
        productModel: 'Creative Subscription',
        discountValue: '2 free months',
        discountType: 'SPECIAL',
        summary: 'get a discounted creative software pack with two free months on annual employee billing.',
        bestFor: 'designers, creators, and side projects',
        specs: [
          { label: 'Creative tools', value: 'Design, photo, and video apps included' },
          { label: 'Storage', value: 'Expanded cloud storage on annual plans' },
        ],
        pricing: [
          { label: 'Free months', value: 'Two months included on annual billing' },
          { label: 'Renewal', value: 'Employee pricing continues while eligibility is maintained' },
        ],
        includedItems: ['Creative app access', 'Cloud storage', 'Template library'],
        finePrint: ['Early cancellation fees may apply on annual subscriptions.', 'Offer cannot be combined with student pricing.'],
      },
    ],
  },
  wellness: {
    templateType: 'GENERIC',
    vendorKeys: ['equinox', 'qa-fitness'],
    offers: [
      {
        title: 'Wellness Pass Membership',
        productName: 'Wellness Pass',
        productModel: 'Fitness + Recovery',
        discountValue: '20% off',
        discountType: 'PERCENTAGE',
        summary: 'access a wellness pass with gym entry, recovery classes, and lifestyle coaching at employee pricing.',
        bestFor: 'employees building a weekly wellness routine',
        specs: [
          { label: 'Access', value: 'Gym, classes, and recovery amenities' },
          { label: 'Support', value: 'Intro session with a wellness coach' },
        ],
        pricing: [
          { label: 'Membership saving', value: '20% off qualifying wellness passes' },
          { label: 'Initiation', value: 'Reduced onboarding fee on eligible locations' },
        ],
        includedItems: ['Club access', 'Recovery classes', 'Intro wellness coaching'],
        finePrint: ['Amenity availability varies by location.', 'Membership terms differ by facility.'],
      },
      {
        title: 'Mental Wellness Coaching Package',
        productName: 'Wellness Coaching Package',
        productModel: 'Coaching Sessions',
        discountValue: '$120 session credit',
        discountType: 'FIXED',
        summary: 'book wellness coaching and guided mental fitness sessions with an employee session credit.',
        bestFor: 'employees prioritizing stress management and resilience',
        specs: [
          { label: 'Session format', value: 'Virtual and in-person options available' },
          { label: 'Coach access', value: 'Certified wellness coaches' },
        ],
        pricing: [
          { label: 'Credit', value: '$120 applied to the first coaching package' },
          { label: 'Package size', value: 'Multiple session bundles available' },
        ],
        includedItems: ['Coaching credit', 'Wellness assessment', 'Goal tracking tools'],
        finePrint: ['Coaching is not a substitute for medical treatment.', 'Appointment availability varies by provider.'],
      },
    ],
  },
  'fitness-memberships': {
    templateType: 'GENERIC',
    vendorKeys: ['equinox', 'qa-fitness'],
    offers: [
      {
        title: 'Premium Gym Membership Discount',
        productName: 'Premium Gym Membership',
        productModel: 'Club Access',
        discountValue: '18% off',
        discountType: 'PERCENTAGE',
        summary: 'join a premium gym membership with reduced monthly pricing and waived enrollment fees.',
        bestFor: 'employees seeking regular gym and class access',
        specs: [
          { label: 'Club access', value: 'Access to participating club locations' },
          { label: 'Classes', value: 'Group fitness classes included' },
        ],
        pricing: [
          { label: 'Monthly saving', value: '18% off standard membership pricing' },
          { label: 'Enrollment fee', value: 'Waived on approved memberships' },
        ],
        includedItems: ['Club access', 'Group classes', 'Digital training tools'],
        finePrint: ['Premium club surcharges may still apply.', 'Membership freeze rules vary by location.'],
      },
      {
        title: 'Studio Class Bundle',
        productName: 'Studio Class Bundle',
        productModel: 'Class Package',
        discountValue: 'Buy 10, get 2 free',
        discountType: 'SPECIAL',
        summary: 'buy an employee studio-class bundle with bonus sessions for yoga, cycling, and strength training.',
        bestFor: 'employees mixing classes into their weekly routine',
        specs: [
          { label: 'Eligible classes', value: 'Yoga, cycling, HIIT, and strength classes' },
          { label: 'Booking', value: 'Advance class reservations supported' },
        ],
        pricing: [
          { label: 'Bundle perk', value: 'Buy 10 classes and receive 2 bonus classes' },
          { label: 'Validity', value: 'Class credits valid for 90 days' },
        ],
        includedItems: ['Bonus classes', 'Digital booking portal', 'Waitlist support'],
        finePrint: ['Unused classes expire after the validity period.', 'Premium workshops are excluded.'],
      },
    ],
  },
  retail: {
    templateType: 'GENERIC',
    vendorKeys: ['qa-retail', 'qa-technology'],
    offers: [
      {
        title: 'Electronics and Home Savings Event',
        productName: 'Electronics Savings Event',
        productModel: 'Retail Discount',
        discountValue: '15% off',
        discountType: 'PERCENTAGE',
        summary: 'shop an employee savings event on electronics, small appliances, and home office essentials.',
        bestFor: 'home upgrades and seasonal purchases',
        specs: [
          { label: 'Eligible items', value: 'Electronics, appliances, and home office accessories' },
          { label: 'Access', value: 'Employee discount code unlocks participating SKUs' },
        ],
        pricing: [
          { label: 'Saving', value: '15% off eligible products' },
          { label: 'Shipping', value: 'Free standard shipping on qualifying orders' },
        ],
        includedItems: ['Discount code access', 'Seasonal product range', 'Standard shipping perk'],
        finePrint: ['Doorbusters and clearance products may be excluded.', 'Order limits can apply on high-demand products.'],
      },
      {
        title: 'Family Shopping Voucher Pack',
        productName: 'Shopping Voucher Pack',
        productModel: 'Voucher Program',
        discountValue: '$100 voucher',
        discountType: 'FIXED',
        summary: 'redeem an employee shopping voucher pack across family and home essentials during promo windows.',
        bestFor: 'family purchases and back-to-school shopping',
        specs: [
          { label: 'Voucher use', value: 'Apply on eligible family and home categories' },
          { label: 'Redemption', value: 'One voucher pack per verified employee per cycle' },
        ],
        pricing: [
          { label: 'Voucher value', value: '$100 total voucher value on qualifying baskets' },
          { label: 'Minimum spend', value: 'Minimum basket threshold applies' },
        ],
        includedItems: ['Voucher credits', 'Promo reminders', 'Digital redemption instructions'],
        finePrint: ['Voucher codes are non-transferable.', 'Unused voucher balances cannot be refunded.'],
      },
    ],
  },
  dining: {
    templateType: 'RESTAURANT',
    vendorKeys: ['cactus', 'qa-restaurant'],
    offers: [
      {
        title: 'Employee Dining Perk',
        productName: 'Dining Perk',
        productModel: 'In-Restaurant Offer',
        discountValue: '20% off',
        discountType: 'PERCENTAGE',
        summary: 'save on dine-in food and non-alcoholic beverages during employee dining windows.',
        bestFor: 'weekday meals and team lunches',
        timingRules: ['Valid Sunday through Thursday during regular dining hours.', 'Blackout dates apply on special event menus and holidays.'],
        includedItems: ['Dine-in food purchases', 'Non-alcoholic beverages', 'One discounted bill per visit'],
        pricing: [
          { label: 'Savings', value: '20% off eligible menu items' },
          { label: 'Redemption', value: 'One offer redemption per verified employee visit' },
        ],
        finePrint: ['Taxes, gratuity, and alcohol are excluded.', 'Cannot be combined with other restaurant promotions.'],
      },
      {
        title: 'Family Meal Credit',
        productName: 'Family Meal Credit',
        productModel: 'Meal Voucher',
        discountValue: '$35 meal credit',
        discountType: 'FIXED',
        summary: 'claim a meal credit for family dining visits at participating restaurant locations.',
        bestFor: 'family dinners and casual celebrations',
        timingRules: ['Valid on lunch and dinner service at participating locations.', 'Advance reservation may be recommended for peak periods.'],
        includedItems: ['Meal credit toward eligible menu items', 'Participating family dining locations', 'Digital redemption confirmation'],
        pricing: [
          { label: 'Credit', value: '$35 credit on qualifying bills' },
          { label: 'Threshold', value: 'Minimum spend applies before the credit is deducted' },
        ],
        finePrint: ['Credit has no cash value and is non-transferable.', 'Offer excludes third-party delivery channels.'],
      },
    ],
  },
  restaurants: {
    templateType: 'RESTAURANT',
    vendorKeys: ['qa-restaurant', 'cactus'],
    offers: [
      {
        title: 'Weekday Dining Discount',
        productName: 'Weekday Dining Discount',
        productModel: 'Restaurant Offer',
        discountValue: '15% off',
        discountType: 'PERCENTAGE',
        summary: 'unlock a weekday restaurant discount for lunch and dinner at participating locations.',
        bestFor: 'after-work meals and weekday meetups',
        timingRules: ['Valid Monday to Thursday after 11 a.m.', 'Holiday blackout dates apply.'],
        includedItems: ['Dine-in food purchases', 'Reservation support at participating venues'],
        pricing: [
          { label: 'Discount', value: '15% off eligible menu items' },
          { label: 'Coverage', value: 'Applies to one table per verified employee' },
        ],
        finePrint: ['Alcohol, gratuity, and promotional menus are excluded.', 'Offer must be presented before the bill is closed.'],
      },
      {
        title: 'Team Lunch Bundle',
        productName: 'Team Lunch Bundle',
        productModel: 'Group Dining',
        discountValue: 'Free appetizer platter',
        discountType: 'SPECIAL',
        summary: 'book a team lunch bundle with shared starters and reserved employee pricing for group dining.',
        bestFor: 'small team lunches and group meals',
        timingRules: ['Advance booking is recommended for groups of six or more.', 'Available during weekday lunch service.'],
        includedItems: ['Shared appetizer platter', 'Group dining reservation support', 'Discounted lunch set menus'],
        pricing: [
          { label: 'Perk', value: 'Complimentary appetizer platter on qualifying group bookings' },
          { label: 'Set menus', value: 'Discounted lunch set menus available for groups' },
        ],
        finePrint: ['Minimum group size applies.', 'Not valid with banquet pricing or private events.'],
      },
    ],
  },
  entertainment: {
    templateType: 'FUN_PARK',
    vendorKeys: ['qa-movies', 'qa-fun-park'],
    offers: [
      {
        title: 'Cinema and Streaming Savings Pass',
        productName: 'Entertainment Savings Pass',
        productModel: 'Movies + Streaming',
        discountValue: '$12 monthly savings',
        discountType: 'FIXED',
        summary: 'pair discounted cinema tickets with a streaming subscription savings pass for employees.',
        bestFor: 'movie nights and home entertainment',
        timingRules: ['Digital ticket codes are released after employee verification.', 'Streaming savings apply while the offer is active.'],
        includedItems: ['Discounted movie tickets', 'Streaming subscription savings', 'Digital redemption codes'],
        pricing: [
          { label: 'Monthly value', value: '$12 combined entertainment savings' },
          { label: 'Ticket access', value: 'Discounted ticket packs while inventory lasts' },
        ],
        finePrint: ['Premium screenings may carry surcharges.', 'Streaming discounts apply to new or returning subscribers only.'],
      },
      {
        title: 'Weekend Fun Park Admission Bundle',
        productName: 'Weekend Admission Bundle',
        productModel: 'Attraction Pass',
        discountValue: '25% off',
        discountType: 'PERCENTAGE',
        summary: 'get discounted weekend attraction admission with family add-on pricing and priority entry.',
        bestFor: 'family outings and weekend plans',
        timingRules: ['Weekend inventory is limited and must be booked in advance.', 'Peak holiday weekends may be excluded.'],
        includedItems: ['Weekend admission ticket', 'Priority entry lane', 'Discounted family add-ons'],
        pricing: [
          { label: 'Admission saving', value: '25% off standard weekend pricing' },
          { label: 'Family add-ons', value: 'Reduced rates for extra family members' },
        ],
        finePrint: ['Height and safety restrictions still apply by attraction.', 'Weather closures follow the venue policy.'],
      },
    ],
  },
  general: {
    templateType: 'GENERIC',
    vendorKeys: ['qa-retail', 'qa-technology'],
    offers: [
      {
        title: 'Employee Essentials Savings',
        productName: 'Employee Essentials',
        productModel: 'General Offer',
        discountValue: '15% off',
        discountType: 'PERCENTAGE',
        summary: 'unlock a broad employee savings offer that works well for general QA browsing and apply-flow testing.',
        bestFor: 'general perks discovery and basic employee savings',
        specs: [
          { label: 'Usage', value: 'Works as a general-purpose employee perk offer' },
          { label: 'Redemption', value: 'Standard lead-based apply flow' },
        ],
        pricing: [
          { label: 'Discount', value: '15% off eligible employee purchases' },
          { label: 'Availability', value: 'Available while the QA campaign is active' },
        ],
        includedItems: ['General employee savings', 'Standard apply flow', 'Reusable QA coverage badge'],
        finePrint: ['This seeded offer exists to cover the General category in QA.', 'Final vendor pricing may vary by redemption channel.'],
      },
      {
        title: 'Flexible Employee Benefit Credit',
        productName: 'Benefit Credit',
        productModel: 'General Credit',
        discountValue: '$50 credit',
        discountType: 'FIXED',
        summary: 'apply a flexible employee credit that can be used to validate general category rendering and detail sections.',
        bestFor: 'general category coverage and detail page testing',
        specs: [
          { label: 'Offer type', value: 'Flexible credit with standard terms and policies' },
          { label: 'Category fit', value: 'Supports fallback and general browsing experiences' },
        ],
        pricing: [
          { label: 'Credit value', value: '$50 credit on qualifying redemptions' },
          { label: 'Conditions', value: 'Minimum spend requirements can apply' },
        ],
        includedItems: ['Flexible employee credit', 'Fallback category coverage', 'Standard QA content blocks'],
        finePrint: ['Credit is non-transferable and not redeemable for cash.', 'Minimum basket thresholds may apply.'],
      },
    ],
  },
};

function getQaCompanyProfile(slug: string) {
  return QA_COMPANY_PROFILES.find((profile) => profile.slug === slug) || null;
}

const BILLING_PLAN_PRESETS = {
  FREE: {
    planType: 'SUBSCRIPTION',
    monthlyFee: '0.00',
    includedLeadsPerMonth: 10,
    overagePricePerLead: '5.00',
    currency: 'USD',
    offerLimit: 5,
    durationDays: 90,
  },
  PAID: {
    planType: 'SUBSCRIPTION',
    monthlyFee: '149.00',
    includedLeadsPerMonth: 75,
    overagePricePerLead: '3.00',
    currency: 'USD',
    offerLimit: 25,
    durationDays: 365,
  },
  PREMIUM: {
    planType: 'SUBSCRIPTION',
    monthlyFee: '499.00',
    includedLeadsPerMonth: 300,
    overagePricePerLead: '2.00',
    currency: 'USD',
    offerLimit: 100,
    durationDays: 365,
  },
  PAY_PER_LEAD: {
    planType: 'PAY_PER_LEAD',
    pricePerLead: '12.50',
    monthlyFee: null,
    includedLeadsPerMonth: null,
    overagePricePerLead: null,
    currency: 'CAD',
    offerLimit: 25,
    durationDays: 365,
  },
} as const;

const daysFromNow = (days: number) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
};

async function upsertVendorBillingSetup(
  vendorId: string,
  planId: string,
  presetKey: keyof typeof BILLING_PLAN_PRESETS,
  options?: {
    billingCycleDay?: number;
    startsAt?: Date;
    endsAt?: Date | null;
  }
) {
  const preset = BILLING_PLAN_PRESETS[presetKey];
  const startsAt = options?.startsAt || daysFromNow(-15);
  const endsAt =
    options?.endsAt === undefined ? daysFromNow(preset.durationDays) : options.endsAt;
  const billingCycleDay = options?.billingCycleDay || 1;

  await prisma.vendorBilling.upsert({
    where: { vendorId },
    update: {
      billingMode: preset.planType === 'PAY_PER_LEAD' ? 'PAY_PER_LEAD' : 'MONTHLY',
      postTrialMode: preset.planType === 'PAY_PER_LEAD' ? 'PAY_PER_LEAD' : 'MONTHLY',
      trialEndsAt: null,
      leadPriceCents: preset.pricePerLead ? Math.round(Number(preset.pricePerLead) * 100) : 0,
      monthlyFeeCents: preset.monthlyFee ? Math.round(Number(preset.monthlyFee) * 100) : 0,
      paymentMethod: 'MANUAL',
      currency: preset.currency,
      billingDay: billingCycleDay,
    },
    create: {
      vendorId,
      billingMode: preset.planType === 'PAY_PER_LEAD' ? 'PAY_PER_LEAD' : 'MONTHLY',
      postTrialMode: preset.planType === 'PAY_PER_LEAD' ? 'PAY_PER_LEAD' : 'MONTHLY',
      trialEndsAt: null,
      leadPriceCents: preset.pricePerLead ? Math.round(Number(preset.pricePerLead) * 100) : 0,
      monthlyFeeCents: preset.monthlyFee ? Math.round(Number(preset.monthlyFee) * 100) : 0,
      paymentMethod: 'MANUAL',
      currency: preset.currency,
      billingDay: billingCycleDay,
    },
  });

  await (prisma as any).vendorBillingPlan.updateMany({
    where: {
      vendorId,
      isActive: true,
      id: { not: planId },
    },
    data: { isActive: false },
  });

  await (prisma as any).vendorBillingPlan.upsert({
    where: { id: planId },
    update: {
      vendorId,
      planType: preset.planType,
      pricePerLead: preset.pricePerLead,
      monthlyFee: preset.monthlyFee,
      includedLeadsPerMonth: preset.includedLeadsPerMonth,
      overagePricePerLead: preset.overagePricePerLead,
      offerLimit: preset.offerLimit,
      billingCycleDay,
      currency: preset.currency,
      startsAt,
      endsAt,
      isActive: true,
    },
    create: {
      id: planId,
      vendorId,
      planType: preset.planType,
      pricePerLead: preset.pricePerLead,
      monthlyFee: preset.monthlyFee,
      includedLeadsPerMonth: preset.includedLeadsPerMonth,
      overagePricePerLead: preset.overagePricePerLead,
      offerLimit: preset.offerLimit,
      billingCycleDay,
      currency: preset.currency,
      startsAt,
      endsAt,
      isActive: true,
    },
  });
}

async function upsertApprovedVendorAccount(input: (typeof QA_VENDOR_DEFINITIONS)[number]) {
  const passwordHash = await bcrypt.hash('vendor123', 10);

  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: {
      passwordHash,
      name: input.userName,
      role: 'VENDOR',
    },
    create: {
      email: input.email,
      passwordHash,
      name: input.userName,
      role: 'VENDOR',
    },
  });

  const vendor = await prisma.vendor.upsert({
    where: { userId: user.id },
    update: {
      companyName: input.companyName,
      contactName: input.contactName,
      email: input.email,
      phone: input.phone,
      website: input.website,
      businessType: input.businessType,
      description: input.description,
      city: input.city || null,
      status: 'APPROVED',
    } as any,
    create: {
      userId: user.id,
      companyName: input.companyName,
      contactName: input.contactName,
      email: input.email,
      phone: input.phone,
      website: input.website,
      businessType: input.businessType,
      description: input.description,
      city: input.city || null,
      status: 'APPROVED',
    } as any,
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { vendorId: vendor.id } as any,
  });

  return vendor;
}

function buildQaCoverage(profile: (typeof QA_COMPANY_PROFILES)[number], companyIndex: number, categoryIndex: number, variantIndex: number) {
  if (variantIndex === 0) {
    return {
      coverageType: 'COMPANY_WIDE',
      provinceCode: null,
      cityName: null,
      location: 'All locations',
      badge: 'All locations',
    };
  }

  if ((companyIndex + categoryIndex) % 2 === 0) {
    return {
      coverageType: 'PROVINCE_SPECIFIC',
      provinceCode: profile.defaultProvinceCode,
      cityName: null,
      location: `${profile.defaultProvinceCode} only`,
      badge: `${profile.defaultProvinceCode} only`,
    };
  }

  return {
    coverageType: 'CITY_SPECIFIC',
    provinceCode: profile.defaultProvinceCode,
    cityName: profile.defaultCityName,
    location: profile.defaultLocationLabel,
    badge: `${profile.defaultCityName}, ${profile.defaultProvinceCode} only`,
  };
}

function buildQaHighlights(blueprint: any, vendorName: string, coverageBadge: string) {
  return [
    { label: 'Offer', value: blueprint.discountValue },
    { label: 'Best for', value: blueprint.bestFor },
    { label: 'Vendor', value: vendorName },
    { label: 'Availability', value: coverageBadge },
  ];
}

function buildQaDetailSections(blueprint: any, coverageBadge: string) {
  const sections: any[] = [];

  if (blueprint.specs?.length) {
    sections.push({ type: 'specs', title: 'Offer specs', items: blueprint.specs });
  }
  if (blueprint.pricing?.length) {
    sections.push({ type: 'pricing', title: 'Pricing overview', items: blueprint.pricing });
  }
  sections.push({
    type: 'eligibility',
    title: 'Eligibility',
    items: [
      { value: 'Verified employees of the selected company can apply through CorpDeals.' },
      { value: `Location applicability: ${coverageBadge}.` },
    ],
  });
  if (blueprint.includedItems?.length) {
    sections.push({
      type: 'included_items',
      title: 'What is included',
      items: blueprint.includedItems.map((value: string) => ({ value })),
    });
  }
  if (blueprint.timingRules?.length) {
    sections.push({
      type: 'timing_rules',
      title: 'Timing rules',
      items: blueprint.timingRules.map((value: string) => ({ value })),
    });
  }
  if (blueprint.bookingRules?.length) {
    sections.push({
      type: 'booking_rules',
      title: 'Booking rules',
      items: blueprint.bookingRules.map((value: string) => ({ value })),
    });
  }
  sections.push({
    type: 'how_it_works',
    title: 'How it works',
    items: blueprint.howToClaim.map((value: string) => ({ value })),
  });
  sections.push({
    type: 'fine_print',
    title: 'Fine print',
    items: blueprint.finePrint.map((value: string) => ({ value })),
  });
  sections.push({
    type: 'faq',
    title: 'FAQ',
    items: [
      {
        title: 'How do I keep access to this offer?',
        value: 'Maintain an active verified employee account and complete the apply flow with consent and terms acceptance.',
      },
    ],
  });

  return sections;
}

async function upsertVerifiedEmployeeUser(input: {
  email: string;
  name: string;
  companyId: string;
  provinceCode?: string | null;
  cityName?: string | null;
}) {
  const passwordHash = await bcrypt.hash('Test@12345', 10);
  const verifiedAt = new Date();
  const expiresAt = new Date(verifiedAt);
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  const codeHash = await bcrypt.hash(`seed-${input.email}`, 10);

  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: {
      passwordHash,
      name: input.name,
      role: 'USER',
      activeCompanyId: input.companyId,
      employeeCompanyId: input.companyId,
      employmentVerifiedAt: verifiedAt,
      provinceCode: input.provinceCode || null,
      cityName: input.cityName || null,
    } as any,
    create: {
      email: input.email,
      passwordHash,
      name: input.name,
      role: 'USER',
      activeCompanyId: input.companyId,
      employeeCompanyId: input.companyId,
      employmentVerifiedAt: verifiedAt,
      provinceCode: input.provinceCode || null,
      cityName: input.cityName || null,
    } as any,
  });

  await prisma.userCompanyVerification.upsert({
    where: {
      userId_companyId: {
        userId: user.id,
        companyId: input.companyId,
      },
    },
    update: {
      verificationMethod: 'work_email',
      verifiedAt,
      expiresAt,
      status: 'verified',
    },
    create: {
      userId: user.id,
      companyId: input.companyId,
      verificationMethod: 'work_email',
      verifiedAt,
      expiresAt,
      status: 'verified',
    },
  });

  const existingVerification = await prisma.employeeVerification.findFirst({
    where: {
      userId: user.id,
      companyId: input.companyId,
      email: input.email,
    },
    select: { id: true },
  });

  if (existingVerification) {
    await prisma.employeeVerification.update({
      where: { id: existingVerification.id },
      data: {
        status: 'VERIFIED',
        codeHash,
        codeExpiresAt: expiresAt,
        verifiedAt,
      },
    });
  } else {
    await prisma.employeeVerification.create({
      data: {
        userId: user.id,
        companyId: input.companyId,
        email: input.email,
        status: 'VERIFIED',
        method: 'EMAIL',
        codeHash,
        codeExpiresAt: expiresAt,
        verifiedAt,
      },
    });
  }

  return user;
}

async function upsertSeedLead(input: {
  id: string;
  userId?: string | null;
  offerId: string;
  companyId: string;
  vendorId?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  employeeId?: string | null;
  status?: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'CLOSED';
  provinceCode?: string | null;
  cityName?: string | null;
}) {
  const now = new Date();

  return prisma.lead.upsert({
    where: { id: input.id },
    update: {
      userId: input.userId || null,
      offerId: input.offerId,
      companyId: input.companyId,
      vendorId: input.vendorId || null,
      payloadJson: {
        source: 'seed',
        termsAccepted: true,
        consent: true,
        userProvinceCode: input.provinceCode || null,
        userCity: input.cityName || null,
      },
      consent: true,
      consentAt: now,
      consentIp: 'seed-script',
      termsAccepted: true,
      termsAcceptedAt: now,
      userProvinceCodeAtSubmission: input.provinceCode || null,
      userCityAtSubmission: input.cityName || null,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      employeeId: input.employeeId || null,
      status: input.status || 'NEW',
    } as any,
    create: {
      id: input.id,
      userId: input.userId || null,
      offerId: input.offerId,
      companyId: input.companyId,
      vendorId: input.vendorId || null,
      payloadJson: {
        source: 'seed',
        termsAccepted: true,
        consent: true,
        userProvinceCode: input.provinceCode || null,
        userCity: input.cityName || null,
      },
      consent: true,
      consentAt: now,
      consentIp: 'seed-script',
      termsAccepted: true,
      termsAcceptedAt: now,
      userProvinceCodeAtSubmission: input.provinceCode || null,
      userCityAtSubmission: input.cityName || null,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      employeeId: input.employeeId || null,
      status: input.status || 'NEW',
    } as any,
  });
}

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@corpdeals.io' },
    update: {},
    create: {
      email: 'admin@corpdeals.io',
      passwordHash: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });
  console.log('Created admin user:', admin.email);

  const financePassword = await bcrypt.hash('finance123', 10);
  const finance = await prisma.user.upsert({
    where: { email: 'finance@corpdeals.io' },
    update: {
      passwordHash: financePassword,
      name: 'Finance User',
      role: 'FINANCE',
    },
    create: {
      email: 'finance@corpdeals.io',
      passwordHash: financePassword,
      name: 'Finance User',
      role: 'FINANCE',
    },
  });
  console.log('Created finance user:', finance.email);

  const salesPassword = await bcrypt.hash('sales123', 10);
  const sales = await prisma.user.upsert({
    where: { email: 'sales@corpdeals.io' },
    update: {
      passwordHash: salesPassword,
      name: 'Sales User',
      role: 'SALES',
    },
    create: {
      email: 'sales@corpdeals.io',
      passwordHash: salesPassword,
      name: 'Sales User',
      role: 'SALES',
    },
  });
  console.log('Created sales user:', sales.email);

  // Create categories
  const categories = [
    { name: 'Banking & Finance', slug: 'banking', icon: 'Building2', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    { name: 'Automotive', slug: 'automotive', icon: 'Car', color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { name: 'Telecom', slug: 'telecom', icon: 'Wifi', color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { name: 'Insurance', slug: 'insurance', icon: 'Shield', color: 'text-teal-600', bgColor: 'bg-teal-50' },
    { name: 'Travel', slug: 'travel', icon: 'Plane', color: 'text-sky-600', bgColor: 'bg-sky-50' },
    { name: 'Technology', slug: 'technology', icon: 'Laptop', color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
    { name: 'Wellness', slug: 'wellness', icon: 'Heart', color: 'text-rose-600', bgColor: 'bg-rose-50' },
    { name: 'Retail', slug: 'retail', icon: 'ShoppingBag', color: 'text-amber-600', bgColor: 'bg-amber-50' },
    { name: 'Dining', slug: 'dining', icon: 'UtensilsCrossed', color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { name: 'Entertainment', slug: 'entertainment', icon: 'Ticket', color: 'text-pink-600', bgColor: 'bg-pink-50' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { ...cat, parentId: null },
      create: { ...cat, parentId: null },
    });
  }

  const parentCategories = await prisma.category.findMany({
    where: {
      slug: {
        in: ['banking', 'telecom', 'technology', 'travel', 'wellness'],
      },
    },
    select: { id: true, slug: true },
  });
  const parentCategoryBySlug = new Map(parentCategories.map((category) => [category.slug, category.id]));

  const subcategories = [
    {
      name: 'Personal Banking',
      slug: 'personal-banking',
      parentSlug: 'banking',
      icon: 'Wallet',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      name: 'Credit Cards',
      slug: 'credit-cards',
      parentSlug: 'banking',
      icon: 'CreditCard',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      name: 'Broadband & Internet',
      slug: 'broadband-internet',
      parentSlug: 'telecom',
      icon: 'Cable',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      name: 'Mobile Plans',
      slug: 'mobile-plans',
      parentSlug: 'telecom',
      icon: 'Smartphone',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      name: 'Software & Productivity',
      slug: 'software-productivity',
      parentSlug: 'technology',
      icon: 'AppWindow',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      name: 'Hotels & Stays',
      slug: 'hotels-stays',
      parentSlug: 'travel',
      icon: 'Hotel',
      color: 'text-sky-600',
      bgColor: 'bg-sky-50',
    },
    {
      name: 'Fitness Memberships',
      slug: 'fitness-memberships',
      parentSlug: 'wellness',
      icon: 'Dumbbell',
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
    },
    {
      name: 'Restaurants',
      slug: 'restaurants',
      parentSlug: 'dining',
      icon: 'UtensilsCrossed',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  for (const category of subcategories) {
    const parentId = parentCategoryBySlug.get(category.parentSlug);
    if (!parentId) continue;

    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        icon: category.icon,
        color: category.color,
        bgColor: category.bgColor,
        parentId,
      },
      create: {
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        color: category.color,
        bgColor: category.bgColor,
        parentId,
      },
    });
  }
  console.log('Created categories');

  await (prisma as any).platformPolicy.upsert({
    where: { id: 'policy-default-terms-template' },
    update: {
      policyType: 'TERMS_TEMPLATE',
      title: 'Default Offer Terms template',
      bodyText: DEFAULT_OFFER_TERMS_TEMPLATE,
      isDefault: true,
    },
    create: {
      id: 'policy-default-terms-template',
      policyType: 'TERMS_TEMPLATE',
      title: 'Default Offer Terms template',
      bodyText: DEFAULT_OFFER_TERMS_TEMPLATE,
      isDefault: true,
    },
  });

  await (prisma as any).platformPolicy.upsert({
    where: { id: 'policy-default-cancellation-template' },
    update: {
      policyType: 'CANCELLATION_TEMPLATE',
      title: 'Default Cancellation/Refund template',
      bodyText: DEFAULT_CANCELLATION_TEMPLATE,
      isDefault: true,
    },
    create: {
      id: 'policy-default-cancellation-template',
      policyType: 'CANCELLATION_TEMPLATE',
      title: 'Default Cancellation/Refund template',
      bodyText: DEFAULT_CANCELLATION_TEMPLATE,
      isDefault: true,
    },
  });
  console.log('Seeded default platform policy templates');

  // Create companies
  const companies = mergeUniqueCompanies([
    ...QA_COMPANY_PROFILES.map(({ defaultProvinceCode, defaultCityName, defaultLocationLabel, qaEmail, qaUserName, ...company }) => company),
    { name: 'Netflix', slug: 'netflix', domain: 'netflix.com', allowedDomains: ['netflix.com'], employeeCount: '12K+', headquarters: 'Los Gatos, CA', brandColor: '#E50914', verified: true },
  ], WARM_COMPANY_CATALOG);

  for (const company of companies) {
    const created = await prisma.company.upsert({
      where: { slug: company.slug },
      update: company,
      create: company,
    });

    // Add HR contact for each company
    if (company.domain) {
      await prisma.hRContact.upsert({
        where: {
          id: `hr-${company.slug}`,
        },
        update: {},
        create: {
          id: `hr-${company.slug}`,
          companyId: created.id,
          name: `HR Manager - ${company.name}`,
          email: `hr@${company.domain}`,
          title: 'HR Benefits Manager',
          isPrimary: true,
        },
      });
    }
  }
  console.log('Created companies and HR contacts');

  // Create a sample vendor
  const vendorPassword = await bcrypt.hash('vendor123', 10);
  const vendorUser = await prisma.user.upsert({
    where: { email: 'vendor@coastcapital.com' },
    update: {},
    create: {
      email: 'vendor@coastcapital.com',
      passwordHash: vendorPassword,
      name: 'Coast Capital Vendor',
      role: 'VENDOR',
    },
  });

  const vendor = await prisma.vendor.upsert({
    where: { userId: vendorUser.id },
    update: {},
    create: {
      userId: vendorUser.id,
      companyName: 'Coast Capital Savings',
      contactName: 'John Smith',
      email: 'vendor@coastcapital.com',
      phone: '604-555-0100',
      website: 'https://coastcapitalsavings.com',
      businessType: 'Banking & Finance',
      description: 'Coast Capital Savings is a member-owned credit union.',
      status: 'APPROVED',
    },
  });
  console.log('Created sample vendor:', vendor.companyName);

  await upsertVendorBillingSetup(vendor.id, 'seed-plan-coast-pay-per-lead', 'PAY_PER_LEAD');
  console.log('Seeded billing plan for sample vendor:', vendor.companyName);

  const bmoPassword = await bcrypt.hash('vendor123', 10);
  const bmoUser = await prisma.user.upsert({
    where: { email: 'vendor@bmo.com' },
    update: {
      role: 'VENDOR',
      name: 'BMO Vendor',
      passwordHash: bmoPassword,
    },
    create: {
      email: 'vendor@bmo.com',
      passwordHash: bmoPassword,
      name: 'BMO Vendor',
      role: 'VENDOR',
    },
  });

  const bmoVendor = await prisma.vendor.upsert({
    where: { userId: bmoUser.id },
    update: {
      companyName: 'BMO',
      contactName: 'BMO Partnerships',
      email: 'vendor@bmo.com',
      phone: '604-555-0950',
      website: 'https://www.bmo.com',
      businessType: 'Banking & Finance',
      city: 'Toronto',
      status: 'APPROVED',
    } as any,
    create: {
      userId: bmoUser.id,
      companyName: 'BMO',
      contactName: 'BMO Partnerships',
      email: 'vendor@bmo.com',
      phone: '604-555-0950',
      website: 'https://www.bmo.com',
      businessType: 'Banking & Finance',
      city: 'Toronto',
      status: 'APPROVED',
    } as any,
  });
  await prisma.user.update({
    where: { id: bmoUser.id },
    data: { vendorId: bmoVendor.id } as any,
  });
  console.log('Created sample vendor:', bmoVendor.companyName);

  // Create a Kia vendor
  const kiaPassword = await bcrypt.hash('vendor123', 10);
  const kiaUser = await prisma.user.upsert({
    where: { email: 'vendor@kia.com' },
    update: {},
    create: {
      email: 'vendor@kia.com',
      passwordHash: kiaPassword,
      name: 'Kia Vendor',
      role: 'VENDOR',
    },
  });

  const kiaVendor = await prisma.vendor.upsert({
    where: { userId: kiaUser.id },
    update: {},
    create: {
      userId: kiaUser.id,
      companyName: 'Kia Canada - BC Dealers',
      contactName: 'Kia Partner Team',
      email: 'vendor@kia.com',
      phone: '604-555-0200',
      website: 'https://www.kia.ca',
      businessType: 'Automotive',
      description: 'Kia Canada dealer network for corporate employee programs.',
      status: 'APPROVED',
    },
  });
  console.log('Created sample vendor:', kiaVendor.companyName);

  // Create a Telus vendor
  const telusPassword = await bcrypt.hash('vendor123', 10);
  const telusUser = await prisma.user.upsert({
    where: { email: 'vendor@telus.com' },
    update: {},
    create: {
      email: 'vendor@telus.com',
      passwordHash: telusPassword,
      name: 'Telus Vendor',
      role: 'VENDOR',
    },
  });

  const telusVendor = await prisma.vendor.upsert({
    where: { userId: telusUser.id },
    update: {},
    create: {
      userId: telusUser.id,
      companyName: 'Telus',
      contactName: 'Telus Partner Team',
      email: 'vendor@telus.com',
      phone: '604-555-0300',
      website: 'https://www.telus.com',
      businessType: 'Telecom',
      description: 'Telus corporate employee plans and services.',
      status: 'APPROVED',
    },
  });
  await prisma.user.update({
    where: { id: telusUser.id },
    data: { vendorId: telusVendor.id } as any,
  });
  console.log('Created sample vendor:', telusVendor.companyName);

  // Create a Chase vendor
  const chasePassword = await bcrypt.hash('vendor123', 10);
  const chaseUser = await prisma.user.upsert({
    where: { email: 'vendor@chase.com' },
    update: {},
    create: {
      email: 'vendor@chase.com',
      passwordHash: chasePassword,
      name: 'Chase Vendor',
      role: 'VENDOR',
    },
  });

  const chaseVendor = await prisma.vendor.upsert({
    where: { userId: chaseUser.id },
    update: {},
    create: {
      userId: chaseUser.id,
      companyName: 'Chase Bank',
      contactName: 'Chase Partner Team',
      email: 'vendor@chase.com',
      phone: '604-555-0400',
      website: 'https://www.chase.com',
      businessType: 'Banking & Finance',
      description: 'Chase employee banking partnerships.',
      status: 'APPROVED',
    },
  });
  console.log('Created sample vendor:', chaseVendor.companyName);

  // Create additional vendors for Google/Microsoft sample offers
  const applePassword = await bcrypt.hash('vendor123', 10);
  const appleUser = await prisma.user.upsert({
    where: { email: 'vendor@apple.com' },
    update: {},
    create: {
      email: 'vendor@apple.com',
      passwordHash: applePassword,
      name: 'Apple Vendor',
      role: 'VENDOR',
    },
  });

  const appleVendor = await prisma.vendor.upsert({
    where: { userId: appleUser.id },
    update: {},
    create: {
      userId: appleUser.id,
      companyName: 'Apple',
      contactName: 'Apple Partner Team',
      email: 'vendor@apple.com',
      phone: '604-555-0500',
      website: 'https://www.apple.com',
      businessType: 'Technology',
      description: 'Apple employee purchase program partnerships.',
      status: 'APPROVED',
    },
  });
  console.log('Created sample vendor:', appleVendor.companyName);

  const equinoxPassword = await bcrypt.hash('vendor123', 10);
  const equinoxUser = await prisma.user.upsert({
    where: { email: 'vendor@equinox.com' },
    update: {},
    create: {
      email: 'vendor@equinox.com',
      passwordHash: equinoxPassword,
      name: 'Equinox Vendor',
      role: 'VENDOR',
    },
  });

  const equinoxVendor = await prisma.vendor.upsert({
    where: { userId: equinoxUser.id },
    update: {},
    create: {
      userId: equinoxUser.id,
      companyName: 'Equinox',
      contactName: 'Equinox Corporate Team',
      email: 'vendor@equinox.com',
      phone: '604-555-0600',
      website: 'https://www.equinox.com',
      businessType: 'Wellness',
      description: 'Equinox corporate membership programs.',
      status: 'APPROVED',
    },
  });
  console.log('Created sample vendor:', equinoxVendor.companyName);

  const bmwPassword = await bcrypt.hash('vendor123', 10);
  const bmwUser = await prisma.user.upsert({
    where: { email: 'vendor@bmw.com' },
    update: {},
    create: {
      email: 'vendor@bmw.com',
      passwordHash: bmwPassword,
      name: 'BMW Vendor',
      role: 'VENDOR',
    },
  });

  const bmwVendor = await prisma.vendor.upsert({
    where: { userId: bmwUser.id },
    update: {},
    create: {
      userId: bmwUser.id,
      companyName: 'BMW USA',
      contactName: 'BMW Corporate Team',
      email: 'vendor@bmw.com',
      phone: '604-555-0700',
      website: 'https://www.bmwusa.com',
      businessType: 'Automotive',
      description: 'BMW employee pricing programs.',
      status: 'APPROVED',
    },
  });
  console.log('Created sample vendor:', bmwVendor.companyName);

  const adobePassword = await bcrypt.hash('vendor123', 10);
  const adobeUser = await prisma.user.upsert({
    where: { email: 'vendor@adobe.com' },
    update: {},
    create: {
      email: 'vendor@adobe.com',
      passwordHash: adobePassword,
      name: 'Adobe Vendor',
      role: 'VENDOR',
    },
  });

  const adobeVendor = await prisma.vendor.upsert({
    where: { userId: adobeUser.id },
    update: {},
    create: {
      userId: adobeUser.id,
      companyName: 'Adobe',
      contactName: 'Adobe Partner Team',
      email: 'vendor@adobe.com',
      phone: '604-555-0800',
      website: 'https://www.adobe.com',
      businessType: 'Technology',
      description: 'Adobe Creative Cloud corporate discounts.',
      status: 'APPROVED',
    },
  });
  console.log('Created sample vendor:', adobeVendor.companyName);

  const marriottPassword = await bcrypt.hash('vendor123', 10);
  const marriottUser = await prisma.user.upsert({
    where: { email: 'vendor@marriott.com' },
    update: {},
    create: {
      email: 'vendor@marriott.com',
      passwordHash: marriottPassword,
      name: 'Marriott Vendor',
      role: 'VENDOR',
    },
  });

  const marriottVendor = await prisma.vendor.upsert({
    where: { userId: marriottUser.id },
    update: {},
    create: {
      userId: marriottUser.id,
      companyName: 'Marriott Bonvoy',
      contactName: 'Marriott Corporate Team',
      email: 'vendor@marriott.com',
      phone: '604-555-0900',
      website: 'https://www.marriott.com',
      businessType: 'Travel',
      description: 'Marriott corporate rate partnerships.',
      status: 'APPROVED',
    },
  });
  console.log('Created sample vendor:', marriottVendor.companyName);

  const cactusPassword = await bcrypt.hash('vendor123', 10);
  const cactusUser = await prisma.user.upsert({
    where: { email: 'vendor@cactusclubcafe.com' },
    update: {},
    create: {
      email: 'vendor@cactusclubcafe.com',
      passwordHash: cactusPassword,
      name: 'Cactus Club Vendor',
      role: 'VENDOR',
    },
  });

  const cactusVendor = await prisma.vendor.upsert({
    where: { userId: cactusUser.id },
    update: {},
    create: {
      userId: cactusUser.id,
      companyName: 'Cactus Club Cafe',
      contactName: 'Cactus Club Corporate Team',
      email: 'vendor@cactusclubcafe.com',
      phone: '604-555-0910',
      website: 'https://www.cactusclubcafe.com',
      businessType: 'Dining',
      description: 'Restaurant employee dining offers.',
      status: 'APPROVED',
    },
  });
  console.log('Created sample vendor:', cactusVendor.companyName);

  const qaVendorRegistry = new Map<string, any>();
  for (const vendorDefinition of QA_VENDOR_DEFINITIONS) {
    const qaVendor = await upsertApprovedVendorAccount(vendorDefinition);
    qaVendorRegistry.set(vendorDefinition.key, qaVendor);
  }
  console.log('Created QA vendors:', QA_VENDOR_DEFINITIONS.length);

  await Promise.all([
    upsertVendorBillingSetup(bmoVendor.id, 'seed-plan-bmo-paid', 'PAID'),
    upsertVendorBillingSetup(kiaVendor.id, 'seed-plan-kia-paid', 'PAID'),
    upsertVendorBillingSetup(telusVendor.id, 'seed-plan-telus-premium', 'PREMIUM'),
    upsertVendorBillingSetup(chaseVendor.id, 'seed-plan-chase-paid', 'PAID'),
    upsertVendorBillingSetup(appleVendor.id, 'seed-plan-apple-premium', 'PREMIUM'),
    upsertVendorBillingSetup(equinoxVendor.id, 'seed-plan-equinox-free', 'FREE'),
    upsertVendorBillingSetup(bmwVendor.id, 'seed-plan-bmw-paid', 'PAID'),
    upsertVendorBillingSetup(adobeVendor.id, 'seed-plan-adobe-premium', 'PREMIUM'),
    upsertVendorBillingSetup(marriottVendor.id, 'seed-plan-marriott-premium', 'PREMIUM'),
    upsertVendorBillingSetup(cactusVendor.id, 'seed-plan-cactus-paid', 'PAID'),
    ...Array.from(qaVendorRegistry.entries()).map(([key, vendor]) =>
      upsertVendorBillingSetup(
        vendor.id,
        `seed-plan-${key}`,
        key === 'qa-technology' || key === 'qa-travel' ? 'PREMIUM' : 'PAID'
      )
    ),
  ]);
  console.log('Seeded billing plans for sample and QA vendors');

  // Get category and company IDs for offers
  const bankingCategory = await prisma.category.findUnique({ where: { slug: 'banking' } });
  const automotiveCategory = await prisma.category.findUnique({ where: { slug: 'automotive' } });
  const telecomCategory = await prisma.category.findUnique({ where: { slug: 'telecom' } });
  const broadbandCategory = await prisma.category.findUnique({ where: { slug: 'broadband-internet' } });
  const mobilePlansCategory = await prisma.category.findUnique({ where: { slug: 'mobile-plans' } });
  const technologyCategory = await prisma.category.findUnique({ where: { slug: 'technology' } });
  const softwareCategory = await prisma.category.findUnique({ where: { slug: 'software-productivity' } });
  const wellnessCategory = await prisma.category.findUnique({ where: { slug: 'wellness' } });
  const fitnessCategory = await prisma.category.findUnique({ where: { slug: 'fitness-memberships' } });
  const travelCategory = await prisma.category.findUnique({ where: { slug: 'travel' } });
  const hotelsCategory = await prisma.category.findUnique({ where: { slug: 'hotels-stays' } });
  const diningCategory = await prisma.category.findUnique({ where: { slug: 'dining' } });
  const restaurantsCategory = await prisma.category.findUnique({ where: { slug: 'restaurants' } });
  const amazonCompany = await prisma.company.findUnique({ where: { slug: 'amazon' } });
  const googleCompany = await prisma.company.findUnique({ where: { slug: 'google' } });
  const microsoftCompany = await prisma.company.findUnique({ where: { slug: 'microsoft' } });
  const appleCompany = await prisma.company.findUnique({ where: { slug: 'apple' } });
  const metaCompany = await prisma.company.findUnique({ where: { slug: 'meta' } });
  const bcHydroCompany = await prisma.company.findUnique({ where: { slug: 'bc-hydro' } });
  const cityOfVancouverCompany = await prisma.company.findUnique({ where: { slug: 'city-of-vancouver' } });

  let amazonVancouverUser: Awaited<ReturnType<typeof upsertVerifiedEmployeeUser>> | null = null;
  let amazonTorontoUser: Awaited<ReturnType<typeof upsertVerifiedEmployeeUser>> | null = null;
  let microsoftVancouverUser: Awaited<ReturnType<typeof upsertVerifiedEmployeeUser>> | null = null;
  let microsoftVictoriaUser: Awaited<ReturnType<typeof upsertVerifiedEmployeeUser>> | null = null;
  let microsoftTorontoUser: Awaited<ReturnType<typeof upsertVerifiedEmployeeUser>> | null = null;
  let microsoftNoLocationUser: Awaited<ReturnType<typeof upsertVerifiedEmployeeUser>> | null = null;

  if (amazonCompany && microsoftCompany) {
    [
      amazonVancouverUser,
      amazonTorontoUser,
      microsoftVancouverUser,
      microsoftVictoriaUser,
      microsoftTorontoUser,
      microsoftNoLocationUser,
    ] = await Promise.all([
      upsertVerifiedEmployeeUser({
        email: 'qa.amazon.employee@amazon.com',
        name: 'Amazon Vancouver Employee',
        companyId: amazonCompany.id,
        provinceCode: 'BC',
        cityName: 'Vancouver',
      }),
      upsertVerifiedEmployeeUser({
        email: 'qa.amazon.toronto@amazon.com',
        name: 'Amazon Toronto Employee',
        companyId: amazonCompany.id,
        provinceCode: 'ON',
        cityName: 'Toronto',
      }),
      upsertVerifiedEmployeeUser({
        email: 'qa.microsoft.vancouver@microsoft.com',
        name: 'Microsoft Vancouver Employee',
        companyId: microsoftCompany.id,
        provinceCode: 'BC',
        cityName: 'Vancouver',
      }),
      upsertVerifiedEmployeeUser({
        email: 'qa.microsoft.victoria@microsoft.com',
        name: 'Microsoft Victoria Employee',
        companyId: microsoftCompany.id,
        provinceCode: 'BC',
        cityName: 'Victoria',
      }),
      upsertVerifiedEmployeeUser({
        email: 'qa.microsoft.toronto@microsoft.com',
        name: 'Microsoft Toronto Employee',
        companyId: microsoftCompany.id,
        provinceCode: 'ON',
        cityName: 'Toronto',
      }),
      upsertVerifiedEmployeeUser({
        email: 'qa.microsoft.nolocation@microsoft.com',
        name: 'Microsoft No Location Employee',
        companyId: microsoftCompany.id,
        provinceCode: null,
        cityName: null,
      }),
    ]);
    console.log('Created verified employee test users');
  }

  const qaTargetCompanies = [
    amazonCompany,
    googleCompany,
    microsoftCompany,
    appleCompany,
    metaCompany,
    bcHydroCompany,
    cityOfVancouverCompany,
  ].filter(Boolean) as NonNullable<typeof amazonCompany>[];

  for (const company of qaTargetCompanies) {
    const profile = getQaCompanyProfile(company.slug);
    if (!profile) continue;

    await upsertVerifiedEmployeeUser({
      email: profile.qaEmail,
      name: profile.qaUserName,
      companyId: company.id,
      provinceCode: profile.defaultProvinceCode,
      cityName: profile.defaultCityName,
    });
  }
  console.log('Ensured target QA employee users exist');

  if (bankingCategory && amazonCompany) {
    await prisma.offer.upsert({
      where: { id: 'bmo-amazon-lead-offer' },
      update: {
        vendorId: bmoVendor.id,
        companyId: amazonCompany.id,
        categoryId: bankingCategory.id,
        title: 'BMO Personal Banking Offer for Amazon Employees',
        description:
          'Amazon employees can submit a lead request for BMO banking specialists.',
        offerType: 'lead',
        productName: 'BMO Preferred Chequing',
        productModel: 'Lead Intake',
        productUrl: 'https://www.bmo.com',
        active: true,
      } as any,
      create: {
        id: 'bmo-amazon-lead-offer',
        slug: 'bmo-amazon-lead-offer',
        vendorId: bmoVendor.id,
        companyId: amazonCompany.id,
        categoryId: bankingCategory.id,
        title: 'BMO Personal Banking Offer for Amazon Employees',
        description:
          'Amazon employees can submit a lead request for BMO banking specialists.',
        offerType: 'lead',
        productName: 'BMO Preferred Chequing',
        productModel: 'Lead Intake',
        productUrl: 'https://www.bmo.com',
        discountValue: 'Lead submission',
        discountType: 'SPECIAL',
        terms: ['Lead-only offer'],
        howToClaim: ['Submit request form'],
        active: true,
        verified: true,
      } as any,
    });
    console.log('Created BMO -> Amazon lead offer');

    await prisma.offer.upsert({
      where: { id: 'amazon-vancouver-bmo-dummy-offer' },
      update: {
        vendorId: bmoVendor.id,
        companyId: amazonCompany.id,
        categoryId: bankingCategory.id,
        title: 'Amazon Vancouver Banking Concierge',
        description: 'Dummy city-specific banking lead offer for Amazon employees in Vancouver.',
        coverageType: 'CITY_SPECIFIC',
        provinceCode: 'BC',
        cityName: 'Vancouver',
        offerType: 'lead',
        productName: 'BMO City Concierge',
        productModel: 'Vancouver Intake',
        productUrl: 'https://www.bmo.com',
        discountValue: 'Priority callback',
        discountType: 'SPECIAL',
        active: true,
        verified: true,
      } as any,
      create: {
        id: 'amazon-vancouver-bmo-dummy-offer',
        slug: 'amazon-vancouver-bmo-dummy-offer',
        vendorId: bmoVendor.id,
        companyId: amazonCompany.id,
        categoryId: bankingCategory.id,
        title: 'Amazon Vancouver Banking Concierge',
        description: 'Dummy city-specific banking lead offer for Amazon employees in Vancouver.',
        offerType: 'lead',
        productName: 'BMO City Concierge',
        productModel: 'Vancouver Intake',
        productUrl: 'https://www.bmo.com',
        discountValue: 'Priority callback',
        discountType: 'SPECIAL',
        terms: ['Valid for Amazon employees in Vancouver, BC'],
        howToClaim: ['Open the offer', 'Confirm terms and consent', 'Submit your contact details'],
        active: true,
        verified: true,
        coverageType: 'CITY_SPECIFIC',
        provinceCode: 'BC',
        cityName: 'Vancouver',
        location: 'Vancouver, BC',
      } as any,
    });

    await prisma.offer.upsert({
      where: { id: 'amazon-toronto-bmo-dummy-offer' },
      update: {
        vendorId: bmoVendor.id,
        companyId: amazonCompany.id,
        categoryId: bankingCategory.id,
        title: 'Amazon Toronto Banking Concierge',
        description: 'Dummy city-specific banking lead offer for Amazon employees in Toronto.',
        coverageType: 'CITY_SPECIFIC',
        provinceCode: 'ON',
        cityName: 'Toronto',
        offerType: 'lead',
        productName: 'BMO City Concierge',
        productModel: 'Toronto Intake',
        productUrl: 'https://www.bmo.com',
        discountValue: 'Priority callback',
        discountType: 'SPECIAL',
        active: true,
        verified: true,
      } as any,
      create: {
        id: 'amazon-toronto-bmo-dummy-offer',
        slug: 'amazon-toronto-bmo-dummy-offer',
        vendorId: bmoVendor.id,
        companyId: amazonCompany.id,
        categoryId: bankingCategory.id,
        title: 'Amazon Toronto Banking Concierge',
        description: 'Dummy city-specific banking lead offer for Amazon employees in Toronto.',
        offerType: 'lead',
        productName: 'BMO City Concierge',
        productModel: 'Toronto Intake',
        productUrl: 'https://www.bmo.com',
        discountValue: 'Priority callback',
        discountType: 'SPECIAL',
        terms: ['Valid for Amazon employees in Toronto, ON'],
        howToClaim: ['Open the offer', 'Confirm terms and consent', 'Submit your contact details'],
        active: true,
        verified: true,
        coverageType: 'CITY_SPECIFIC',
        provinceCode: 'ON',
        cityName: 'Toronto',
        location: 'Toronto, ON',
      } as any,
    });
    console.log('Created Amazon city-specific dummy offers');

    await prisma.offer.upsert({
      where: { id: 'coast-capital-mortgage' },
      update: {},
      create: {
        id: 'coast-capital-mortgage',
        slug: 'coast-capital-mortgage',
        vendorId: vendor.id,
        companyId: amazonCompany.id,
        categoryId: bankingCategory.id,
        title: 'Exclusive Mortgage Rates for Amazon Employees',
        description: 'Amazon employees in British Columbia receive preferential mortgage rates and waived application fees.',
        discountValue: '0.5% off',
        discountType: 'PERCENTAGE',
        originalPrice: '5.24%',
        discountedPrice: '4.74%',
        terms: ['Valid for Amazon employees with BC address', 'Minimum mortgage amount: $200,000', 'Subject to credit approval'],
        howToClaim: ['Verify your Amazon employment status', 'Schedule a consultation', 'Complete mortgage application'],
        expiryDate: new Date('2026-12-31'),
        featured: true,
        verified: true,
        active: true,
        location: 'British Columbia, Canada',
        rating: 4.8,
        reviewCount: 89,
      },
    });
    console.log('Created sample offer');

    // Seed a few sample leads for Coast Capital offer so admin/vendor can test reports
    await prisma.lead.createMany({
      data: [
        {
          id: 'seed-lead-1',
          offerId: 'coast-capital-mortgage',
          companyId: amazonCompany.id,
          firstName: 'Alice',
          lastName: 'Nguyen',
          email: 'alice.nguyen@amazon.com',
          phone: '604-555-1001',
          employeeId: 'AMZ-1001',
          status: 'NEW',
        },
        {
          id: 'seed-lead-2',
          offerId: 'coast-capital-mortgage',
          companyId: amazonCompany.id,
          firstName: 'Brian',
          lastName: 'Lee',
          email: 'brian.lee@amazon.com',
          phone: '604-555-1002',
          employeeId: 'AMZ-1002',
          status: 'CONTACTED',
        },
        {
          id: 'seed-lead-3',
          offerId: 'coast-capital-mortgage',
          companyId: amazonCompany.id,
          firstName: 'Carla',
          lastName: 'Singh',
          email: 'carla.singh@amazon.com',
          phone: '604-555-1003',
          employeeId: 'AMZ-1003',
          status: 'CONVERTED',
        },
      ],
      skipDuplicates: true,
    });
    console.log('Created sample leads for Coast Capital / Amazon');
  }

  if (automotiveCategory && amazonCompany) {
    await prisma.offer.upsert({
      where: { id: 'kia-bc-discount' },
      update: {},
      create: {
        id: 'kia-bc-discount',
        slug: 'kia-bc-discount',
        vendorId: kiaVendor.id,
        companyId: amazonCompany.id,
        categoryId: automotiveCategory.id,
        title: '$500 CAD Off Any New Kia Vehicle',
        description: 'Amazon BC employees receive $500 CAD discount on any new Kia vehicle purchase or lease. Valid at participating BC dealerships.',
        discountValue: '$500 CAD',
        discountType: 'FIXED',
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
        expiryDate: new Date('2026-06-30'),
        featured: true,
        verified: true,
        active: true,
        location: 'British Columbia, Canada',
        image: '/offer_kia.jpg',
        rating: 4.6,
        reviewCount: 156,
      },
    });
    console.log('Created Kia offer for Amazon');
  }

  if (telecomCategory && amazonCompany) {
    await prisma.offer.upsert({
      where: { id: 'telus-employee-plan' },
      update: {},
      create: {
        id: 'telus-employee-plan',
        slug: 'telus-employee-plan',
        vendorId: telusVendor.id,
        companyId: amazonCompany.id,
        categoryId: (mobilePlansCategory || telecomCategory).id,
        title: 'Telus Employee Advantage Plan - 25% Off',
        description: 'Amazon employees save 25% on unlimited data plans, home internet, and TV bundles. Family plans included.',
        discountValue: '25% off',
        discountType: 'PERCENTAGE',
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
        expiryDate: new Date('2026-12-31'),
        featured: true,
        verified: true,
        active: true,
        location: 'Canada',
        image: '/offer_telus.jpg',
        rating: 4.5,
        reviewCount: 423,
      },
    });
    console.log('Created Telus offer for Amazon');

    await prisma.offer.upsert({
      where: { id: 'amazon-vancouver-telus-fibre' },
      update: {
        vendorId: telusVendor.id,
        companyId: amazonCompany.id,
        categoryId: (broadbandCategory || telecomCategory).id,
        title: 'Telus PureFibre Home Internet - Vancouver Corporate Rate',
        description:
          'Amazon employees in Metro Vancouver get a city-focused corporate broadband rate on Telus PureFibre home internet plans.',
        coverageType: 'CITY_SPECIFIC',
        provinceCode: 'BC',
        cityName: 'Vancouver',
        active: true,
        verified: true,
      } as any,
      create: {
        id: 'amazon-vancouver-telus-fibre',
        slug: 'amazon-vancouver-telus-fibre',
        vendorId: telusVendor.id,
        companyId: amazonCompany.id,
        categoryId: (broadbandCategory || telecomCategory).id,
        title: 'Telus PureFibre Home Internet - Vancouver Corporate Rate',
        description:
          'Amazon employees in Metro Vancouver get a city-focused corporate broadband rate on Telus PureFibre home internet plans.',
        discountValue: '15% off',
        discountType: 'PERCENTAGE',
        terms: [
          'Valid for verified Amazon employees in Metro Vancouver',
          'Applies to select home internet plans',
          'Subject to service availability',
        ],
        howToClaim: [
          'Search for the Telus broadband deal',
          'Open the Vancouver corporate offer',
          'Submit your application with your saved contact details',
        ],
        expiryDate: new Date('2026-12-31'),
        featured: false,
        verified: true,
        active: true,
        coverageType: 'CITY_SPECIFIC',
        provinceCode: 'BC',
        cityName: 'Vancouver',
        location: 'Vancouver, BC',
        image: '/offer_telus.jpg',
        rating: 4.4,
        reviewCount: 81,
      } as any,
    });
    console.log('Created Vancouver broadband offer for Amazon');
  }

  if (diningCategory && amazonCompany) {
    await prisma.offer.upsert({
      where: { id: 'amazon-cactus-club-dining' },
      update: {
        vendorId: cactusVendor.id,
        companyId: amazonCompany.id,
        categoryId: (restaurantsCategory || diningCategory).id,
        title: 'Cactus Club Employee Dining Offer',
        description:
          'Amazon employees receive a dining perk for weekday lunch and dinner at participating Cactus Club Cafe locations.',
        active: true,
        verified: true,
      } as any,
      create: {
        id: 'amazon-cactus-club-dining',
        slug: 'amazon-cactus-club-dining',
        vendorId: cactusVendor.id,
        companyId: amazonCompany.id,
        categoryId: (restaurantsCategory || diningCategory).id,
        title: 'Cactus Club Employee Dining Offer',
        description:
          'Amazon employees receive a dining perk for weekday lunch and dinner at participating Cactus Club Cafe locations.',
        discountValue: '15% off',
        discountType: 'PERCENTAGE',
        terms: [
          'Valid for verified Amazon employees',
          'Valid Sunday to Thursday',
          'Dine-in only at participating locations',
        ],
        howToClaim: [
          'Open the deal page',
          'Review the timing rules and included items',
          'Show your confirmation at the restaurant',
        ],
        expiryDate: new Date('2026-12-31'),
        featured: false,
        verified: true,
        active: true,
        coverageType: 'COMPANY_WIDE',
        provinceCode: null,
        cityName: null,
        location: 'Participating locations',
        image: '/default-offer-card.png',
        rating: 4.5,
        reviewCount: 64,
      } as any,
    });
    console.log('Created restaurant offer for Amazon');
  }

  if (bankingCategory && amazonCompany) {
    await prisma.offer.upsert({
      where: { id: 'amazon-chase-card' },
      update: {},
      create: {
        id: 'amazon-chase-card',
        slug: 'amazon-chase-card',
        vendorId: chaseVendor.id,
        companyId: amazonCompany.id,
        categoryId: bankingCategory.id,
        title: 'Chase Amazon Employee Credit Card - $200 Bonus',
        description: 'Exclusive Chase credit card for Amazon employees with $200 signup bonus, 5% back on Amazon purchases, and no annual fee.',
        discountValue: '$200 bonus',
        discountType: 'FIXED',
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
        expiryDate: new Date('2026-03-31'),
        featured: false,
        verified: true,
        active: true,
        location: 'United States',
        image: '/offer_creditcard.jpg',
        rating: 4.7,
        reviewCount: 634,
      },
    });
    console.log('Created Chase offer for Amazon');
  }

  if (bankingCategory && googleCompany) {
    await prisma.offer.upsert({
      where: { id: 'chase-sapphire' },
      update: {},
      create: {
        id: 'chase-sapphire',
        slug: 'chase-sapphire',
        vendorId: chaseVendor.id,
        companyId: googleCompany.id,
        categoryId: bankingCategory.id,
        title: 'Chase Sapphire Preferred - 80,000 Points Bonus',
        description: 'Google employees receive enhanced 80,000 points signup bonus (worth $1,000 in travel) plus premium travel benefits.',
        discountValue: '80K points',
        discountType: 'SPECIAL',
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
        expiryDate: new Date('2026-06-30'),
        featured: true,
        verified: true,
        active: true,
        location: 'United States',
        image: '/offer_chase.jpg',
        rating: 4.9,
        reviewCount: 312,
      },
    });
    console.log('Created Chase Sapphire offer for Google');
  }

  if (technologyCategory && googleCompany) {
    await prisma.offer.upsert({
      where: { id: 'apple-employee-discount' },
      update: {},
      create: {
        id: 'apple-employee-discount',
        slug: 'apple-employee-discount',
        vendorId: appleVendor.id,
        companyId: googleCompany.id,
        categoryId: (softwareCategory || technologyCategory).id,
        title: 'Apple Employee Purchase Program - 10% Off',
        description: 'Google employees save 10% on Mac, iPad, Apple Watch, and accessories through Apple EPP.',
        discountValue: '10% off',
        discountType: 'PERCENTAGE',
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
        expiryDate: new Date('2026-12-31'),
        featured: true,
        verified: true,
        active: true,
        location: 'Global',
        image: '/offer_apple.jpg',
        rating: 4.8,
        reviewCount: 892,
      },
    });
    console.log('Created Apple EPP offer for Google');
  }

  if (wellnessCategory && googleCompany) {
    await prisma.offer.upsert({
      where: { id: 'equinox-membership' },
      update: {},
      create: {
        id: 'equinox-membership',
        slug: 'equinox-membership',
        vendorId: equinoxVendor.id,
        companyId: googleCompany.id,
        categoryId: (fitnessCategory || wellnessCategory).id,
        title: 'Equinox Corporate Membership - 20% Off',
        description: 'Google employees receive 20% off Equinox memberships plus waived initiation fee. Access to all locations.',
        discountValue: '20% off',
        discountType: 'PERCENTAGE',
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
        expiryDate: new Date('2026-12-31'),
        featured: false,
        verified: true,
        active: true,
        location: 'United States',
        image: '/offer_equinox.jpg',
        rating: 4.6,
        reviewCount: 445,
      },
    });
    console.log('Created Equinox offer for Google');
  }

  if (automotiveCategory && microsoftCompany) {
    await prisma.offer.upsert({
      where: { id: 'bmw-employee' },
      update: {},
      create: {
        id: 'bmw-employee',
        slug: 'bmw-employee',
        vendorId: bmwVendor.id,
        companyId: microsoftCompany.id,
        categoryId: automotiveCategory.id,
        title: 'BMW Employee Pricing - $2,000 Off',
        description: 'Microsoft employees receive exclusive BMW employee pricing, equivalent to $2,000+ off MSRP on new vehicles.',
        discountValue: '$2,000+ off',
        discountType: 'FIXED',
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
        expiryDate: new Date('2026-12-31'),
        featured: true,
        verified: true,
        active: true,
        coverageType: 'COMPANY_WIDE',
        provinceCode: null,
        cityName: null,
        location: 'United States',
        image: '/offer_bmw.jpg',
        rating: 4.7,
        reviewCount: 234,
      },
    });
    console.log('Created BMW offer for Microsoft');

    if (bankingCategory) {
      await prisma.offer.upsert({
        where: { id: 'microsoft-vancouver-bmo-dummy-offer' },
        update: {
          vendorId: bmoVendor.id,
          companyId: microsoftCompany.id,
          categoryId: bankingCategory.id,
          title: 'Microsoft Vancouver Banking Concierge',
          description: 'Dummy city-specific banking lead offer for Microsoft employees in Vancouver.',
          coverageType: 'CITY_SPECIFIC',
          provinceCode: 'BC',
          cityName: 'Vancouver',
          offerType: 'lead',
          productName: 'BMO City Concierge',
          productModel: 'Vancouver Intake',
          productUrl: 'https://www.bmo.com',
          discountValue: 'Priority callback',
          discountType: 'SPECIAL',
          active: true,
          verified: true,
        } as any,
        create: {
          id: 'microsoft-vancouver-bmo-dummy-offer',
          slug: 'microsoft-vancouver-bmo-dummy-offer',
          vendorId: bmoVendor.id,
          companyId: microsoftCompany.id,
          categoryId: bankingCategory.id,
          title: 'Microsoft Vancouver Banking Concierge',
          description: 'Dummy city-specific banking lead offer for Microsoft employees in Vancouver.',
          offerType: 'lead',
          productName: 'BMO City Concierge',
          productModel: 'Vancouver Intake',
          productUrl: 'https://www.bmo.com',
          discountValue: 'Priority callback',
          discountType: 'SPECIAL',
          terms: ['Valid for Microsoft employees in Vancouver, BC'],
          howToClaim: ['Open the offer', 'Confirm terms and consent', 'Submit your contact details'],
          active: true,
          verified: true,
          coverageType: 'CITY_SPECIFIC',
          provinceCode: 'BC',
          cityName: 'Vancouver',
          location: 'Vancouver, BC',
        } as any,
      });

      await prisma.offer.upsert({
        where: { id: 'microsoft-toronto-bmo-dummy-offer' },
        update: {
          vendorId: bmoVendor.id,
          companyId: microsoftCompany.id,
          categoryId: bankingCategory.id,
          title: 'Microsoft Toronto Banking Concierge',
          description: 'Dummy city-specific banking lead offer for Microsoft employees in Toronto.',
          coverageType: 'CITY_SPECIFIC',
          provinceCode: 'ON',
          cityName: 'Toronto',
          offerType: 'lead',
          productName: 'BMO City Concierge',
          productModel: 'Toronto Intake',
          productUrl: 'https://www.bmo.com',
          discountValue: 'Priority callback',
          discountType: 'SPECIAL',
          active: true,
          verified: true,
        } as any,
        create: {
          id: 'microsoft-toronto-bmo-dummy-offer',
          slug: 'microsoft-toronto-bmo-dummy-offer',
          vendorId: bmoVendor.id,
          companyId: microsoftCompany.id,
          categoryId: bankingCategory.id,
          title: 'Microsoft Toronto Banking Concierge',
          description: 'Dummy city-specific banking lead offer for Microsoft employees in Toronto.',
          offerType: 'lead',
          productName: 'BMO City Concierge',
          productModel: 'Toronto Intake',
          productUrl: 'https://www.bmo.com',
          discountValue: 'Priority callback',
          discountType: 'SPECIAL',
          terms: ['Valid for Microsoft employees in Toronto, ON'],
          howToClaim: ['Open the offer', 'Confirm terms and consent', 'Submit your contact details'],
          active: true,
          verified: true,
          coverageType: 'CITY_SPECIFIC',
          provinceCode: 'ON',
          cityName: 'Toronto',
          location: 'Toronto, ON',
        } as any,
      });
      console.log('Created Microsoft city-specific dummy offers');
    }
  }

  if (technologyCategory && microsoftCompany) {
    await prisma.offer.upsert({
      where: { id: 'adobe-creative-cloud' },
      update: {},
      create: {
        id: 'adobe-creative-cloud',
        slug: 'adobe-creative-cloud',
        vendorId: adobeVendor.id,
        companyId: microsoftCompany.id,
        categoryId: (softwareCategory || technologyCategory).id,
        title: 'Adobe Creative Cloud - 40% Off Annual Plan',
        description: 'Microsoft employees save 40% on Adobe Creative Cloud All Apps plan. Full suite of creative tools.',
        discountValue: '40% off',
        discountType: 'PERCENTAGE',
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
        expiryDate: new Date('2026-12-31'),
        featured: true,
        verified: true,
        active: true,
        coverageType: 'PROVINCE_SPECIFIC',
        provinceCode: 'BC',
        cityName: null,
        location: 'Global',
        image: '/offer_adobe.jpg',
        rating: 4.9,
        reviewCount: 1123,
      },
    });
    console.log('Created Adobe offer for Microsoft');
  }

  if (travelCategory && microsoftCompany) {
    await prisma.offer.upsert({
      where: { id: 'marriott-corporate' },
      update: {},
      create: {
        id: 'marriott-corporate',
        slug: 'marriott-corporate',
        vendorId: marriottVendor.id,
        companyId: microsoftCompany.id,
        categoryId: (hotelsCategory || travelCategory).id,
        title: 'Marriott Corporate Rates - Up to 25% Off',
        description: 'Microsoft employees receive up to 25% off at 7,000+ Marriott properties worldwide plus elite status fast-track.',
        discountValue: '25% off',
        discountType: 'PERCENTAGE',
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
        expiryDate: new Date('2026-12-31'),
        featured: false,
        verified: true,
        active: true,
        coverageType: 'CITY_SPECIFIC',
        provinceCode: 'BC',
        cityName: 'Vancouver',
        location: 'Global',
        image: '/offer_marriott.jpg',
        rating: 4.6,
        reviewCount: 567,
      },
    });
    console.log('Created Marriott offer for Microsoft');

    await prisma.offer.upsert({
      where: { id: 'microsoft-toronto-marriott' },
      update: {
        vendorId: marriottVendor.id,
        companyId: microsoftCompany.id,
        categoryId: (hotelsCategory || travelCategory).id,
        title: 'Toronto Marriott Corporate Rate for Microsoft',
        description: 'Microsoft employees in Toronto receive a city-specific Marriott corporate travel rate.',
        coverageType: 'CITY_SPECIFIC',
        provinceCode: 'ON',
        cityName: 'Toronto',
        active: true,
        verified: true,
      } as any,
      create: {
        id: 'microsoft-toronto-marriott',
        slug: 'microsoft-toronto-marriott',
        vendorId: marriottVendor.id,
        companyId: microsoftCompany.id,
        categoryId: (hotelsCategory || travelCategory).id,
        title: 'Toronto Marriott Corporate Rate for Microsoft',
        description: 'Microsoft employees in Toronto receive a city-specific Marriott corporate travel rate.',
        discountValue: '18% off',
        discountType: 'PERCENTAGE',
        terms: [
          'Valid for Microsoft employees based in Toronto',
          'Subject to hotel availability',
          'Employee verification required',
        ],
        howToClaim: [
          'Open the Microsoft travel portal',
          'Select the Toronto Marriott corporate rate',
          'Confirm your Microsoft work email',
        ],
        expiryDate: new Date('2026-12-31'),
        featured: false,
        verified: true,
        active: true,
        coverageType: 'CITY_SPECIFIC',
        provinceCode: 'ON',
        cityName: 'Toronto',
        location: 'Toronto, ON',
        image: '/offer_marriott.jpg',
        rating: 4.5,
        reviewCount: 88,
      } as any,
    });
    console.log('Created Toronto-specific Marriott offer for Microsoft');
  }

  await (prisma as any).offer.updateMany({
    where: { active: true },
    data: {
      coverageType: 'COMPANY_WIDE',
      provinceCode: null,
      cityName: null,
      complianceStatus: 'APPROVED',
      termsText: DEFAULT_OFFER_TERMS_TEMPLATE,
      cancellationPolicyText: DEFAULT_CANCELLATION_TEMPLATE,
      usePlatformDefaultTerms: true,
      usePlatformDefaultCancellationPolicy: true,
      vendorAttestationAcceptedAt: new Date(),
      vendorAttestationAcceptedIp: 'seed-script',
      complianceNotes: null,
    },
  });
  console.log('Marked active offers as compliance-approved');

  await prisma.offer.updateMany({
    where: { id: 'adobe-creative-cloud' },
    data: {
      coverageType: 'PROVINCE_SPECIFIC',
      provinceCode: 'BC',
      cityName: null,
    } as any,
  });
  await prisma.offer.updateMany({
    where: { id: 'marriott-corporate' },
    data: {
      coverageType: 'CITY_SPECIFIC',
      provinceCode: 'BC',
      cityName: 'Vancouver',
    } as any,
  });
  await prisma.offer.updateMany({
    where: { id: 'microsoft-toronto-marriott' },
    data: {
      coverageType: 'CITY_SPECIFIC',
      provinceCode: 'ON',
      cityName: 'Toronto',
    } as any,
  });
  await prisma.offer.updateMany({
    where: { id: 'microsoft-vancouver-bmo-dummy-offer' },
    data: {
      coverageType: 'CITY_SPECIFIC',
      provinceCode: 'BC',
      cityName: 'Vancouver',
    } as any,
  });
  await prisma.offer.updateMany({
    where: { id: 'microsoft-toronto-bmo-dummy-offer' },
    data: {
      coverageType: 'CITY_SPECIFIC',
      provinceCode: 'ON',
      cityName: 'Toronto',
    } as any,
  });
  await prisma.offer.updateMany({
    where: { id: 'amazon-vancouver-bmo-dummy-offer' },
    data: {
      coverageType: 'CITY_SPECIFIC',
      provinceCode: 'BC',
      cityName: 'Vancouver',
    } as any,
  });
  await prisma.offer.updateMany({
    where: { id: 'amazon-toronto-bmo-dummy-offer' },
    data: {
      coverageType: 'CITY_SPECIFIC',
      provinceCode: 'ON',
      cityName: 'Toronto',
    } as any,
  });
  await prisma.offer.updateMany({
    where: { id: 'telus-employee-plan' },
    data: {
      detailTemplateType: 'TELECOM',
      termsUrl: 'https://www.telus.com/en/support/article/service-terms-between-customer-and-telus',
      cancellationPolicyUrl: 'https://www.telus.com/en/support/article/returns-and-exchanges-policy',
      highlightsJson: [
        { label: 'Savings', value: '25% off select employee plans' },
        { label: 'Lines', value: 'Up to 5 lines per employee account' },
        { label: 'Bundle', value: 'Mobile, internet, and TV options' },
      ],
      detailSectionsJson: [
        {
          type: 'specs',
          title: 'Plan specs',
          items: [
            { label: 'Data', value: 'Unlimited 5G data plans available' },
            { label: 'Family lines', value: 'Share savings across up to 5 lines' },
            { label: 'Internet', value: 'Home internet bundles can be added' },
          ],
        },
        {
          type: 'pricing',
          title: 'Pricing overview',
          items: [
            { label: 'Regular price', value: '$85/mo' },
            { label: 'Employee price', value: '$63.75/mo' },
            { label: 'Contract', value: '2-year term on eligible plans' },
          ],
        },
        {
          type: 'how_it_works',
          title: 'How to activate the offer',
          items: [
            { value: 'Verify your Amazon work email' },
            { value: 'Choose your mobile or bundle plan' },
            { value: 'Complete signup online or in-store' },
          ],
        },
        {
          type: 'fine_print',
          title: 'Before you apply',
          items: [
            { value: 'Device financing may vary by handset' },
            { value: 'Additional taxes and fees are billed separately' },
          ],
        },
        {
          type: 'faq',
          title: 'Frequently asked questions',
          items: [
            {
              title: 'Can I move existing TELUS lines onto this offer?',
              value: 'Yes, eligible existing lines can usually migrate after employee verification.',
            },
          ],
        },
      ],
    } as any,
  });
  await prisma.offer.updateMany({
    where: { id: 'amazon-cactus-club-dining' },
    data: {
      detailTemplateType: 'RESTAURANT',
      termsUrl: 'https://www.cactusclubcafe.com/terms/',
      cancellationPolicyUrl: 'https://www.cactusclubcafe.com/privacy-policy/',
      highlightsJson: [
        { label: 'Dining perk', value: '15% off food purchases' },
        { label: 'Best for', value: 'Weekday lunch and dinner' },
        { label: 'Locations', value: 'Participating Cactus Club Cafe locations' },
      ],
      detailSectionsJson: [
        {
          type: 'timing_rules',
          title: 'When the offer is valid',
          items: [
            { value: 'Sunday to Thursday during regular dining hours' },
            { value: 'Not valid on statutory holidays or special event menus' },
          ],
        },
        {
          type: 'included_items',
          title: 'What is included',
          items: [
            { value: 'Dine-in food purchases' },
            { value: 'One discounted bill per verified employee visit' },
          ],
        },
        {
          type: 'how_it_works',
          title: 'How to redeem',
          items: [
            { value: 'Open the deal page before visiting the restaurant' },
            { value: 'Review timing rules and any exclusions' },
            { value: 'Show your employee confirmation to staff before payment' },
          ],
        },
        {
          type: 'fine_print',
          title: 'Dining restrictions',
          items: [
            { value: 'Alcohol, gratuity, and taxes are excluded' },
            { value: 'Cannot be combined with other restaurant promotions' },
          ],
        },
      ],
    } as any,
  });
  await prisma.offer.updateMany({
    where: { id: 'marriott-corporate' },
    data: {
      detailTemplateType: 'TRAVEL',
      termsUrl: 'https://www.marriott.com/loyalty/terms/default.mi',
      cancellationPolicyUrl: 'https://www.marriott.com/help/cancellation.mi',
      highlightsJson: [
        { label: 'Rate', value: 'Up to 25% off eligible stays' },
        { label: 'Portfolio', value: '7,000+ Marriott properties' },
        { label: 'Bonus', value: 'Elite status fast-track options' },
      ],
      detailSectionsJson: [
        {
          type: 'included_items',
          title: 'Included travel benefits',
          items: [
            { value: 'Corporate room rates at participating properties' },
            { value: 'Eligible Marriott Bonvoy member benefits' },
            { value: 'Access to business travel booking support' },
          ],
        },
        {
          type: 'booking_rules',
          title: 'Booking rules',
          items: [
            { value: 'Book through the approved Microsoft travel portal' },
            { value: 'Rates are subject to hotel inventory and blackout dates' },
            { value: 'Employee verification may be requested at check-in' },
          ],
        },
        {
          type: 'pricing',
          title: 'Rate structure',
          items: [
            { label: 'Typical saving', value: 'Up to 25% off public rates' },
            { label: 'Availability', value: 'Varies by property and stay dates' },
          ],
        },
        {
          type: 'timing_rules',
          title: 'Timing rules',
          items: [
            { value: 'Book before your travel dates while corporate inventory is available' },
            { value: 'Cancellation deadlines vary by property' },
          ],
        },
      ],
    } as any,
  });
  console.log('Applied Microsoft offer coverage variants');

  const qaVendorLookup = new Map<string, any>([
    ['bmo', bmoVendor],
    ['chase', chaseVendor],
    ['kia', kiaVendor],
    ['telus', telusVendor],
    ['apple', appleVendor],
    ['adobe', adobeVendor],
    ['equinox', equinoxVendor],
    ['marriott', marriottVendor],
    ['cactus', cactusVendor],
    ...Array.from(qaVendorRegistry.entries()),
  ]);

  const qaCategories = await prisma.category.findMany({
    include: {
      parent: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
    orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
  });

  let qaOfferCount = 0;

  for (const [companyIndex, company] of qaTargetCompanies.entries()) {
    const companyProfile = getQaCompanyProfile(company.slug);
    if (!companyProfile) continue;

    for (const [categoryIndex, category] of qaCategories.entries()) {
      const rootSlug = category.parent?.slug || category.slug;
      const blueprintSet = QA_BLUEPRINTS_BY_CATEGORY[category.slug] || QA_BLUEPRINTS_BY_CATEGORY[rootSlug];
      if (!blueprintSet) continue;

      const categoryLabel = category.parent ? `${category.parent.name} / ${category.name}` : category.name;
      const image = category.image || QA_IMAGE_BY_ROOT_CATEGORY[rootSlug] || '/default-offer-card.png';

      for (let variantIndex = 0; variantIndex < 2; variantIndex += 1) {
        const blueprint = blueprintSet.offers[variantIndex];
        const vendorKey = blueprintSet.vendorKeys[variantIndex % blueprintSet.vendorKeys.length];
        const vendor = qaVendorLookup.get(vendorKey);
        if (!vendor) continue;

        const coverage = buildQaCoverage(companyProfile, companyIndex, categoryIndex, variantIndex);
        const slug = `qa-${company.slug}-${category.slug}-${variantIndex + 1}`;
        const title = `${blueprint.title} for ${company.name} employees`;
        const howToClaim = blueprint.howToClaim || [
          'Open the deal detail page and review the offer information.',
          'Confirm the terms, cancellation policy, and consent checkboxes.',
          'Submit your contact details to send the lead to the vendor.',
        ];
        const detailBlueprint = { ...blueprint, howToClaim };

        await prisma.offer.upsert({
          where: { slug },
          update: {
            vendorId: vendor.id,
            companyId: company.id,
            categoryId: category.id,
            offerType: 'lead',
            coverageType: coverage.coverageType,
            provinceCode: coverage.provinceCode,
            cityName: coverage.cityName,
            detailTemplateType: blueprintSet.templateType,
            highlightsJson: buildQaHighlights(detailBlueprint, vendor.companyName, coverage.badge),
            detailSectionsJson: buildQaDetailSections(detailBlueprint, coverage.badge),
            configJson: {
              source: 'qa-seed',
              categorySlug: category.slug,
              rootCategorySlug: rootSlug,
            },
            productName: blueprint.productName,
            productModel: blueprint.productModel,
            productUrl: vendor.website || 'https://example.com',
            title,
            description: `${company.name} employees can ${blueprint.summary} This ${categoryLabel.toLowerCase()} offer is seeded for QA and end-to-end testing.`,
            discountValue: blueprint.discountValue,
            discountType: blueprint.discountType,
            originalPrice: blueprint.originalPrice || null,
            discountedPrice: blueprint.discountedPrice || null,
            terms: [
              `Valid for verified ${company.name} employees.`,
              `Category coverage: ${categoryLabel}.`,
              `Location applicability: ${coverage.badge}.`,
            ],
            howToClaim,
            expiryDate: new Date('2027-12-31'),
            featured: variantIndex === 0 && !category.parentId && companyIndex < 3,
            verified: true,
            active: true,
            location: coverage.location,
            image,
            rating: Number((4.3 + ((companyIndex + categoryIndex + variantIndex) % 6) * 0.1).toFixed(1)),
            reviewCount: 24 + categoryIndex * 8 + companyIndex * 5 + variantIndex * 7,
            termsText: DEFAULT_OFFER_TERMS_TEMPLATE,
            termsUrl: vendor.website || 'https://example.com',
            cancellationPolicyText: DEFAULT_CANCELLATION_TEMPLATE,
            cancellationPolicyUrl: vendor.website || 'https://example.com',
            usePlatformDefaultTerms: true,
            usePlatformDefaultCancellationPolicy: true,
            vendorAttestationAcceptedAt: new Date(),
            vendorAttestationAcceptedIp: 'seed-script',
            complianceStatus: 'APPROVED',
            complianceNotes: null,
          } as any,
          create: {
            slug,
            vendorId: vendor.id,
            companyId: company.id,
            categoryId: category.id,
            offerType: 'lead',
            coverageType: coverage.coverageType,
            provinceCode: coverage.provinceCode,
            cityName: coverage.cityName,
            detailTemplateType: blueprintSet.templateType,
            highlightsJson: buildQaHighlights(detailBlueprint, vendor.companyName, coverage.badge),
            detailSectionsJson: buildQaDetailSections(detailBlueprint, coverage.badge),
            configJson: {
              source: 'qa-seed',
              categorySlug: category.slug,
              rootCategorySlug: rootSlug,
            },
            productName: blueprint.productName,
            productModel: blueprint.productModel,
            productUrl: vendor.website || 'https://example.com',
            title,
            description: `${company.name} employees can ${blueprint.summary} This ${categoryLabel.toLowerCase()} offer is seeded for QA and end-to-end testing.`,
            discountValue: blueprint.discountValue,
            discountType: blueprint.discountType,
            originalPrice: blueprint.originalPrice || null,
            discountedPrice: blueprint.discountedPrice || null,
            terms: [
              `Valid for verified ${company.name} employees.`,
              `Category coverage: ${categoryLabel}.`,
              `Location applicability: ${coverage.badge}.`,
            ],
            howToClaim,
            expiryDate: new Date('2027-12-31'),
            featured: variantIndex === 0 && !category.parentId && companyIndex < 3,
            verified: true,
            active: true,
            location: coverage.location,
            image,
            rating: Number((4.3 + ((companyIndex + categoryIndex + variantIndex) % 6) * 0.1).toFixed(1)),
            reviewCount: 24 + categoryIndex * 8 + companyIndex * 5 + variantIndex * 7,
            termsText: DEFAULT_OFFER_TERMS_TEMPLATE,
            termsUrl: vendor.website || 'https://example.com',
            cancellationPolicyText: DEFAULT_CANCELLATION_TEMPLATE,
            cancellationPolicyUrl: vendor.website || 'https://example.com',
            usePlatformDefaultTerms: true,
            usePlatformDefaultCancellationPolicy: true,
            vendorAttestationAcceptedAt: new Date(),
            vendorAttestationAcceptedIp: 'seed-script',
            complianceStatus: 'APPROVED',
          } as any,
        });

        qaOfferCount += 1;
      }
    }
  }
  console.log('Seeded QA offers across all categories and subcategories:', qaOfferCount);

  if (
    amazonCompany &&
    microsoftCompany &&
    amazonVancouverUser &&
    amazonTorontoUser &&
    microsoftVancouverUser &&
    microsoftTorontoUser
  ) {
    await Promise.all([
      upsertSeedLead({
        id: 'seed-lead-amazon-vancouver-bmo-city',
        userId: amazonVancouverUser.id,
        offerId: 'amazon-vancouver-bmo-dummy-offer',
        companyId: amazonCompany.id,
        vendorId: bmoVendor.id,
        firstName: 'Amazon',
        lastName: 'Vancouver',
        email: amazonVancouverUser.email,
        phone: '604-555-2101',
        employeeId: 'AMZ-VAN-001',
        status: 'NEW',
        provinceCode: 'BC',
        cityName: 'Vancouver',
      }),
      upsertSeedLead({
        id: 'seed-lead-amazon-toronto-bmo-city',
        userId: amazonTorontoUser.id,
        offerId: 'amazon-toronto-bmo-dummy-offer',
        companyId: amazonCompany.id,
        vendorId: bmoVendor.id,
        firstName: 'Amazon',
        lastName: 'Toronto',
        email: amazonTorontoUser.email,
        phone: '416-555-2102',
        employeeId: 'AMZ-TOR-001',
        status: 'CONTACTED',
        provinceCode: 'ON',
        cityName: 'Toronto',
      }),
      upsertSeedLead({
        id: 'seed-lead-microsoft-vancouver-bmo-city',
        userId: microsoftVancouverUser.id,
        offerId: 'microsoft-vancouver-bmo-dummy-offer',
        companyId: microsoftCompany.id,
        vendorId: bmoVendor.id,
        firstName: 'Microsoft',
        lastName: 'Vancouver',
        email: microsoftVancouverUser.email,
        phone: '604-555-2201',
        employeeId: 'MS-VAN-001',
        status: 'NEW',
        provinceCode: 'BC',
        cityName: 'Vancouver',
      }),
      upsertSeedLead({
        id: 'seed-lead-microsoft-toronto-bmo-city',
        userId: microsoftTorontoUser.id,
        offerId: 'microsoft-toronto-bmo-dummy-offer',
        companyId: microsoftCompany.id,
        vendorId: bmoVendor.id,
        firstName: 'Microsoft',
        lastName: 'Toronto',
        email: microsoftTorontoUser.email,
        phone: '416-555-2202',
        employeeId: 'MS-TOR-001',
        status: 'QUALIFIED',
        provinceCode: 'ON',
        cityName: 'Toronto',
      }),
    ]);
    console.log('Seeded BMO city-specific enrolled leads for Amazon and Microsoft');
  }

  await prisma.$executeRawUnsafe(`
    UPDATE "offers"
    SET "offer_status" = CASE
      WHEN "compliance_status" = 'submitted' THEN 'SUBMITTED'::"OfferStatus"
      WHEN "compliance_status" = 'rejected' THEN 'REJECTED'::"OfferStatus"
      WHEN "compliance_status" = 'approved' AND "active" = TRUE THEN 'LIVE'::"OfferStatus"
      WHEN "compliance_status" = 'approved' AND "active" = FALSE THEN 'APPROVED'::"OfferStatus"
      ELSE 'DRAFT'::"OfferStatus"
    END
  `);

  console.log('Seeding completed!');
  console.log('\nTest credentials:');
  console.log('Admin: admin@corpdeals.io / admin123');
  console.log('Sales: sales@corpdeals.io / sales123');
  console.log('Finance: finance@corpdeals.io / finance123');
  console.log('Vendor: vendor@coastcapital.com / vendor123');
  console.log('Vendor (BMO): vendor@bmo.com / vendor123');
  console.log('Microsoft Vancouver user: qa.microsoft.vancouver@microsoft.com / Test@12345');
  console.log('Microsoft Victoria user: qa.microsoft.victoria@microsoft.com / Test@12345');
  console.log('Microsoft Toronto user: qa.microsoft.toronto@microsoft.com / Test@12345');
  console.log('Microsoft no-location user: qa.microsoft.nolocation@microsoft.com / Test@12345');
  console.log('Amazon test user: qa.amazon.employee@amazon.com / Test@12345');
  console.log('Amazon Toronto user: qa.amazon.toronto@amazon.com / Test@12345');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
