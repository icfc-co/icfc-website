'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowTopRightOnSquareIcon, Bars3Icon, BanknotesIcon, CalendarDaysIcon, ChatBubbleLeftRightIcon, CheckCircleIcon,
  ExclamationCircleIcon, HandRaisedIcon, HeartIcon, IdentificationIcon, MegaphoneIcon, MoonIcon, PhotoIcon,
  ShieldCheckIcon, UserCircleIcon, UsersIcon,
} from '@heroicons/react/24/outline';
import { GROUPS, CountKey, StaffRole, Tool, toolsFor } from '@/lib/dashboard-tools';

type Data = {
  name: string | null;
  email: string | null;
  role: StaffRole;
  counts: Partial<Record<CountKey, number | null>>;
  figures: {
    active_households: number | null;
    active_people: number | null;
    expiring_30: number | null;
    upcoming_events: number | null;
    donations_month_cents: number | null;
    live_announcements: number | null;
  } | null;
};

const ICONS: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  messages: ChatBubbleLeftRightIcon, nikah: HeartIcon, social: HandRaisedIcon, support: UsersIcon, ramadan: MoonIcon,
  announcements: MegaphoneIcon, events: CalendarDaysIcon, photos: PhotoIcon, members: IdentificationIcon,
  donations: BanknotesIcon, roles: ShieldCheckIcon, submenus: Bars3Icon,
};

const ROLE_LABEL: Record<StaffRole, string> = { super_admin: 'Super admin', admin: 'Admin', volunteer: 'Volunteer' };

const usd0 = (cents: number) => (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function greeting() {
  const h = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/Denver' }).format(new Date()));
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function ToolCard({ t, role, n }: { t: Tool; role: StaffRole; n: number | null | undefined }) {
  const Icon = ICONS[t.key] ?? Bars3Icon;
  return (
    <Link href={t.href(role)} prefetch={false}
      className="group relative flex items-start gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-primary/30">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-primary transition group-hover:bg-primary group-hover:text-white">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-heading font-bold text-gray-900">{t.title}</span>
        <span className="mt-0.5 block text-sm text-gray-600">{t.desc}</span>
      </span>
      {!!n && (
        <span className="absolute right-3 top-3 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white" title={`${n} ${t.countLabel ?? ''}`}>
          {n > 99 ? '99+' : n}
        </span>
      )}
    </Link>
  );
}

/** Dashboard for super admins, admins and volunteers. `variant` picks the tool set for the page being viewed. */
export default function StaffDashboard({ variant }: { variant: StaffRole }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/staff/dashboard', { cache: 'no-store' })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || `Request failed (${r.status})`);
        setData(j);
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  const tools = toolsFor(variant);
  const counts = data?.counts ?? {};
  const attention = tools.filter((t) => t.count && (counts[t.count] ?? 0) > 0);
  const f = data?.figures;
  const first = data?.name?.split(' ')[0];

  return (
    <main className="min-h-screen bg-gray-50 pb-16 font-body text-gray-900">
      <section className="bg-gradient-to-br from-[#004d00] via-primary to-[#0b7a3b] text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-4 pb-20 pt-10 sm:px-6">
          <div>
            <p className="text-white/80">{greeting()}{first ? ',' : ''}</p>
            <h1 className="font-heading text-3xl font-bold sm:text-4xl">{first ? `Assalamu alaikum, ${first}` : 'Assalamu alaikum'}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-white/15 px-3 py-0.5">{ROLE_LABEL[variant]} dashboard</span>
              <span className="text-white/75">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Denver' })}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/my-profile" className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/25">
              <UserCircleIcon className="h-5 w-5" aria-hidden /> My profile
            </Link>
            <Link href="/" className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-gray-900 hover:opacity-90">
              View website <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto -mt-12 max-w-6xl space-y-8 px-4 sm:px-6">
        {/* Needs attention */}
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h2 className="flex items-center gap-2 font-heading text-lg font-bold">
            <ExclamationCircleIcon className="h-6 w-6 text-primary" aria-hidden /> Needs attention
          </h2>
          {error ? (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          ) : !data ? (
            <p className="mt-3 text-sm text-gray-500">Loading…</p>
          ) : attention.length === 0 ? (
            <p className="mt-3 flex items-center gap-2 text-gray-700"><CheckCircleIcon className="h-5 w-5 text-primary" aria-hidden /> All caught up. Nothing is waiting for you.</p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {attention.map((t) => (
                <Link key={t.key} href={t.href(variant)} prefetch={false} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 transition hover:border-amber-400">
                  <span className="block font-heading text-3xl font-bold text-amber-900">{counts[t.count!]}</span>
                  <span className="mt-1 block text-sm font-medium text-amber-900">{t.title}</span>
                  <span className="block text-xs text-amber-800/80">{t.countLabel}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Key figures (admins) */}
        {f && variant !== 'volunteer' && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: 'Active memberships', value: f.active_households, sub: f.active_people != null ? `${f.active_people} people` : null, href: '/admin/members' },
              { label: 'Expiring in 30 days', value: f.expiring_30, sub: 'one-time memberships', href: '/admin/members' },
              { label: 'Donations this month', value: f.donations_month_cents != null ? usd0(f.donations_month_cents) : null, sub: 'completed', href: '/admin/donations' },
              { label: 'Events next 30 days', value: f.upcoming_events, sub: f.live_announcements ? `${f.live_announcements} live announcement${f.live_announcements === 1 ? '' : 's'}` : null, href: '/admin/events' },
            ].map((k) => (
              <Link key={k.label} href={k.href} prefetch={false} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 transition hover:ring-primary/30">
                <span className="block text-sm text-gray-500">{k.label}</span>
                <span className="mt-1 block font-heading text-2xl font-bold text-gray-900">{k.value ?? '—'}</span>
                {k.sub && <span className="block text-xs text-gray-500">{k.sub}</span>}
              </Link>
            ))}
          </div>
        )}

        {/* Tools */}
        {GROUPS.map((g) => {
          const list = tools.filter((t) => t.group === g.key);
          if (!list.length) return null;
          return (
            <section key={g.key}>
              <h2 className="mb-3 font-heading text-lg font-bold text-gray-900">{g.title}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((t) => <ToolCard key={t.key} t={t} role={variant} n={t.count ? counts[t.count] : null} />)}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
