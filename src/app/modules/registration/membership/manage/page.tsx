// app/modules/registration/membership/manage/page.tsx
'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowPathIcon, CheckBadgeIcon, ExclamationTriangleIcon, UsersIcon } from '@heroicons/react/24/outline';
import { supabase } from '@/lib/supabaseClient';

type Membership = {
  primary_name: string | null;
  primary_email: string | null;
  primary_phone: string | null;
  start_date: string | null;
  endsOn: string | null;
  daysLeft: number | null;
  isPrimary: boolean;
  autoRenew: boolean;
  cancelScheduled: boolean;
  expired: boolean;
  revoked: boolean;
  canRenew: boolean;
  canCancel: boolean;
  canResume: boolean;
  renewWindowDays: number;
};

type Member = {
  id: string;
  name: string | null;
  age: number | null;
  membership_type: string | null;
  designation: string | null;
  price_cents: number | null;
  member_uid: number | null;
};

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json?.error || `Request failed (${res.status})`), { status: res.status });
  return json as T;
}

const fmtDate = (d: string | null) =>
  d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—';
const usd = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
const card = 'rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8';

export default function ManageMembershipPage() {
  const [data, setData] = useState<{ membership: Membership | null; members: Member[] } | null>(null);
  const [error, setError] = useState('');
  const [signedOut, setSignedOut] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      setData(await api('/api/membership/manage'));
      setError('');
    } catch (e) {
      if ((e as { status?: number }).status === 401) setSignedOut(true);
      else setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
    if (new URLSearchParams(window.location.search).get('canceled')) setNotice('Renewal was not completed. You can try again anytime.');
  }, [load]);

  const renew = async () => {
    setBusy(true);
    try {
      const { url } = await api<{ url: string }>('/api/membership/renew', { method: 'POST' });
      window.location.href = url;
    } catch (e) {
      alert((e as Error).message);
      setBusy(false);
    }
  };

  const changeRenewal = async (action: 'cancel' | 'resume', m: Membership) => {
    const text =
      action === 'resume'
        ? 'Keep your membership renewing automatically each year?'
        : m.autoRenew
          ? `Cancel automatic renewal? Your membership stays active until ${fmtDate(m.endsOn)} and you won't be charged again.`
          : 'End your membership today? This cannot be undone.';
    if (!window.confirm(text)) return;
    setBusy(true);
    try {
      await api('/api/membership/revoke', { method: 'POST', body: JSON.stringify({ action }) });
      setNotice(action === 'resume' ? 'Automatic renewal is back on.' : m.autoRenew ? `Automatic renewal cancelled. Your membership stays active until ${fmtDate(m.endsOn)}.` : 'Your membership has ended.');
      await load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (signedOut) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-gray-700">Please log in to manage your membership.</p>
        <Link href="/login?next=/modules/registration/membership/manage" className="mt-4 inline-flex rounded-full bg-primary px-6 py-2.5 font-semibold text-white">
          Log in
        </Link>
      </main>
    );
  }
  if (error) return <main className="mx-auto max-w-3xl px-4 py-16 text-center text-red-600">{error}</main>;
  if (!data) return <main className="mx-auto max-w-3xl px-4 py-16 text-center text-gray-500">Loading your membership…</main>;

  const m = data.membership;
  const total = data.members.reduce((s, x) => s + (x.price_cents ?? 0), 0);

  // Status badge
  const status = !m
    ? null
    : m.expired
      ? { text: m.revoked ? 'Ended' : 'Expired', cls: 'bg-red-100 text-red-800' }
      : m.cancelScheduled
        ? { text: `Ends ${fmtDate(m.endsOn)}`, cls: 'bg-yellow-100 text-yellow-900' }
        : m.autoRenew
          ? { text: 'Active · renews automatically', cls: 'bg-green-100 text-green-800' }
          : m.daysLeft != null && m.daysLeft <= m.renewWindowDays
            ? { text: `Expires in ${m.daysLeft} day${m.daysLeft === 1 ? '' : 's'}`, cls: 'bg-yellow-100 text-yellow-900' }
            : { text: 'Active', cls: 'bg-green-100 text-green-800' };

  return (
    <main className="min-h-screen bg-gray-50 pb-16 font-body text-gray-900">
      <section className="bg-gradient-to-br from-[#004d00] via-primary to-[#0b7a3b] text-white">
        <div className="mx-auto max-w-4xl px-4 pb-20 pt-10 sm:px-6">
          <Link href="/my-profile" className="text-sm text-white/80 hover:text-white">← My Profile</Link>
          <h1 className="mt-2 font-heading text-3xl font-bold">Manage Membership</h1>
          {m && <p className="mt-1 text-white/85">Household of {m.primary_name}</p>}
        </div>
      </section>

      <div className="mx-auto -mt-12 max-w-4xl space-y-6 px-4 sm:px-6">
        {notice && <p className="rounded-2xl bg-white p-4 text-sm font-medium text-primary shadow-sm ring-1 ring-black/5">{notice}</p>}

        {!m ? (
          <div className={card}>
            <p className="text-gray-700">You don&apos;t have an ICFC membership linked to this email yet.</p>
            <Link href="/modules/registration/membership" className="mt-4 inline-flex rounded-full bg-primary px-6 py-2.5 font-semibold text-white">
              Become a member
            </Link>
          </div>
        ) : (
          <>
            {/* Status + actions */}
            <div className={card}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${status!.cls}`}>{status!.text}</span>
                  <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                    <div><dt className="text-gray-500">Started</dt><dd className="font-medium">{fmtDate(m.start_date)}</dd></div>
                    <div>
                      <dt className="text-gray-500">{m.autoRenew ? 'Next renewal' : m.expired ? 'Ended' : 'Valid until'}</dt>
                      <dd className="font-medium">{fmtDate(m.endsOn)}</dd>
                    </div>
                    <div><dt className="text-gray-500">Primary contact</dt><dd className="font-medium">{m.primary_email}</dd></div>
                    {m.primary_phone && <div><dt className="text-gray-500">Phone</dt><dd className="font-medium">{m.primary_phone}</dd></div>}
                  </dl>
                </div>
                {m.autoRenew ? (
                  <CheckBadgeIcon className="h-12 w-12 text-primary" aria-hidden />
                ) : m.expired || m.cancelScheduled ? (
                  <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500" aria-hidden />
                ) : null}
              </div>

              {/* What happens next */}
              <div className="mt-6 rounded-2xl bg-gray-50 p-4 text-sm text-gray-700">
                {m.autoRenew && <>Your membership renews automatically on <strong>{fmtDate(m.endsOn)}</strong>. Nothing else to do.</>}
                {m.cancelScheduled && <>Automatic renewal is cancelled. Your membership stays active until <strong>{fmtDate(m.endsOn)}</strong>, and you won&apos;t be charged again.</>}
                {!m.autoRenew && !m.cancelScheduled && m.canRenew && (
                  <>{m.expired ? 'Your membership has ended.' : 'Your membership ends soon.'} Renew now to stay a member. The new membership year starts on the day you renew and renews automatically each year.</>
                )}
                {!m.autoRenew && !m.cancelScheduled && !m.canRenew && !m.expired && (
                  <>Renewal opens {m.renewWindowDays} days before your membership ends.</>
                )}
                {!m.isPrimary && <> Only the primary contact can renew or cancel the household&apos;s membership.</>}
              </div>

              {m.isPrimary && (m.canRenew || m.canResume || m.canCancel) && (
                <div className="mt-5 flex flex-wrap gap-3">
                  {m.canRenew && (
                    <button onClick={renew} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 font-semibold text-white shadow-sm hover:bg-green-800 disabled:opacity-60">
                      <ArrowPathIcon className="h-5 w-5" aria-hidden /> Renew membership
                    </button>
                  )}
                  {m.canResume && (
                    <button onClick={() => changeRenewal('resume', m)} disabled={busy} className="rounded-full bg-primary px-6 py-2.5 font-semibold text-white disabled:opacity-60">
                      Keep renewing automatically
                    </button>
                  )}
                  {m.canCancel && (
                    <button onClick={() => changeRenewal('cancel', m)} disabled={busy} className="rounded-full border border-red-300 px-6 py-2.5 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">
                      {m.autoRenew ? 'Cancel automatic renewal' : 'End membership'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Members */}
            <div className={card}>
              <h2 className="flex items-center gap-2 font-heading text-xl font-bold">
                <UsersIcon className="h-6 w-6 text-primary" aria-hidden /> Members
              </h2>
              <ul className="mt-4 divide-y divide-gray-100">
                {data.members.map((x) => (
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
              <div className="mt-2 flex justify-between border-t border-gray-200 pt-3 font-semibold">
                <span>Yearly total</span>
                <span className="tabular-nums">{usd(total)}</span>
              </div>
              <p className="mt-4 text-xs text-gray-500">
                To update names, phone numbers or emails, go to <Link href="/my-profile" className="underline">My Profile</Link>.
                To change an age or membership type, please <Link href="/modules/contact" className="underline">contact ICFC</Link>.
              </p>
            </div>

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
