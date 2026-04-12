import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import Seo from '../components/Seo';
import FooterSection from '../sections/FooterSection';
import Navigation from '../sections/Navigation';

const plans = [
  {
    key: 'FREE',
    name: 'Free',
    price: '$0',
    cadence: '/month',
    description: 'Start listing and capture qualified demand with zero commitment.',
    includedLeads: 10,
    overage: '$5 / lead',
    cta: 'Start Free',
    href: '/vendor/apply',
    featured: false,
    points: [
      '10 qualified leads per month',
      'Basic vendor listing visibility',
      'Email support',
    ],
  },
  {
    key: 'GOLD',
    name: 'Gold',
    price: '$100',
    cadence: '/month',
    description: 'Best for teams growing predictable lead flow every month.',
    includedLeads: 20,
    overage: '$3 / lead',
    cta: 'Choose Gold',
    href: '/vendor/apply',
    featured: true,
    points: [
      '20 qualified leads per month',
      'Priority listing placement',
      'CSV/CRM export support',
    ],
  },
  {
    key: 'PREMIUM',
    name: 'Premium',
    price: '$250',
    cadence: '/month',
    description: 'Scale faster with high volume lead allocation and support.',
    includedLeads: 50,
    overage: '$2 / lead',
    cta: 'Choose Pro',
    href: '/vendor/apply',
    featured: false,
    points: [
      'Up to 250 active offers',
      'Top placement opportunities',
      'Dedicated account support',
    ],
  },
];

export default function PricingPage() {
  return (
    <>
      <Seo
        title="CorpDeals Pricing | Vendor Plans"
        description="Simple vendor pricing with three plans: Free, Gold, and Premium. Scale from your first leads to high-volume monthly demand."
        keywords="corpdeals pricing, vendor plans, subscription pricing, employee marketplace pricing"
        path="/pricing"
        image="/hero_main.jpg"
      />
      <Navigation />
      <main className="bg-corp-light pt-24">
        <section className="px-6 lg:px-12 py-14 lg:py-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-3xl mx-auto">
              <p className="inline-flex items-center rounded-full bg-corp-highlight px-4 py-1.5 text-sm font-medium text-corp-blue">
                Vendor Pricing
              </p>
              <h1 className="mt-5 font-montserrat text-4xl md:text-5xl font-bold text-corp-dark">
                Straightforward Plans. Predictable Growth.
              </h1>
              <p className="mt-4 font-inter text-lg text-corp-gray">
                Choose a plan that matches your pipeline goals. Every plan includes qualified lead delivery and
                monthly billing.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {plans.map((plan) => (
                <article
                  key={plan.key}
                  className={`rounded-2xl border p-6 shadow-sm ${
                    plan.featured
                      ? 'border-corp-blue bg-white ring-2 ring-corp-blue/20'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  {plan.featured ? (
                    <p className="mb-4 inline-flex rounded-full bg-corp-blue px-3 py-1 text-xs font-semibold text-white">
                      Most Popular
                    </p>
                  ) : (
                    <div className="mb-4 h-6" />
                  )}
                  <h2 className="font-montserrat text-2xl font-bold text-corp-dark">{plan.name}</h2>
                  <p className="mt-1 text-sm text-corp-gray">{plan.description}</p>

                  <div className="mt-5 flex items-end gap-2">
                    <p className="font-montserrat text-4xl font-bold text-corp-dark">{plan.price}</p>
                    <p className="mb-1 text-sm text-corp-gray">{plan.cadence}</p>
                  </div>

                  <div className="mt-5 rounded-xl bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-700">
                      Included Leads: <span className="font-semibold text-slate-900">{plan.includedLeads}/month</span>
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      Overage: <span className="font-semibold text-slate-900">{plan.overage}</span>
                    </p>
                  </div>

                  <ul className="mt-5 space-y-2">
                    {plan.points.map((point) => (
                      <li key={point} className="flex items-start gap-2 text-sm text-slate-700">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-corp-blue" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    to={plan.href}
                    className={`mt-6 inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold ${
                      plan.featured
                        ? 'bg-corp-blue text-white hover:opacity-95'
                        : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </article>
              ))}
            </div>

            <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 text-center">
              <p className="text-sm text-slate-600">
                Need custom enterprise terms?{' '}
                <Link to="/vendor/apply" className="font-semibold text-corp-blue hover:underline">
                  Talk to our partnerships team
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
        <FooterSection />
      </main>
    </>
  );
}
