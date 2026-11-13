'use client';

import Link from 'next/link';
import { IdentificationIcon, UsersIcon } from '@heroicons/react/24/outline';
import AnnouncementCards from '@/components/announcements/AnnouncementCards';
import { fmtLongDate, statusBadge, useMemberships } from '@/components/membership/MembershipStatus';
import {
  BenefitsGrid, DashboardHero, KeyFobCard, QuickLinks, card, useProfileSummary,
} from '@/components/dashboard/DashboardParts';

function MembershipCard() {
  const { memberships, error } = useMemberships();
  const current = memberships?.filter((m) => !m.expired) ?? [];
  const m = current[0] ?? memberships?.[0];

  return (
    <div className={card}>
      <h2 className="flex items-center gap-2 font-heading text-xl font-bold">
        <IdentificationIcon className="h-6 w-6 text-primary" aria-hidden /> My membership
      </h2>
      {error ? (
        <p className="mt-3 text-sm text-red-600">{error.message}</p>
      ) : !memberships ? (
        <p className="mt-3 text-sm text-gray-500">Loading…</p>
      ) : !m ? (
        <p className="mt-3 text-gray-700">We couldn’t find a membership linked to your email. Please contact the office if this looks wrong.</p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusBadge(m).cls}`}>{statusBadge(m).text}</span>
            {current.length > 1 && <span className="text-sm text-gray-600">+{current.length - 1} more membership{current.length > 2 ? 's' : ''}</span>}
          </div>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-gray-500">Household</dt>
              <dd className="font-medium text-gray-900">{m.primary_name || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">{m.autoRenew ? 'Renews on' : m.expired ? 'Ended' : 'Active until'}</dt>
              <dd className="font-medium text-gray-900">{fmtLongDate(m.endsOn)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Members</dt>
              <dd className="font-medium text-gray-900">{m.members.length}</dd>
            </div>
          </dl>
        </>
      )}
      <Link href="/modules/registration/membership/manage"
        className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-800">
        Manage membership
      </Link>
    </div>
  );
}

export default function MemberDashboard() {
  const me = useProfileSummary();
  const first = me?.name?.split(' ')[0];

  return (
    <main className="min-h-screen bg-gray-50 pb-16 font-body text-gray-900">
      <DashboardHero eyebrow="Member dashboard" title={first ? `Assalamu alaikum, ${first}` : 'Assalamu alaikum'}>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-white/15 px-3 py-0.5">ICFC member</span>
          {me?.memberIds.map((id) => (
            <span key={id} className="rounded-full bg-secondary px-3 py-0.5 font-semibold text-gray-900">Member ID {id}</span>
          ))}
        </div>
      </DashboardHero>

      <div className="mx-auto -mt-12 max-w-5xl space-y-6 px-4 sm:px-6">
        <MembershipCard />
        <AnnouncementCards scope="members" title="Member announcements" className={card} />
        <KeyFobCard />

        <div className={card}>
          <h2 className="flex items-center gap-2 font-heading text-xl font-bold">
            <UsersIcon className="h-6 w-6 text-primary" aria-hidden /> Community Support Network
          </h2>
          <p className="mt-2 text-gray-700">
            Need a ride, groceries, a meal, laundry or help around the house? Ask the community. Want to help? See what
            other members need.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/member/support-network/new" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-800">
              Request help
            </Link>
            <Link href="/member/support-network" className="rounded-full border border-primary px-5 py-2.5 text-sm font-semibold text-primary hover:bg-green-50">
              View requests &amp; help others
            </Link>
          </div>
        </div>

        <section>
          <h2 className="mb-3 font-heading text-lg font-bold">Quick links</h2>
          <QuickLinks />
        </section>

        <div className={card}>
          <h2 className="font-heading text-xl font-bold">Your member benefits</h2>
          <div className="mt-4"><BenefitsGrid compact /></div>
        </div>
      </div>
    </main>
  );
}
