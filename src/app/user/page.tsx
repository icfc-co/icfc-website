'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRightIcon, EnvelopeIcon, InformationCircleIcon, KeyIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { SITE } from '@/lib/site';
import { BenefitsGrid, DashboardHero, QuickLinks, card, useProfileSummary } from '@/components/dashboard/DashboardParts';

// Set to false while membership registration is closed: the dashboard then shows a
// "registration is closed" notice with office contacts instead of the sign-up button.
const REGISTRATION_OPEN = true;

type Prices = Record<string, { amount_cents: number; max_age: number | null }>;
const usd = (c?: number) => (c == null ? '' : c === 0 ? 'free' : `${(c / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}`);

// "Regular $50 · Student $25 · Senior $25 · Youth (under 18) free", from the live prices
function PriceLine() {
  const [p, setP] = useState<Prices | null>(null);
  useEffect(() => {
    fetch('/api/membership/pricing', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((j) => setP(j?.prices ?? null)).catch(() => {});
  }, []);
  if (!p) return null;
  const parts = [
    p.regular && `Regular ${usd(p.regular.amount_cents)}`,
    p.student && `Student ${usd(p.student.amount_cents)}`,
    p.senior && `Senior ${usd(p.senior.amount_cents)}`,
    p.youth && `Youth${p.youth.max_age != null ? ` (under ${p.youth.max_age + 1})` : ''} ${usd(p.youth.amount_cents)}`,
  ].filter(Boolean);
  return <p className="text-sm text-gray-600">Per person, per year: {parts.join(' · ')}</p>;
}

export default function UserDashboard() {
  const me = useProfileSummary();
  const first = me?.name?.split(' ')[0];

  return (
    <main className="min-h-screen bg-gray-50 pb-16 font-body text-gray-900">
      <DashboardHero eyebrow="My dashboard" title={first ? `Assalamu alaikum, ${first}` : 'Assalamu alaikum'}>
        <p className="mt-3 max-w-2xl text-white/85">Welcome to the Islamic Center of Fort Collins. Here’s what ICFC membership brings you.</p>
      </DashboardHero>

      <div className="mx-auto -mt-12 max-w-5xl space-y-6 px-4 sm:px-6">
        <div className={card}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">ICFC membership</p>
              <h2 className="mt-1 font-heading text-2xl font-bold sm:text-3xl">Become part of your masjid</h2>
              <p className="mt-2 max-w-2xl text-gray-700">
                Members sustain the masjid and help shape its future, and get a few things that make the masjid feel like home.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-2xl bg-amber-400 px-4 py-2 font-heading text-sm font-bold text-gray-900 shadow-sm">
              <KeyIcon className="h-5 w-5" aria-hidden /> Includes a masjid key fob
            </span>
          </div>

          <div className="mt-6"><BenefitsGrid /></div>

          {REGISTRATION_OPEN ? (
            <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-green-50 p-5 ring-1 ring-green-200 sm:flex-row sm:items-center">
              <div className="flex-1">
                <p className="font-heading text-lg font-bold text-gray-900">Membership registration is open</p>
                <PriceLine />
              </div>
              <Link href="/modules/registration/membership"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-white shadow-sm hover:bg-green-800">
                Become a member <ArrowRightIcon className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-5 sm:flex-row sm:items-center">
              <InformationCircleIcon className="h-8 w-8 shrink-0 text-primary" aria-hidden />
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Membership registration is currently closed.</p>
                <p className="text-sm text-gray-600">
                  It will reopen soon, in shā’ Allāh. We’ll announce it on the website. For questions, contact the office.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={SITE.phoneHref} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">
                  <PhoneIcon className="h-4 w-4" aria-hidden /> {SITE.phone}
                </a>
                <a href={`mailto:${SITE.email}?subject=${encodeURIComponent('ICFC membership')}`} className="inline-flex items-center gap-1.5 rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary">
                  <EnvelopeIcon className="h-4 w-4" aria-hidden /> {SITE.email}
                </a>
              </div>
            </div>
          )}
        </div>

        <section>
          <h2 className="mb-3 font-heading text-lg font-bold">Quick links</h2>
          <QuickLinks />
        </section>
      </div>
    </main>
  );
}
