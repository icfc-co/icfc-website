// Server-only helpers for the Community Support Network (/api/support-network).
import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const HELP_TYPES = ['ride', 'groceries', 'meals', 'laundry', 'chores', 'other'] as const;
export const URGENCIES = ['urgent', 'this_week', 'flexible'] as const;
export const STATUSES = ['open', 'accepted', 'completed', 'cancelled'] as const;
export const PREFERRED_HELPER = ['any', 'Female', 'Male'] as const;

const STAFF_ROLES = ['super_admin', 'admin', 'volunteer'];
// Who may use the network: registered members plus staff.
const MEMBER_ROLES = ['member', ...STAFF_ROLES];

export type Caller = {
  id: string;
  email: string | null;
  role: string;
  isStaff: boolean;
  name: string;
  phone: string | null;
  gender: string | null;
  service: SupabaseClient;
};

export type CallerResult = { ok: true; caller: Caller } | { ok: false; status: 401 | 403; error: string };

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.SUPABASE_SERVICE_ROLE ?? process.env.SUPABASE_SERVICE_ROLE_KEY)!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

// Accepts a Bearer token (pages use the localStorage session) or the synced auth cookie.
export async function getCaller(req: NextRequest): Promise<CallerResult> {
  const service = serviceClient();
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';

  let user: { id: string; email?: string | null } | null = null;
  if (token) {
    const { data } = await service.auth.getUser(token);
    user = data.user;
  } else {
    const browser = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
    );
    const { data } = await browser.auth.getUser();
    user = data.user;
  }
  if (!user) return { ok: false, status: 401, error: 'Please sign in.' };

  const [{ data: roleRows }, { data: profile }] = await Promise.all([
    service.from('user_roles').select('roles(name)').eq('user_id', user.id),
    service.from('profiles').select('name, phone, gender').eq('id', user.id).maybeSingle(),
  ]);
  const roles = (roleRows ?? []).map((r: { roles?: { name?: string } | { name?: string }[] | null }) =>
    Array.isArray(r.roles) ? r.roles[0]?.name : r.roles?.name).filter(Boolean) as string[];
  const role = roles.find((r) => MEMBER_ROLES.includes(r));
  if (!role) {
    return { ok: false, status: 403, error: 'The Support Network is available to registered ICFC members only.' };
  }

  const p = (profile ?? {}) as { name?: string; phone?: string; gender?: string };
  return {
    ok: true,
    caller: {
      id: user.id,
      email: user.email ?? null,
      role,
      isStaff: STAFF_ROLES.includes(role),
      name: p.name?.trim() || user.email?.split('@')[0] || 'Member',
      phone: p.phone?.trim() || null,
      gender: p.gender || null,
      service,
    },
  };
}

export type RequestRow = {
  id: string;
  created_at: string;
  updated_at: string;
  requester_id: string;
  recipient_name: string;
  for_self: boolean;
  contact_phone: string;
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
  cancelled_at: string | null;
  staff_notes: string | null;
};

export function relation(row: RequestRow, c: Caller) {
  if (row.requester_id === c.id) return 'requester' as const;
  if (row.helper_id && row.helper_id === c.id) return 'helper' as const;
  if (c.isStaff) return 'staff' as const;
  return 'member' as const;
}

// Members see open requests that match their gender preference; everything
// else only the requester, the helper and staff.
export function canView(row: RequestRow, c: Caller) {
  const rel = relation(row, c);
  if (rel !== 'member') return true;
  return row.status === 'open' && matchesPreference(row, c);
}

export function matchesPreference(row: Pick<RequestRow, 'preferred_helper'>, c: Caller) {
  return row.preferred_helper === 'any' || row.preferred_helper === c.gender;
}

const firstName = (n: string) => n.trim().split(/\s+/)[0] ?? n;

// Strip what the caller is not allowed to see.
export function present(row: RequestRow, c: Caller) {
  const rel = relation(row, c);
  const full = rel === 'requester' || rel === 'helper' || rel === 'staff';
  return {
    ...row,
    recipient_name: full ? row.recipient_name : firstName(row.recipient_name),
    contact_phone: full ? row.contact_phone : null,
    contact_email: full ? row.contact_email : null,
    address: full ? row.address : null,
    helper_phone: full ? row.helper_phone : null,
    staff_notes: c.isStaff ? row.staff_notes : null,
    is_staff: c.isStaff,
    viewer: rel,
  };
}

export const clean = (v: unknown, max = 500) =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';
