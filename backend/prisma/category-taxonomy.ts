import { PrismaClient } from '@prisma/client';

export type RootCategorySeed = {
  name: string;
  slug: string;
  icon: string;
  color: string;
  bgColor: string;
};

export type SubcategorySeed = {
  name: string;
  slug: string;
  parentSlug: string;
  icon: string;
  color: string;
  bgColor: string;
};

export const ROOT_CATEGORY_TAXONOMY: RootCategorySeed[] = [
  { name: 'Automotive', slug: 'automotive', icon: 'Car', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  { name: 'Banking & Finance', slug: 'banking', icon: 'Building2', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  { name: 'Dining', slug: 'dining', icon: 'UtensilsCrossed', color: 'text-orange-600', bgColor: 'bg-orange-50' },
  { name: 'Entertainment', slug: 'entertainment', icon: 'Ticket', color: 'text-pink-600', bgColor: 'bg-pink-50' },
  { name: 'General', slug: 'general', icon: 'Grid2X2', color: 'text-slate-600', bgColor: 'bg-slate-50' },
  { name: 'Healthcare & Clinics', slug: 'healthcare-clinics', icon: 'Stethoscope', color: 'text-cyan-700', bgColor: 'bg-cyan-50' },
  { name: 'Insurance', slug: 'insurance', icon: 'Shield', color: 'text-teal-600', bgColor: 'bg-teal-50' },
  { name: 'Retail', slug: 'retail', icon: 'ShoppingBag', color: 'text-amber-600', bgColor: 'bg-amber-50' },
  { name: 'Technology', slug: 'technology', icon: 'Laptop', color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  { name: 'Telecom', slug: 'telecom', icon: 'Wifi', color: 'text-violet-600', bgColor: 'bg-violet-50' },
  { name: 'Training & Education', slug: 'training-education', icon: 'GraduationCap', color: 'text-fuchsia-700', bgColor: 'bg-fuchsia-50' },
  { name: 'Travel', slug: 'travel', icon: 'Plane', color: 'text-sky-600', bgColor: 'bg-sky-50' },
  { name: 'Wellness', slug: 'wellness', icon: 'Heart', color: 'text-rose-600', bgColor: 'bg-rose-50' },
];

export const SUBCATEGORY_TAXONOMY: SubcategorySeed[] = [
  { name: 'Car Rentals', slug: 'automotive-car-rentals', parentSlug: 'automotive', icon: 'Car', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  { name: 'Vehicle Purchase Leads', slug: 'vehicle-purchase-leads', parentSlug: 'automotive', icon: 'BadgeDollarSign', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  { name: 'Maintenance Services', slug: 'maintenance-services', parentSlug: 'automotive', icon: 'Wrench', color: 'text-blue-600', bgColor: 'bg-blue-50' },

  { name: 'Credit Cards', slug: 'credit-cards', parentSlug: 'banking', icon: 'CreditCard', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  { name: 'Personal Banking', slug: 'personal-banking', parentSlug: 'banking', icon: 'Wallet', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  { name: 'Loans', slug: 'loans', parentSlug: 'banking', icon: 'Landmark', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  { name: 'Mortgages', slug: 'mortgages', parentSlug: 'banking', icon: 'House', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  { name: 'Investments / Wealth', slug: 'investments-wealth', parentSlug: 'banking', icon: 'TrendingUp', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },

  { name: 'Restaurants', slug: 'restaurants', parentSlug: 'dining', icon: 'UtensilsCrossed', color: 'text-orange-600', bgColor: 'bg-orange-50' },
  { name: 'Fine Dining', slug: 'fine-dining', parentSlug: 'dining', icon: 'Wine', color: 'text-orange-600', bgColor: 'bg-orange-50' },
  { name: 'Food Delivery', slug: 'food-delivery', parentSlug: 'dining', icon: 'Bike', color: 'text-orange-600', bgColor: 'bg-orange-50' },
  { name: 'Catering', slug: 'catering', parentSlug: 'dining', icon: 'ChefHat', color: 'text-orange-600', bgColor: 'bg-orange-50' },

  { name: 'Movies', slug: 'movies', parentSlug: 'entertainment', icon: 'Film', color: 'text-pink-600', bgColor: 'bg-pink-50' },
  { name: 'Events / Concerts', slug: 'events-concerts', parentSlug: 'entertainment', icon: 'Music', color: 'text-pink-600', bgColor: 'bg-pink-50' },
  { name: 'Streaming', slug: 'streaming', parentSlug: 'entertainment', icon: 'MonitorPlay', color: 'text-pink-600', bgColor: 'bg-pink-50' },

  { name: 'Dental Clinics', slug: 'dental-clinics', parentSlug: 'healthcare-clinics', icon: 'Tooth', color: 'text-cyan-700', bgColor: 'bg-cyan-50' },
  { name: 'Physiotherapy', slug: 'physiotherapy', parentSlug: 'healthcare-clinics', icon: 'Activity', color: 'text-cyan-700', bgColor: 'bg-cyan-50' },
  { name: 'Chiropractic', slug: 'chiropractic', parentSlug: 'healthcare-clinics', icon: 'Bone', color: 'text-cyan-700', bgColor: 'bg-cyan-50' },
  { name: 'Specialist Clinics', slug: 'specialist-clinics', parentSlug: 'healthcare-clinics', icon: 'Hospital', color: 'text-cyan-700', bgColor: 'bg-cyan-50' },
  { name: 'Doctor Clinics', slug: 'doctor-clinics', parentSlug: 'healthcare-clinics', icon: 'Stethoscope', color: 'text-cyan-700', bgColor: 'bg-cyan-50' },

  { name: 'Auto Insurance', slug: 'auto-insurance', parentSlug: 'insurance', icon: 'ShieldCheck', color: 'text-teal-600', bgColor: 'bg-teal-50' },
  { name: 'Home Insurance', slug: 'home-insurance', parentSlug: 'insurance', icon: 'House', color: 'text-teal-600', bgColor: 'bg-teal-50' },
  { name: 'Life Insurance', slug: 'life-insurance', parentSlug: 'insurance', icon: 'HeartPulse', color: 'text-teal-600', bgColor: 'bg-teal-50' },
  { name: 'Health Insurance', slug: 'health-insurance', parentSlug: 'insurance', icon: 'ShieldPlus', color: 'text-teal-600', bgColor: 'bg-teal-50' },

  { name: 'Clothing', slug: 'clothing', parentSlug: 'retail', icon: 'Shirt', color: 'text-amber-600', bgColor: 'bg-amber-50' },
  { name: 'Electronics', slug: 'electronics', parentSlug: 'retail', icon: 'Smartphone', color: 'text-amber-600', bgColor: 'bg-amber-50' },
  { name: 'Home Goods', slug: 'home-goods', parentSlug: 'retail', icon: 'Lamp', color: 'text-amber-600', bgColor: 'bg-amber-50' },

  { name: 'Software & Productivity', slug: 'software-productivity', parentSlug: 'technology', icon: 'AppWindow', color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  { name: 'SaaS Subscriptions', slug: 'saas-subscriptions', parentSlug: 'technology', icon: 'CloudCog', color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  { name: 'Devices', slug: 'devices', parentSlug: 'technology', icon: 'TabletSmartphone', color: 'text-indigo-600', bgColor: 'bg-indigo-50' },

  { name: 'Mobile Plans', slug: 'mobile-plans', parentSlug: 'telecom', icon: 'Smartphone', color: 'text-violet-600', bgColor: 'bg-violet-50' },
  { name: 'Broadband & Internet', slug: 'broadband-internet', parentSlug: 'telecom', icon: 'Cable', color: 'text-violet-600', bgColor: 'bg-violet-50' },
  { name: 'TV Bundles', slug: 'tv-bundles', parentSlug: 'telecom', icon: 'Tv', color: 'text-violet-600', bgColor: 'bg-violet-50' },
  { name: 'Business Plans', slug: 'business-plans', parentSlug: 'telecom', icon: 'Briefcase', color: 'text-violet-600', bgColor: 'bg-violet-50' },

  { name: 'Certifications', slug: 'certifications', parentSlug: 'training-education', icon: 'BadgeCheck', color: 'text-fuchsia-700', bgColor: 'bg-fuchsia-50' },
  { name: 'Coding Bootcamps', slug: 'coding-bootcamps', parentSlug: 'training-education', icon: 'Code2', color: 'text-fuchsia-700', bgColor: 'bg-fuchsia-50' },
  { name: 'Career Coaching', slug: 'career-coaching', parentSlug: 'training-education', icon: 'Compass', color: 'text-fuchsia-700', bgColor: 'bg-fuchsia-50' },
  { name: 'Tutoring', slug: 'tutoring', parentSlug: 'training-education', icon: 'BookOpenText', color: 'text-fuchsia-700', bgColor: 'bg-fuchsia-50' },
  { name: 'Professional Training', slug: 'professional-training', parentSlug: 'training-education', icon: 'GraduationCap', color: 'text-fuchsia-700', bgColor: 'bg-fuchsia-50' },

  { name: 'Hotels & Stays', slug: 'hotels-stays', parentSlug: 'travel', icon: 'Hotel', color: 'text-sky-600', bgColor: 'bg-sky-50' },
  { name: 'Flights', slug: 'flights', parentSlug: 'travel', icon: 'PlaneTakeoff', color: 'text-sky-600', bgColor: 'bg-sky-50' },
  { name: 'Vacation Packages', slug: 'vacation-packages', parentSlug: 'travel', icon: 'Palmtree', color: 'text-sky-600', bgColor: 'bg-sky-50' },
  { name: 'Car Rentals', slug: 'travel-car-rentals', parentSlug: 'travel', icon: 'CarFront', color: 'text-sky-600', bgColor: 'bg-sky-50' },

  { name: 'Fitness Memberships', slug: 'fitness-memberships', parentSlug: 'wellness', icon: 'Dumbbell', color: 'text-rose-600', bgColor: 'bg-rose-50' },
  { name: 'Yoga / Classes', slug: 'yoga-classes', parentSlug: 'wellness', icon: 'Flower2', color: 'text-rose-600', bgColor: 'bg-rose-50' },
  { name: 'Mental Wellness', slug: 'mental-wellness', parentSlug: 'wellness', icon: 'BrainCircuit', color: 'text-rose-600', bgColor: 'bg-rose-50' },
  { name: 'Spa & Beauty', slug: 'spa-beauty', parentSlug: 'wellness', icon: 'Sparkles', color: 'text-rose-600', bgColor: 'bg-rose-50' },
];

type UpsertCategoryTaxonomyResult = {
  rootsUpserted: number;
  subcategoriesUpserted: number;
};

export async function upsertCategoryTaxonomy(prisma: PrismaClient): Promise<UpsertCategoryTaxonomyResult> {
  for (const root of ROOT_CATEGORY_TAXONOMY) {
    await prisma.category.upsert({
      where: { slug: root.slug },
      update: { ...root, parentId: null },
      create: { ...root, parentId: null },
    });
  }

  const parentCategories = await prisma.category.findMany({
    where: { slug: { in: ROOT_CATEGORY_TAXONOMY.map((category) => category.slug) } },
    select: { id: true, slug: true },
  });
  const parentBySlug = new Map(parentCategories.map((category) => [category.slug, category.id]));

  for (const subcategory of SUBCATEGORY_TAXONOMY) {
    const parentId = parentBySlug.get(subcategory.parentSlug);
    if (!parentId) {
      continue;
    }

    await prisma.category.upsert({
      where: { slug: subcategory.slug },
      update: {
        name: subcategory.name,
        icon: subcategory.icon,
        color: subcategory.color,
        bgColor: subcategory.bgColor,
        parentId,
      },
      create: {
        name: subcategory.name,
        slug: subcategory.slug,
        icon: subcategory.icon,
        color: subcategory.color,
        bgColor: subcategory.bgColor,
        parentId,
      },
    });
  }

  return {
    rootsUpserted: ROOT_CATEGORY_TAXONOMY.length,
    subcategoriesUpserted: SUBCATEGORY_TAXONOMY.length,
  };
}
