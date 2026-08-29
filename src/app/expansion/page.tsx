'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

type Recurrence = 'one_time' | 'monthly';
type CheckoutResponse = {
  url?: string;
  error?: string;
};

type Tier = {
  name: string;
  blurb: string;
  oneTime: number;
  monthly: number;
};

type PlanPoint = {
  id: string;
  label: string;
  tag: string;
  desc: string;
  image: string;
  top: string;
  left: string;
};

const TIERS: Tier[] = [
  { name: 'Catalyst Donor', blurb: 'Sparks the project forward', oneTime: 2500, monthly: 200 },
  { name: 'Builder', blurb: 'Helps lay the foundation', oneTime: 5000, monthly: 400 },
  { name: 'Champion', blurb: 'Leads the way for our community', oneTime: 10000, monthly: 800 },
];

const PLAN_POINTS: PlanPoint[] = [
  {
    id: 'multipurpose',
    label: 'Multipurpose Facility',
    tag: 'Space to Grow',
    desc: 'A combined community center, gymnasium, and youth lounge for events, sports, and youth programs — built for every age and stage of our community.',
    image: '/images/expansion/ICFC-MultipurposeFacility.png',
    top: '50%',
    left: '43%',
  },
  {
    id: 'classrooms',
    label: 'Classrooms',
    tag: 'Space to Learn',
    desc: 'New dedicated classrooms for Sunday school, Islamic studies, and community education programs — giving our teachers and students room to grow.',
    image: '/images/expansion/ICFC-Classrooms.png',
    top: '72%',
    left: '57%',
  },
  {
    id: 'cafe',
    label: 'Café',
    tag: 'Space to Connect',
    desc: 'A welcoming café and lounge space for the community to gather, connect, and unwind before and after prayers and events.',
    image: '/images/expansion/ICFC-Cafe.png',
    top: '52%',
    left: '28%',
  },
];

async function safeJson(res: Response): Promise<CheckoutResponse | null> {
  const text = await res.text();
  try {
    return text ? (JSON.parse(text) as CheckoutResponse) : null;
  } catch {
    return null;
  }
}

