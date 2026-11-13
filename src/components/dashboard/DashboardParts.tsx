'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  CalendarDaysIcon, ChatBubbleLeftRightIcon, ClockIcon, GiftIcon, KeyIcon, MegaphoneIcon, UserCircleIcon, UsersIcon,
  CheckBadgeIcon, PhoneIcon, EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { supabase } from '@/lib/supabaseClient';
import { SITE } from '@/lib/site';
import { MEMBERSHIP_BENEFITS } from '@/lib/membership-benefits';

export const card = 'rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8';

const BENEFIT_ICONS: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  keyfob: KeyIcon, vote: CheckBadgeIcon, events: CalendarDaysIcon, announcements: MegaphoneIcon, support: UsersIcon,
};

/** The signed-in user's profile name (and member IDs) from /api/profile. */
export function useProfileSummary() {
  const [s, setS] = useState<{ name: string | null; memberIds: number[] } | null>(null);
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/profile', {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
        cache: 'no-store',
      }).catch(() => null);
      const j = res?.ok ? await res.json().catch(() => null) : null;
      type H = { members: { self: boolean; member_uid: number | null }[] };
      const ids = [...new Set(((j?.households ?? []) as H[]).flatMap((h) => h.members.filter((m) => m.self && m.member_uid).map((m) => m.member_uid as number)))];
      setS({ name: j?.profile?.name ?? null, memberIds: ids });
    })();
  }, []);
  return s;
}

export function DashboardHero({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <section className="bg-gradient-to-br from-[#004d00] via-primary to-[#0b7a3b] text-white">
      <div className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6">
        <p className="text-white/80">{eyebrow}</p>
        <h1 className="font-heading text-3xl font-bold sm:text-4xl">{title}</h1>
        {children}
      </div>
    </section>
  );
}

export function BenefitsGrid({ compact = false }: { compact?: boolean }) {
  return (
    <ul className={`grid gap-4 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
      {MEMBERSHIP_BENEFITS.map((b) => {
        const Icon = BENEFIT_ICONS[b.key] ?? CheckBadgeIcon;
        return (
          <li key={b.key}
            className={`flex gap-3 rounded-2xl p-4 ${b.featured ? 'bg-gradient-to-br from-yellow-50 to-amber-100 ring-1 ring-amber-300 sm:col-span-2 lg:col-span-1' : 'bg-gray-50'}`}>
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${b.featured ? 'bg-amber-400 text-gray-900' : 'bg-green-100 text-primary'}`}>
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span>
              <span className="flex flex-wrap items-center gap-2 font-heading font-bold text-gray-900">
                {b.title}
                {b.featured && <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-gray-900">Members</span>}
              </span>
              {!compact && <span className="mt-0.5 block text-sm text-gray-600">{b.desc}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function KeyFobCard() {
  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-gradient-to-br from-yellow-50 to-amber-100 p-6 ring-1 ring-amber-300 sm:flex-row sm:items-center sm:p-8">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-gray-900">
        <KeyIcon className="h-8 w-8" aria-hidden />
      </span>
      <div className="flex-1">
        <h2 className="font-heading text-xl font-bold text-gray-900">Your masjid key fob</h2>
        <p className="mt-1 text-gray-800">
          Your membership includes a key fob for the masjid entrance. Pick it up from the ICFC office; call or email
          ahead to arrange a time.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href={SITE.phoneHref} className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white">
          <PhoneIcon className="h-4 w-4" aria-hidden /> Call office
        </a>
        <a href={`mailto:${SITE.email}?subject=${encodeURIComponent('Key fob pick-up')}`} className="inline-flex items-center gap-1.5 rounded-full border border-gray-900 px-4 py-2 text-sm font-semibold text-gray-900">
          <EnvelopeIcon className="h-4 w-4" aria-hidden /> Email
        </a>
      </div>
    </div>
  );
}

const QUICK = [
  { name: 'Prayer times', href: '/modules/prayer-times', icon: ClockIcon },
  { name: 'Events calendar', href: '/modules/community/events', icon: CalendarDaysIcon },
  { name: 'Donate', href: '/donate', icon: GiftIcon },
  { name: 'Ask the Imam', href: '/modules/services/ask-imam', icon: ChatBubbleLeftRightIcon },
  { name: 'My profile', href: '/my-profile', icon: UserCircleIcon },
];

export function QuickLinks() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {QUICK.map((q) => (
        <Link key={q.href} href={q.href} className="group flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:ring-primary/30">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-primary transition group-hover:bg-primary group-hover:text-white">
            <q.icon className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-sm font-semibold text-gray-900">{q.name}</span>
        </Link>
      ))}
    </div>
  );
}
