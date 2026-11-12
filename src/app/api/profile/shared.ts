// Server-only helpers for /api/profile routes.
import { SupabaseClient, User } from '@supabase/supabase-js';

export const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();

// ilike treats _ and % as wildcards; escape them for an exact (case-insensitive) match
export const likeExact = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export type HouseholdRow = {
  id: string;
  user_id: string | null;
  primary_name: string | null;
  primary_email: string | null;
  primary_phone: string | null;
  start_date: string | null;
  end_date: string | null;
  subscription_status: string | null;
  created_at: string;
  is_duplicate?: boolean | null;
};

export type MemberRow = {
  id: string;
  household_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  age: number | null;
  sex: string | null;
  membership_type: string | null;
  designation: string | null;
  member_uid?: number | null;
};

export const isPrimaryOf = (h: HouseholdRow, user: User) =>
  h.user_id === user.id || (!!user.email && norm(h.primary_email) === norm(user.email));

const today = () => new Date().toISOString().slice(0, 10);
export const isActive = (h: HouseholdRow) =>
  !h.is_duplicate && (!h.end_date || h.end_date >= today() || h.subscription_status === 'active');

/** Households the user is primary for, plus ones where they are listed as a member. */
export async function householdsFor(service: SupabaseClient, user: User) {
  const email = norm(user.email);
  const [byUser, byEmail, asMember] = await Promise.all([
    service.from('membership_households').select('*').eq('user_id', user.id),
    email
      ? service.from('membership_households').select('*').ilike('primary_email', likeExact(email))
      : Promise.resolve({ data: [] as HouseholdRow[] }),
    email
      ? service.from('membership_members').select('household_id, email').ilike('email', likeExact(email))
      : Promise.resolve({ data: [] as { household_id: string; email: string | null }[] }),
  ]);

  const map = new Map<string, HouseholdRow>();
  for (const h of [...(byUser.data ?? []), ...(byEmail.data ?? [])] as HouseholdRow[]) {
    if (h.user_id === user.id || norm(h.primary_email) === email) map.set(h.id, h);
  }
  const memberIds = ((asMember.data ?? []) as { household_id: string; email: string | null }[])
    .filter((m) => norm(m.email) === email)
    .map((m) => m.household_id)
    .filter((id) => !map.has(id));
  if (memberIds.length) {
    const { data } = await service.from('membership_households').select('*').in('id', memberIds);
    for (const h of (data ?? []) as HouseholdRow[]) map.set(h.id, h);
  }
  return [...map.values()].filter((h) => !h.is_duplicate);
}

export const PHONE_OK = (p: string) => p === '' || p.replace(/\D/g, '').length >= 10;
export const EMAIL_OK = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