export default function ExpansionPage() {
  const [amount, setAmount] = useState<number | ''>('');
  const [recurrence, setRecurrence] = useState<Recurrence>('one_time');
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activePoint, setActivePoint] = useState<string>(PLAN_POINTS[0].id);

  const amountCents = useMemo(
    () => (typeof amount === 'number' ? Math.round(amount * 100) : 0),
    [amount]
  );

  const activePlanPoint = PLAN_POINTS.find((p) => p.id === activePoint) ?? PLAN_POINTS[0];

  function pickTier(tier: Tier) {
    setSelectedTier(tier.name);
    setAmount(recurrence === 'monthly' ? tier.monthly : tier.oneTime);
  }

  function switchRecurrence(next: Recurrence) {
    setRecurrence(next);
    const tier = TIERS.find((t) => t.name === selectedTier);
    if (tier) setAmount(next === 'monthly' ? tier.monthly : tier.oneTime);
  }

  function useCustomAmount(value: number | '') {
    setSelectedTier(null);
    setAmount(value);
  }

  async function donateNow() {
    if (amountCents < 100) {
      alert('Minimum donation is $1.00.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/stripe/expansion-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCents,
          recurrence,
          donorName,
          donorEmail,
          tierName: selectedTier ?? '',
        }),
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

  return (
    <main className="relative min-h-screen bg-[#f6f1e8] text-[#13222a]">
      {/* HERO — full-bleed photo background */}
      <section className="relative flex min-h-[560px] w-full items-center overflow-hidden sm:min-h-[640px]">
        <img
          src="/images/WelcomeICFC.JPG"
          alt="ICFC community"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(10,20,25,0.65) 0%, rgba(10,20,25,0.72) 45%, rgba(10,20,25,0.92) 100%)',
          }}
        />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <p className="font-[Montserrat] text-sm font-semibold uppercase tracking-[0.25em] text-[#e6c780]">
            ICFC Expansion Campaign
          </p>
          <h1 className="mt-4 max-w-3xl font-[Bebas_Neue] text-5xl leading-[0.95] text-white sm:text-7xl">
            Build the Masjid Expansion Together
          </h1>
          <p className="mt-5 max-w-2xl font-[Montserrat] text-base leading-relaxed text-white/85 sm:text-lg">
            Your donation helps expand prayer space, classrooms, and community services for current and future
            generations — a Sadaqah Jariyah that keeps giving long after it&apos;s given.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="#donate"
              className="rounded-2xl bg-[#d9b25b] px-7 py-3 font-[Montserrat] text-base font-bold text-[#1a2228] transition hover:brightness-95"
            >
              Donate Now
            </a>
            <a
              href="#plan"
              className="rounded-2xl border border-white/40 bg-white/10 px-7 py-3 font-[Montserrat] text-base font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              Explore the Plan
            </a>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 font-[Montserrat] text-sm">
            <span className="rounded-full bg-[#173f30] px-4 py-2 font-semibold text-white">Sadaqah Jariyah</span>
            <span className="rounded-full bg-[#cfac5b] px-4 py-2 font-semibold text-[#1a2228]">Tax deductible</span>
            <span className="rounded-full border border-white/30 px-4 py-2 font-semibold text-white">
              100% Community Funded
            </span>
          </div>
        </div>
      </section>

      {/* WHY WE'RE EXPANDING — narrative + image */}
      <section className="w-full bg-[#FFFFFF] py-14 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8">
          <div>
            <p className="font-[Montserrat] text-sm font-semibold uppercase tracking-[0.2em] text-[#8f6f24]">
              Why We&apos;re Expanding
            </p>
            <h2 className="mt-3 font-[Bebas_Neue] text-4xl leading-[0.95] text-[#0f3f2d] sm:text-5xl">
              Our Community Has Outgrown Our Walls
            </h2>
            <p className="mt-5 font-[Montserrat] text-base leading-relaxed text-[#2d3a3f]">
              ICFC has grown into a home for hundreds of families — for daily prayers, weekend school, youth
              programs, and community gatherings. That growth is a blessing, but it also means our current space is
              stretched thin: classrooms are shared and oversubscribed, there is nowhere for families to sit
              together after prayer, and our youth have no dedicated space to call their own.
            </p>
            <p className="mt-4 font-[Montserrat] text-base leading-relaxed text-[#2d3a3f]">
              This expansion adds new classrooms, a community café, and a multipurpose facility with a gymnasium
              and youth lounge — built so every generation of our community has the room to learn, connect, and
              grow together, insha&apos;Allah.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {PLAN_POINTS.map((p) => (
                <span
                  key={p.id}
                  className="rounded-full bg-[#e8deca] px-4 py-2 font-[Montserrat] text-sm font-semibold text-[#2d3a3f]"
                >
                  {p.label}
                </span>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl border border-[#d6ccb7] shadow-[0_18px_45px_rgba(20,33,40,0.15)]">
            <img
              src="/images/expansion/ICFC-MultipurposeFacility.png"
              alt="ICFC multipurpose facility rendering"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* PLAN + DONATE — full-width dark band, contained content */}
      <section id="plan" className="w-full bg-[#f6f1e8] py-14 sm:py-20">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-10">
          <div className="mb-10 max-w-2xl">
            <p className="font-[Montserrat] text-sm font-semibold uppercase tracking-[0.2em] text-[#8f6f24]">
              The Plan
            </p>
            <h2 className="mt-3 font-[Bebas_Neue] text-4xl leading-[0.95] text-[#0f3f2d] sm:text-5xl">
              Our Expansion Plan
            </h2>
            <p className="mt-4 font-[Montserrat] text-base leading-relaxed text-[#2d3a3f]">
              Explore what&apos;s coming. Hover (or tap) a marker on the site plan below to see each new space up
              close.
            </p>
          </div>

          <div className="grid gap-10 lg:grid-cols-[2.6fr_1fr] lg:items-start">
            {/* Donation panel: first in DOM for mobile visibility, sidebar on desktop */}
            <aside id="donate" className="order-1 scroll-mt-24 lg:order-2 lg:sticky lg:top-8">
              <div className="rounded-3xl border border-[#ddd3c0] bg-[#182b34] p-6 text-white shadow-[0_20px_48px_rgba(13,25,35,0.35)] sm:p-7">
                <h2 className="font-[Montserrat] text-2xl font-bold">Donate Now</h2>
                <p className="mt-1 font-[Montserrat] text-sm text-white/75">
                  Choose a giving tier or enter your own amount.
                </p>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  {(['one_time', 'monthly'] as Recurrence[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => switchRecurrence(r)}
                      className={`rounded-xl px-3 py-2 font-[Montserrat] text-sm font-semibold transition ${
                        recurrence === r
                          ? 'bg-[#d9b25b] text-[#1a1f23]'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {r === 'one_time' ? 'One-time' : 'Monthly (12 mo)'}
                    </button>
                  ))}
                </div>

                <div className="mt-5 space-y-3">
                  {TIERS.map((tier) => {
                    const tierAmount = recurrence === 'monthly' ? tier.monthly : tier.oneTime;
                    const active = selectedTier === tier.name;
                    return (
                      <button
                        key={tier.name}
                        type="button"
                        onClick={() => pickTier(tier)}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                          active
                            ? 'border-[#d9b25b] bg-[#d9b25b]/15'
                            : 'border-white/15 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between font-[Montserrat]">
                          <span className="font-semibold">{tier.name}</span>
                          <span className="font-bold text-[#e6c780]">
                            ${tierAmount.toLocaleString()}
                            {recurrence === 'monthly' ? '/mo' : ''}
                          </span>
                        </div>
                        <p className="mt-1 font-[Montserrat] text-xs text-white/65">{tier.blurb}</p>
                      </button>
                    );
                  })}
                </div>

                {recurrence === 'monthly' && (
                  <p className="mt-3 font-[Montserrat] text-xs text-white/60">
                    Recurring gifts run for 12 monthly payments, then automatically end.
                  </p>
                )}

                <div className="mt-5">
                  <label className="mb-2 block font-[Montserrat] text-sm font-medium">
                    Or enter a custom amount (USD)
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={amount}
                    onChange={(e) => useCustomAmount(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Custom amount"
                    className="w-full rounded-xl border border-white/20 bg-white px-4 py-3 font-[Montserrat] text-[#111]"
                  />
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
            </aside>

            {/* Expansion plan section */}
            <div className="order-2 lg:order-1">
              <div className="rounded-3xl border border-white/10 bg-white/95 p-6 shadow-[0_18px_45px_rgba(20,33,40,0.25)] backdrop-blur sm:p-8 lg:p-10">
                <div className="relative overflow-hidden rounded-2xl border border-[#d6ccb7] bg-[#0f1c22]">
                  <img
                    src="/images/expansion/ICFC-floorplan.jpeg"
                    alt="ICFC expansion site plan"
                    className="block h-[380px] w-full object-cover sm:h-[520px] lg:h-[720px]"
                  />
                  {PLAN_POINTS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onMouseEnter={() => setActivePoint(p.id)}
                      onFocus={() => setActivePoint(p.id)}
                      onClick={() => setActivePoint(p.id)}
                      style={{ top: p.top, left: p.left }}
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      aria-label={p.label}
                    >
                      <span
                        className={`absolute inset-0 -m-1.5 rounded-full bg-[#d9b25b] transition ${
                          activePoint === p.id ? 'animate-ping opacity-60' : 'opacity-0'
                        }`}
                      />
                      <span
                        className={`relative block h-4 w-4 rounded-full ring-2 ring-white shadow-lg transition sm:h-5 sm:w-5 ${
                          activePoint === p.id ? 'bg-[#d9b25b] scale-110' : 'bg-[#173f30]'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {PLAN_POINTS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onMouseEnter={() => setActivePoint(p.id)}
                      onClick={() => setActivePoint(p.id)}
                      className={`rounded-full px-4 py-2 font-[Montserrat] text-sm font-semibold transition ${
                        activePoint === p.id
                          ? 'bg-[#173f30] text-white'
                          : 'bg-[#e8deca] text-[#2d3a3f] hover:bg-[#dccca9]'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-[#dccca9] bg-[#fff9ec] p-4 sm:flex-row sm:items-center">
                  <img
                    src={activePlanPoint.image}
                    alt={activePlanPoint.label}
                    className="h-48 w-full rounded-xl object-cover sm:h-32 sm:w-48"
                  />
                  <div>
                    <p className="font-[Montserrat] text-xs font-semibold uppercase tracking-wide text-[#8f6f24]">
                      {activePlanPoint.tag}
                    </p>
                    <h3 className="font-[Montserrat] text-lg font-bold text-[#0f3f2d]">
                      {activePlanPoint.label}
                    </h3>
                    <p className="mt-1 font-[Montserrat] text-sm text-[#2d3a3f]">{activePlanPoint.desc}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* QUOTE — full-width band */}
      <section className="w-full bg-[#173f30] py-14 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <span className="font-[Bebas_Neue] text-6xl leading-none text-[#e6c780]">&ldquo;</span>
          <p className="mt-2 font-[Montserrat] text-xl italic leading-relaxed text-white sm:text-2xl">
            This expansion is not just about walls and space — it&apos;s about the growth of our community, our
            children&apos;s education, and our collective journey to Jannah. Every contribution is a Sadaqah
            Jariyah that will benefit generations to come.
          </p>
          <p className="mt-6 font-[Montserrat] text-sm font-semibold uppercase tracking-[0.2em] text-[#e6c780]">
            ICFC Board of Directors
          </p>
        </div>
      </section>

      {/* FINAL CTA — full-width */}
      <section className="w-full bg-[#0f3f2d] py-14 sm:py-20">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-[Bebas_Neue] text-4xl leading-[0.95] text-white sm:text-5xl">
            Let&apos;s Build Our Future Together
          </h2>
          <p className="max-w-xl font-[Montserrat] text-base text-white/80">
            Every gift, big or small, brings us closer to breaking ground. Join us in building a home for
            generations to come.
          </p>
          <a
            href="#donate"
            className="rounded-2xl bg-[#d9b25b] px-8 py-3 font-[Montserrat] text-base font-bold text-[#1a2228] transition hover:brightness-95"
          >
            Donate Today
          </a>
        </div>
      </section>

      {/* Floating quick-access donate button for mobile */}
      <a
        href="#donate"
        className="fixed bottom-5 right-5 z-40 rounded-full bg-[#d9b25b] px-5 py-3 font-[Montserrat] text-sm font-bold text-[#1a2228] shadow-[0_10px_25px_rgba(20,33,40,0.35)] transition hover:brightness-95 lg:hidden"
      >
        Donate Now
      </a>
    </main>
  );
}
