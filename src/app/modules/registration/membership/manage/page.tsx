// app/modules/registration/membership/manage/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { UsersIcon } from '@heroicons/react/24/outline';
import {
  MembershipStatusActions, MultipleMembershipsNotice, useMemberships,
} from '@/components/membership/MembershipStatus';

const usd = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
const card = 'rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8';

export default function ManageMembershipPage() {
  const { memberships, error, reload } = useMemberships();
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('canceled')) setNotice('Renewal was not completed. You can try again anytime.');
  }, []);

  if (error?.status === 401) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-gray-700">Please log in to manage your membership.</p>
        <Link href="/login" className="mt-4 inline-flex rounded-full bg-primary px-6 py-2.5 font-semibold text-white">Log in</Link>
      </main>
    );
  }
  if (error) return <main className="mx-auto max-w-3xl px-4 py-16 text-center text-red-600">{error.message}</main>;
  if (!memberships) return <main className="mx-auto max-w-3xl px-4 py-16 text-center text-gray-500">Loading your membership…</main>;

  return (
    <main className="min-h-screen bg-gray-50 pb-16 font-body text-gray-900">
      <section className="bg-gradient-to-br from-[#004d00] via-primary to-[#0b7a3b] text-white">
        <div className="mx-auto max-w-4xl px-4 pb-20 pt-10 sm:px-6">
          <Link href="/my-profile" className="text-sm text-white/80 hover:text-white">← My Profile</Link>
          <h1 className="mt-2 font-heading text-3xl font-bold">Manage Membership</h1>
        </div>
      </section>

      <div className="mx-auto -mt-12 max-w-4xl space-y-6 px-4 sm:px-6">
        {notice && <p className="rounded-2xl bg-white p-4 text-sm font-medium text-primary shadow-sm ring-1 ring-black/5">{notice}</p>}
        <MultipleMembershipsNotice count={memberships.length} />

        {memberships.length === 0 && (
          <div className={card}>
            <p className="text-gray-700">You don&apos;t have an ICFC membership linked to this email yet.</p>
            <Link href="/modules/registration/membership" className="mt-4 inline-flex rounded-full bg-primary px-6 py-2.5 font-semibold text-white">
              Become a member
            </Link>
          </div>
        )}

        {memberships.map((m, i) => {
          const total = m.members.reduce((s, x) => s + (x.price_cents ?? 0), 0);
          return (
            <div key={m.id} id={`membership-${m.id}`} className={card}>
              <h2 className="flex items-center gap-2 font-heading text-xl font-bold">
                <UsersIcon className="h-6 w-6 text-primary" aria-hidden />
                {memberships.length > 1 ? `Membership ${i + 1}` : 'Your membership'}
                <span className="font-normal text-gray-500">· household of {m.primary_name}</span>
              </h2>

              <div className="mt-4">
                <MembershipStatusActions m={m} onChanged={(n) => { setNotice(n); reload(); }} />
              </div>

              <ul className="mt-6 divide-y divide-gray-100 border-t border-gray-100">
                {m.members.map((x) => (
                  <li key={x.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{x.name}</p>
                      <p className="text-sm capitalize text-gray-600">
                        {[x.membership_type && `${x.membership_type} member`, x.age ? `age ${x.age}` : null].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    {x.member_uid && <span className="rounded-full bg-gray-100 px-3 py-1 font-mono text-sm font-semibold">ID {x.member_uid}</span>}
                    <span className="w-16 text-right font-medium tabular-nums">{usd(x.price_cents ?? 0)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between border-t border-gray-200 pt-3 font-semibold">
                <span>Yearly total</span>
                <span className="tabular-nums">{usd(total)}</span>
              </div>
            </div>
          );
        })}

        {memberships.length > 0 && (
          <>
            <p className="px-2 text-xs text-gray-500">
              To update names, phone numbers or emails, go to <Link href="/my-profile" className="underline">My Profile</Link>.
              To change an age or membership type, please <Link href="/modules/contact" className="underline">contact ICFC</Link>.
            </p>
            <div className={card}>
              <h2 className="font-heading text-xl font-bold">Membership benefits</h2>
              <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-gray-700">
                <li>ICFC Member Portal access</li>
                <li>Discounts on community classes/events</li>
                <li>Priority notifications and seating for special programs</li>
                <li>Voting eligibility (where applicable)</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
