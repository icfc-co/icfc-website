'use client';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export const HELP_LABELS: Record<string, string> = {
  ride: 'Ride',
  groceries: 'Grocery shopping',
  meals: 'Food / prepared meals',
  laundry: 'Laundry',
  chores: 'Household chores / minor repairs',
  other: 'Other',
};

export const URGENCY_LABELS: Record<string, string> = {
  urgent: 'Urgent (within 48 hours)',
  this_week: 'This week',
  flexible: 'Flexible',
};

export const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  accepted: 'Accepted',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export type SupportRequest = {
  id: string;
  created_at: string;
  requester_id: string;
  recipient_name: string;
  for_self: boolean;
  contact_phone: string | null;
  contact_email: string | null;
  area: string;
  address: string | null;
  help_types: string[];
  other_help: string | null;
  urgency: string;
  needed_on: string | null;
  time_window: string | null;
  details: string;
  preferred_helper: string;
  status: string;
  helper_id: string | null;
  helper_name: string | null;
  helper_phone: string | null;
  accepted_at: string | null;
  completed_at: string | null;
  staff_notes: string | null;
  viewer: 'requester' | 'helper' | 'staff' | 'member';
  is_staff: boolean;
};

// Calls our API with the signed-in user's token.
export const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
  return json as T;
}

export const fmtDate = (d: string | null) =>
  d ? new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';

export const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export function helpList(r: Pick<SupportRequest, 'help_types' | 'other_help'>) {
  return r.help_types.map((t) => (t === 'other' && r.other_help ? `Other: ${r.other_help}` : HELP_LABELS[t] ?? t)).join(', ');
}

export function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    open: 'bg-blue-100 text-blue-800',
    accepted: 'bg-amber-100 text-amber-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-200 text-gray-700',
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls[status] ?? 'bg-gray-100'}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function UrgencyBadge({ urgency }: { urgency: string }) {
  if (urgency !== 'urgent') return <span className="text-xs text-gray-600">{URGENCY_LABELS[urgency]}</span>;
  return <span className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">Urgent</span>;
}

export function RequestCard({ r }: { r: SupportRequest }) {
  return (
    <Link
      href={`/member/support-network/${r.id}`}
      className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-[#006400] hover:shadow"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{helpList(r)}</span>
        <StatusBadge status={r.status} />
        <UrgencyBadge urgency={r.urgency} />
      </div>
      <p className="mt-1 text-sm text-gray-600">
        {r.recipient_name} · {r.area}
        {r.needed_on && <> · needed {fmtDate(r.needed_on)}</>}
        {r.time_window && <> · {r.time_window}</>}
      </p>
      <p className="mt-2 line-clamp-2 text-sm text-gray-800">{r.details}</p>
      {r.helper_name && r.status !== 'open' && (
        <p className="mt-2 text-xs text-gray-500">Helper: {r.helper_name}</p>
      )}
      <p className="mt-1 text-xs text-gray-400">Posted {fmtDate(r.created_at)}</p>
    </Link>
  );
}
