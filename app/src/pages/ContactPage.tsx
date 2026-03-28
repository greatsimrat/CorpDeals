import { useState } from 'react';
import type { FormEvent } from 'react';
import { Mail, MessageSquare, Building2 } from 'lucide-react';
import Navigation from '../sections/Navigation';
import FooterSection from '../sections/FooterSection';
import Seo from '../components/Seo';
import api from '../services/api';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    try {
      await api.submitContactMessage({
        name: formData.name.trim(),
        email: formData.email.trim(),
        company: formData.company.trim(),
        message: formData.message.trim(),
      });

      setIsSubmitted(true);
      setFormData({ name: '', email: '', company: '', message: '' });
    } catch (error: any) {
      setSubmitError(error?.message || 'Unable to send your message right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Seo
        title="Contact CorpDeals | Employee Perks Support and Partnership Inquiries"
        description="Contact CorpDeals for employee verification help, company requests, vendor onboarding questions, and general platform support."
        keywords="contact corpdeals, employee perks support, vendor inquiry, company request support, corpdeals help"
        path="/contact"
      />
      <Navigation />
      <main className="bg-slate-50 pt-28">
        <section className="px-6 pb-10 lg:px-12">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="pt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
                  Contact CorpDeals
                </p>
                <h1 className="mt-4 max-w-xl font-montserrat text-4xl font-bold uppercase leading-[1.02] text-slate-950 md:text-5xl">
                  Questions about employee access, vendors, or your company?
                </h1>
                <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
                  Send us a message and the CorpDeals team will get back to you by email. Use this
                  page for support, partnership questions, company requests, or general product
                  inquiries.
                </p>

                <div className="mt-8 space-y-4">
                  <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Support inbox</p>
                      <p className="mt-1 text-sm text-slate-600">hello@corpdeals.io</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Common requests</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Company additions, work-email verification help, vendor onboarding, and
                        support follow-up.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Response style</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Keep your message specific. Include the company name, the page you were on,
                        and what you were trying to do.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.28)] sm:p-8">
                {isSubmitted ? (
                  <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
                      Message sent
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                      Your message is in our queue
                    </h2>
                    <p className="mt-3 leading-7 text-slate-600">
                      We received your note and will reply by email. If this is about a missing
                      company, include your work domain so we can review it faster.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
                      Send a message
                    </p>
                    <h2 className="mt-3 text-3xl font-bold text-slate-950">Contact Us</h2>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      Use a work email if your request is about employee verification or adding a
                      company.
                    </p>

                    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <input
                          type="text"
                          placeholder="Name"
                          value={formData.name}
                          onChange={(event) =>
                            setFormData((prev) => ({ ...prev, name: event.target.value }))
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                          required
                        />
                        <input
                          type="email"
                          placeholder="Email"
                          value={formData.email}
                          onChange={(event) =>
                            setFormData((prev) => ({ ...prev, email: event.target.value }))
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                          required
                        />
                      </div>

                      <input
                        type="text"
                        placeholder="Company (optional)"
                        value={formData.company}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, company: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                      />

                      <textarea
                        placeholder="How can we help?"
                        rows={6}
                        value={formData.message}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, message: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                        required
                      />

                      {submitError ? (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                          {submitError}
                        </div>
                      ) : null}

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn-primary w-full py-4 text-sm disabled:opacity-60"
                      >
                        {isSubmitting ? 'Sending...' : 'Send Message'}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        <FooterSection />
      </main>
    </>
  );
};

export default ContactPage;
