'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { supabase } from '@/lib/supabaseClient';

export type ManagedMember = {
  id: string;
  name: string | null;
  age: number | null;
  membership_type: string | null;
  designation: string | null;
  price_cents: number | null;
  member_uid: number | null;
};

export type ManagedMembership = {
  id: string;
  primary_name: string | null;
  primary_email: string | null;
  primary_phone: string | null;
  start_date: string | null;
  endsOn: string | null;
  daysLeft: number | null;
  isPrimary: boolean;
  isSubscription: boolean;
  autoRenew: boolean;
  cancelScheduled: boolean;
  expired: boolean;
  revoked: boolean;
  canRenew: boolean;
  canCancel: boolean;
  canResume: boolean;
  renewWindowDays: number;
  members: ManagedMember[];
};

export async function membershipApi<T>(path: string, init: RequestInit = {}): Promise<T> {
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

/** The signed-in user's current memberships (all of them). */
export function useMemberships() {
  const [memberships, setMemberships] = useState<ManagedMembership[] | null>(null);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const reload = useCallback(async () => {
    try {
      const j = await membershipApi<{ memberships: ManagedMembership[] }>('/api/membership/manage');
      setMemberships(j.memberships);
      setError(null);
    } catch (e) {
      setError({ message: (e as Error).message, status: (e as { status?: number }).status });
    }
  }, []);
  useEffect(() => { reload(); }, [reload]);
  return { memberships, error, reload };
}

export const fmtLongDate = (d: string | null) =>
  d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—';

export function statusBadge(m: ManagedMembership) {
  if (m.expired) return { text: m.revoked ? 'Ended' : 'Expired', cls: 'bg-red-100 text-red-800' };
  if (m.cancelScheduled) return { text: `Cancelled · active until ${fmtLongDate(m.endsOn)}`, cls: 'bg-yellow-100 text-yellow-900' };
  if (m.autoRenew) return { text: 'Active · renews automatically', cls: 'bg-green-100 text-green-800' };
  if (m.daysLeft != null && m.daysLeft <= m.renewWindowDays) {
    return { text: `Expires in ${m.daysLeft} day${m.daysLeft === 1 ? '' : 's'}`, cls: 'bg-yellow-100 text-yellow-900' };
  }
  return { text: 'Active · one-time payment', cls: 'bg-green-100 text-green-800' };
}

/** Status line, explanation and Renew / Cancel / Keep renewing buttons for one membership. */
export function MembershipStatusActions({ m, onChanged }: { m: ManagedMembership; onChanged: (notice: string) => void }) {
  const [busy, setBusy] = useState(false);
  const badge = statusBadge(m);

  const renew = async () => {
    setBusy(true);
    try {
      const { url } = await membershipApi<{ url: string }>('/api/membership/renew', {
        method: 'POST', body: JSON.stringify({ household_id: m.id }),
      });
      window.location.href = url;
    } catch (e) {
      alert((e as Error).message);
      setBusy(false);
    }
  };

  const change = async (action: 'cancel' | 'resume') => {
    const text =
      action === 'resume'
        ? 'Turn automatic renewal back on for this membership?'
        : m.autoRenew
          ? `Cancel automatic renewal for this membership? It stays active until ${fmtLongDate(m.endsOn)} and you won't be charged again.`
          : 'End this membership today? This cannot be undone.';
    if (!window.confirm(text)) return;
    setBusy(true);
    try {
      await membershipApi('/api/membership/revoke', { method: 'POST', body: JSON.stringify({ household_id: m.id, action }) });
      onChanged(
        action === 'resume'
          ? 'Automatic renewal is back on.'
          : m.autoRenew
            ? `Automatic renewal cancelled. The membership stays active until ${fmtLongDate(m.endsOn)}.`
            : 'The membership has ended.'
      );
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${badge.cls}`}>{badge.text}</span>
        <span className="text-sm text-gray-600">
          {m.isSubscription ? 'Yearly subscription' : 'One-time payment'} · started {fmtLongDate(m.start_date)}
          {!m.expired && !m.cancelScheduled && <> · {m.autoRenew ? 'next renewal' : 'valid until'} {fmtLongDate(m.endsOn)}</>}
        </span>
      </div>

      {m.isPrimary && (m.canRenew || m.canResume || m.canCancel) ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {m.canRenew && (
            <button onClick={renew} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-800 disabled:opacity-60">
              <ArrowPathIcon className="h-4 w-4" aria-hidden /> Renew
            </button>
          )}
          {m.canResume && (
            <button onClick={() => change('resume')} disabled={busy} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">
              Keep renewing automatically
            </button>
          )}
          {m.canCancel && (
            <button onClick={() => change('cancel')} disabled={busy} className="rounded-full border border-red-300 px-5 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">
              {m.autoRenew ? 'Cancel automatic renewal' : 'End this membership'}
            </button>
          )}
        </div>
      ) : (
        !m.isPrimary && (
          <p className="mt-3 text-sm text-gray-600">Only the household&apos;s primary contact ({m.primary_name}) can renew or cancel.</p>
        )
      )}
      {m.canRenew && <p className="mt-2 text-xs text-gray-500">The new membership year starts on the day you renew and renews automatically each year.</p>}
      {!m.canRenew && !m.isSubscription && !m.expired && m.isPrimary && (
        <p className="mt-2 text-xs text-gray-500">Renewal opens {m.renewWindowDays} days before this membership ends.</p>
      )}
    </div>
  );
}

/** Shown when the user holds more than one current membership. */
export function MultipleMembershipsNotice({ count }: { count: number }) {
  if (count < 2) return null;
  return (
    <p className="rounded-2xl bg-yellow-50 p-4 text-sm text-yellow-900 ring-1 ring-yellow-200">
      You have <strong>{count} memberships</strong> on this account. If you only want one, cancel the one you
      don&apos;t need below and <a href="/modules/contact" className="font-semibold underline">contact ICFC</a> if you need assistance.
    </p>
  );
}
