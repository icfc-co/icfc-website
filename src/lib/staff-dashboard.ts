// Server-only: data for the staff dashboards (src/components/dashboard/StaffDashboard.tsx).
import type { SupabaseClient } from '@supabase/supabase-js';
import { CountKey, StaffRole, countsFor } from '@/lib/dashboard-tools';
import { HouseholdRow, isActive } from '@/lib/membership-access';
import { zonedInputToIso } from '@/lib/events';

const TZ = 'America/Denver';
const dayKey = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);

/**
 * The staff member's name and role, "needs attention" counts for the tools they
 * can open, and (admins) key figures. Pass a service-role client.
 */
export async function staffDashboard(service: SupabaseClient, userId: string) {
  const [{ data: prof }, { data: roleRows }] = await Promise.all([
    service.from('profiles').select('name').eq('id', userId).maybeSingle(),
    service.from('user_roles').select('roles(name)').eq('user_id', userId),
  ]);
  const names = ((roleRows ?? []) as { roles: { name?: string } | { name?: string }[] | null }[])
    .flatMap((r) => (Array.isArray(r.roles) ? r.roles : [r.roles])).map((r) => r?.name);
  const role: StaffRole = names.includes('super_admin') ? 'super_admin' : names.includes('admin') ? 'admin' : 'volunteer';

  // Head-only counts; a missing table or error shows as null instead of failing the page
  const count = async (table: string, f: (q: any) => any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const { count: n, error } = await f(service.from(table).select('id', { count: 'exact', head: true }));
    return error ? null : n ?? 0;
  };
  const QUERIES: Record<CountKey, () => Promise<number | null>> = {
    messages_new: () => count('contact_messages', (q) => q.eq('status', 'new')),
    social_new: () => count('social_service_requests', (q) => q.eq('status', 'new')),
    support_open: () => count('support_requests', (q) => q.eq('status', 'open')),
    ramadan_pending: () => count('ramadan_volunteers', (q) => q.eq('status', 'pending')),
    nikah_new: () => count('nikah_requests', (q) => q.eq('status', 'new')),
    donations_verify: () => count('donations', (q) => q.in('status', ['pending', 'needs_review']).in('method', ['zelle', 'bank'])),
  };
  const keys = countsFor(role);
  const values = await Promise.all(keys.map((k) => QUERIES[k]()));
  const counts = Object.fromEntries(keys.map((k, i) => [k, values[i]]));

  let figures: Record<string, number | null> | null = null;
  if (role !== 'volunteer') {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 86_400_000);
    const monthStart = `${dayKey(now).slice(0, 7)}-01`;

    const [households, events, gifts, live] = await Promise.all([
      service.from('membership_households').select('id, end_date, subscription_status, is_duplicate').range(0, 4999),
      count('events', (q) => q.eq('status', 'published').gte('starts_at', now.toISOString()).lte('starts_at', in30.toISOString())),
      service.from('donations').select('amount_cents').eq('status', 'succeeded').gte('created_at', zonedInputToIso(`${monthStart}T00:00`) ?? `${monthStart}T00:00:00Z`).range(0, 9999),
      count('announcements', (q) => q.eq('published', true).or(`expires_at.is.null,expires_at.gt."${now.toISOString()}"`)),
    ]);

    const active = ((households.data ?? []) as HouseholdRow[]).filter(isActive);
    const today = dayKey(now);
    const soon = dayKey(in30);
    const expiring = active.filter((h) => h.subscription_status !== 'active' && h.end_date && h.end_date >= today && h.end_date <= soon);
    let people: number | null = null;
    if (active.length) {
      const ids = active.map((h) => h.id);
      people = 0;
      for (let i = 0; i < ids.length; i += 200) {
        const n = await count('membership_members', (q) => q.in('household_id', ids.slice(i, i + 200)));
        people = n == null ? null : (people ?? 0) + n;
        if (people == null) break;
      }
    }

    figures = {
      active_households: households.error ? null : active.length,
      active_people: people,
      expiring_30: households.error ? null : expiring.length,
      upcoming_events: events,
      donations_month_cents: gifts.error ? null : (gifts.data ?? []).reduce((s, g) => s + ((g as { amount_cents: number }).amount_cents ?? 0), 0),
      live_announcements: live,
    };
  }

  return { name: (prof as { name?: string } | null)?.name || null, role, counts, figures };
}
