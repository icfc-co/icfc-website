'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

type Recurrence = 'one_time' | 'monthly';
type CheckoutResponse = {
  url?: string;
  error?: string;
};

const PRESETS = [25, 50, 100, 250, 500, 1000];

async function safeJson(res: Response): Promise<CheckoutResponse | null> {
  const text = await res.text();
  try {
    return text ? (JSON.parse(text) as CheckoutResponse) : null;
  } catch {
    return null;
  }
}

export default function FundraiserPage() {
  const [amount, setAmount] = useState<number | ''>('');
  const [recurrence, setRecurrence] = useState<Recurrence>('one_time');
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const amountCents = useMemo(
    () => (typeof amount === 'number' ? Math.round(amount * 100) : 0),
    [amount]
  );

  async function donateNow() {
    if (amountCents < 100) {
      alert('Minimum donation is $1.00.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/stripe/fundraiser-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents, recurrence, donorName, donorEmail }),
      });
      const json = await safeJson(res);

      if (res.ok && json?.url) {
        window.location.href = json.url as string;
        return;
      }

      alert(json?.error || 'Could not start checkout. Please try again.');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Network error.');
    } finally {
      setSubmitting(false);
    }
  }

  const percent = Math.min(100, Math.round((amountCents / 50000000) * 100));

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f6f1e8] text-[#13222a]">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(40% 30% at 10% 8%, rgba(201,159,58,0.30) 0%, rgba(201,159,58,0) 100%), radial-gradient(50% 40% at 90% 10%, rgba(17,94,63,0.25) 0%, rgba(17,94,63,0) 100%)',
        }}
      />

      <section className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
          <div className="rounded-3xl border border-[#d6ccb7] bg-white/80 p-7 shadow-[0_18px_45px_rgba(20,33,40,0.15)] backdrop-blur">
            <p className="font-[Montserrat] text-sm font-semibold uppercase tracking-[0.2em] text-[#8f6f24]">
              ICFC Fundraiser
            </p>
            <h1 className="mt-3 font-[Bebas_Neue] text-5xl leading-[0.95] text-[#0f3f2d] sm:text-6xl">
              Build the Masjid Expansion Together
            </h1>
            <p className="mt-4 max-w-xl font-[Montserrat] text-base leading-relaxed text-[#2d3a3f]">
              Your donation helps expand prayer space, classrooms, and community services for current and future generations.
            </p>

            <div className="mt-7 rounded-2xl border border-[#dccca9] bg-[#fff9ec] p-5">
              <div className="mb-2 flex items-center justify-between font-[Montserrat] text-sm font-medium text-[#705216]">
                <span>Campaign Momentum</span>
                <span>{percent}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[#e8deca]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#b98a2d] to-[#2b7b56] transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="mt-3 font-[Montserrat] text-xs text-[#6e6657]">
                Every contribution is recorded as a Masjid Expansion donation.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 font-[Montserrat] text-sm">
              <span className="rounded-full bg-[#173f30] px-4 py-2 font-semibold text-white">Sadaqah Jariyah</span>
              <span className="rounded-full bg-[#cfac5b] px-4 py-2 font-semibold text-[#1a2228]">Tax deductible</span>
            </div>
          </div>

          <div className="rounded-3xl border border-[#ddd3c0] bg-[#182b34] p-7 text-white shadow-[0_20px_48px_rgba(13,25,35,0.35)]">
            <h2 className="font-[Montserrat] text-2xl font-bold">Donate Now</h2>
            <p className="mt-1 font-[Montserrat] text-sm text-white/75">
              Fast card checkout powered by Stripe.
            </p>

            <div className="mt-6">
              <label className="mb-2 block font-[Montserrat] text-sm font-medium">Amount (USD)</label>
              <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {PRESETS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAmount(value)}
                    className={`rounded-xl px-3 py-2 font-[Montserrat] text-sm font-semibold transition ${
                      amount === value
                        ? 'bg-[#d9b25b] text-[#1a1f23]'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    ${value}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={1}
                step={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                placeholder="Custom amount"
                className="w-full rounded-xl border border-white/20 bg-white px-4 py-3 font-[Montserrat] text-[#111]"
              />
            </div>

            <div className="mt-5">
              <label className="mb-2 block font-[Montserrat] text-sm font-medium">Donation Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(['one_time', 'monthly'] as Recurrence[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRecurrence(r)}
                    className={`rounded-xl px-3 py-2 font-[Montserrat] text-sm font-semibold transition ${
                      recurrence === r
                        ? 'bg-[#d9b25b] text-[#1a1f23]'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {r === 'one_time' ? 'One-time' : 'Monthly'}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <input
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                placeholder="Name (optional)"
                className="rounded-xl border border-white/20 bg-white px-4 py-3 font-[Montserrat] text-[#111]"
              />
              <input
                value={donorEmail}
                onChange={(e) => setDonorEmail(e.target.value)}
                type="email"
                placeholder="Email for receipt (optional)"
                className="rounded-xl border border-white/20 bg-white px-4 py-3 font-[Montserrat] text-[#111]"
              />
            </div>

            <button
              type="button"
              onClick={donateNow}
              disabled={submitting || amountCents < 100}
              className="mt-6 w-full rounded-2xl bg-[#d9b25b] px-6 py-3 font-[Montserrat] text-base font-bold text-[#1a2228] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {submitting ? 'Processing...' : 'Donate Securely'}
            </button>

            <p className="mt-3 text-center font-[Montserrat] text-xs text-white/70">
              Need Zelle or Bank transfer? Visit the full donation page.
            </p>
            <div className="mt-3 text-center">
              <Link
                href="/donate"
                className="font-[Montserrat] text-sm font-semibold text-[#e6c780] hover:text-[#f2d899]"
              >
                Open all donation methods
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
