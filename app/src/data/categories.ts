export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  bgColor: string;
  dealCount: number;
  image: string;
}

export const categories: Category[] = [
  {
    id: 'banking',
    name: 'Banking & Finance',
    icon: 'Building2',
    description: 'Mortgages, loans, credit cards, and banking services with exclusive employee rates',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    dealCount: 450,
    image: '/category_banking.jpg',
  },
  {
    id: 'automotive',
    name: 'Automotive',
    icon: 'Car',
    description: 'New cars, leases, service, and parts with employee discounts',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    dealCount: 320,
    image: '/category_automotive.jpg',
  },
  {
    id: 'telecom',
    name: 'Telecom',
    icon: 'Wifi',
    description: 'Mobile plans, internet, and TV packages at corporate rates',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    dealCount: 180,
    image: '/category_telecom.jpg',
  },
  {
    id: 'insurance',
    name: 'Insurance',
    icon: 'Shield',
    description: 'Home, auto, life, and health insurance with group discounts',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    dealCount: 210,
    image: '/category_insurance.jpg',
  },
  {
    id: 'travel',
    name: 'Travel',
    icon: 'Plane',
    description: 'Hotels, flights, car rentals, and vacation packages',
    color: 'text-sky-600',
    bgColor: 'bg-sky-50',
    dealCount: 680,
    image: '/category_travel.jpg',
  },
  {
    id: 'technology',
    name: 'Technology',
    icon: 'Laptop',
    description: 'Software, hardware, and tech services at employee prices',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    dealCount: 290,
    image: '/category_tech.jpg',
  },
  {
    id: 'wellness',
    name: 'Wellness',
    icon: 'Heart',
    description: 'Gyms, spas, mental health, and wellness services',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    dealCount: 340,
    image: '/category_wellness.jpg',
  },
  {
    id: 'retail',
    name: 'Retail',
    icon: 'ShoppingBag',
    description: 'Clothing, electronics, and everyday shopping discounts',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    dealCount: 520,
    image: '/category_retail.jpg',
  },
  {
    id: 'dining',
    name: 'Dining',
    icon: 'UtensilsCrossed',
    description: 'Restaurants, meal kits, and food delivery discounts',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    dealCount: 890,
    image: '/category_food.jpg',
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    icon: 'Ticket',
    description: 'Movies, events, streaming, and entertainment offers',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    dealCount: 240,
    image: '/category_entertainment.jpg',
  },
];

export const getCategoryById = (id: string): Category | undefined => {
  return categories.find(category => category.id === id);
};
