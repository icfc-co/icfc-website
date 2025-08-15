// ------------------------------
// File: src/app/modules/contact/page.tsx
// ------------------------------
'use client';

import { useState } from 'react';

const TITLE_FONT = 'font-[var(--font-bebas-neue)]';
const HEADING_FONT = 'font-[var(--font-montserrat)]';
const BODY_FONT = 'font-[var(--font-roboto)]';

const BRAND_GREEN = '#006400';

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload = {
      name: String(formData.get('name') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      phone: String(formData.get('phone') || '').trim(),
      reason: String(formData.get('reason') || '').trim(),
      subject: String(formData.get('subject') || '').trim(),
      message: String(formData.get('message') || '').trim(),
      subscribe: formData.get('subscribe') === 'on',
    };

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Be defensive: the server should return JSON, but if it doesn't,
      // avoid throwing a syntax error from res.json().
      const ct = res.headers.get('content-type') || '';
      let data: any = null;
      if (ct.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        data = { ok: res.ok, error: text?.slice(0, 300) };
      }

      if (!res.ok) throw new Error(data?.error || 'Submission failed');
      setStatus({ type: 'success', message: 'Thanks! Your message has been sent. We\'ll reach out soon.' });
      form.reset();
    } catch (err: any) {
      setStatus({ type: 'error', message: err?.message || 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={`${BODY_FONT} min-h-[70vh] py-10 md:py-14 px-4 md:px-6 bg-gradient-to-b from-[#f7f7f7] to-[#eef2f0]`}>
      <div className="mx-auto max-w-6xl">
        <header className="text-center mb-8">
          <h1 className={`${TITLE_FONT} text-4xl md:text-5xl`} style={{ color: BRAND_GREEN }}>Contact ICFC</h1>
          <p className="mt-2 text-gray-700 max-w-2xl mx-auto">
            Have a question, feedback, or need assistance? Send us a message and our team will get back to you.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Form */}
          <section className="lg:col-span-3">
            <div className="rounded-2xl shadow-md border border-black/5 bg-white/90 backdrop-blur p-5 md:p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`${HEADING_FONT} block text-sm text-gray-700 mb-1`}>Name *</label>
                    <input name="name" required className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#006400]/30" placeholder="Your full name" />
                  </div>
                  <div>
                    <label className={`${HEADING_FONT} block text-sm text-gray-700 mb-1`}>Email *</label>
                    <input type="email" name="email" required className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#006400]/30" placeholder="you@example.com" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`${HEADING_FONT} block text-sm text-gray-700 mb-1`}>Phone *</label>
                    <input type="tel" pattern="^\+?(\d{1,3})?[-\s]?\(?(\d{3})\)?[-\s]?(\d[-.\s]?){6,9}\d$" name="phone" required className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#006400]/30" placeholder="+1 234 567 8900" />
                  </div>
                  <div>
                    <label className={`${HEADING_FONT} block text-sm text-gray-700 mb-1`}>Reason *</label>
                    <select name="reason" required className="w-full rounded-xl border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#006400]/30">
                      <option value="">Select a reason</option>
                      <option value="general">General question</option>
                      <option value="membership">Membership</option>
                      <option value="donation">Donations / Receipts</option>
                      <option value="school">School / Classes</option>
                      <option value="volunteer">Volunteering</option>
                      <option value="event">Events / Facility</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={`${HEADING_FONT} block text-sm text-gray-700 mb-1`}>Subject *</label>
                  <input name="subject" required className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#006400]/30" placeholder="How can we help?" />
                </div>

                <div>
                  <label className={`${HEADING_FONT} block text-sm text-gray-700 mb-1`}>Message *</label>
                  <textarea name="message" required rows={6} className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#006400]/30" placeholder="Write your message here..." />
                </div>

                <div className="flex items-center gap-2">
                  <input id="subscribe" name="subscribe" type="checkbox" className="h-4 w-4 rounded border-gray-300" />
                  <label htmlFor="subscribe" className="text-sm text-gray-700">Also subscribe me to ICFC newsletters</label>
                </div>

                {status && (
                  <div className={`rounded-xl px-4 py-3 text-sm ${status.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                    {status.message}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button disabled={loading} className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-white shadow-sm" style={{ backgroundColor: BRAND_GREEN }}>
                    {loading ? 'Sending...' : 'Send Message'}
                  </button>
                  <span className="text-xs text-gray-500">* Required fields</span>
                </div>
              </form>
            </div>
          </section>

          {/* Right: Info & Map */}
          <aside className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl shadow-md border border-black/5 bg-white/90 backdrop-blur p-5 md:p-6">
              <h2 className={`${HEADING_FONT} text-xl`} style={{ color: BRAND_GREEN }}>Visit / Contact</h2>
              <div className="mt-3 text-sm text-gray-700 space-y-1">
                <p>
                  <strong>Islamic Center of Fort Collins</strong><br />
                  925 W Lake St, Fort Collins, CO 80521
                </p>
                <p>
                  <a className="underline" href="tel:+19702219201">(970) 221-9201</a><br />
                  <a className="underline" href="mailto:info@icfc.org">info@icfc.org</a>
                </p>
                <div className="flex gap-3 pt-1">
                  <a className="underline" href="https://www.instagram.com/islamic_center_of_fort_collins/?hl=en" target="_blank" rel="noreferrer">Instagram</a>
                  <a className="underline" href="https://www.facebook.com/icfcco/" target="_blank" rel="noreferrer">Facebook</a>
                  <a className="underline" href="https://www.youtube.com/@icfcco" target="_blank" rel="noreferrer">YouTube</a>
                </div>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden shadow-md border border-black/5 bg-white">
              <iframe
                title="ICFC Map"
                src="https://www.google.com/maps?q=Islamic+Center+of+Fort+Collins&output=embed"
                loading="lazy"
                className="w-full h-72 md:h-80"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <div className="p-3 bg-white border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm text-gray-700">Open in Google Maps</span>
                <a
                  className="text-sm font-medium underline"
                  href="https://maps.app.goo.gl/dKthutEgDB9v5qvg7"
                  target="_blank"
                  rel="noreferrer"
                >
                  directions
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}



/*
Env required for DB persistence:
  NEXT_PUBLIC_SUPABASE_URL=...
  SUPABASE_SERVICE_ROLE=...        # DO NOT prefix with NEXT_PUBLIC

Also ensure the package is installed:
  npm i @supabase/supabase-js

Suggested table (SQL):
  CREATE TABLE IF NOT EXISTS public.contact_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    reason text NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    subscribe boolean NOT NULL DEFAULT false,
    status text NOT NULL DEFAULT 'new',
    source text
  );

  ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
  -- Inserts are allowed because we use the service role key on the server.
*/
