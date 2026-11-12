import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-user';
import { HouseholdRow, MemberRow, PHONE_OK, householdsFor, isActive, isPrimaryOf, likeExact, norm } from './shared';

export const dynamic = 'force-dynamic';

const GENDERS = ['Male', 'Female', 'Other'];
const clean = (v: unknown, max = 200) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

// GET: profile, login email (and pending change), and current memberships with their members
export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  const { user, service } = auth;

  const [{ data: profile }, households] = await Promise.all([
    service.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    householdsFor(service, user),
  ]);

  const active = households.filter(isActive).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const { data: members } = active.length
    ? await service
        .from('membership_members')
        .select('id, household_id, name, email, phone, age, sex, membership_type, designation, member_uid')
        .in('household_id', active.map((h) => h.id))
        .order('created_at', { ascending: true })
    : { data: [] as MemberRow[] };

  const email = norm(user.email);
  return NextResponse.json({
    email: user.email ?? null,
    pendingEmail: user.new_email ?? null,
    profile: profile ?? null,
    households: active.map((h: HouseholdRow) => {
      const primary = isPrimaryOf(h, user);
      return {
        id: h.id,
        primary_name: h.primary_name,
        start_date: h.start_date,
        end_date: h.end_date,
        subscription_status: h.subscription_status,
        isPrimary: primary,
        members: ((members ?? []) as MemberRow[])
          .filter((m) => m.household_id === h.id)
          .map((m) => {
            const self = norm(m.email) === email;
            return { ...m, self, canEdit: primary || self, canEditEmail: (primary || self) && !self };
          }),
      };
    }),
  });
}

// PATCH: save profile; copy phone and gender to the user's own membership rows
export async function PATCH(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  const { user, service } = auth;
  const b = await req.json().catch(() => ({} as Record<string, unknown>));

  const v = {
    name: clean(b.name, 120),
    phone: clean(b.phone, 40),
    address: clean(b.address, 300),
    city: clean(b.city, 120),
    country: clean(b.country, 120),
    gender: clean(b.gender, 10),
    age: Number(b.age),
  };
  const errors: Record<string, string> = {};
  if (!v.name) errors.name = 'Name is required.';
  if (!v.phone || !PHONE_OK(v.phone)) errors.phone = 'Enter a valid phone number (10+ digits).';
  if (!v.address) errors.address = 'Address is required.';
  if (!v.city) errors.city = 'City is required.';
  if (!v.country) errors.country = 'Country is required.';
  if (!GENDERS.includes(v.gender)) errors.gender = 'Select a gender.';
  if (!Number.isInteger(v.age) || v.age < 1 || v.age > 120) errors.age = 'Enter a valid age.';
  if (Object.keys(errors).length) return NextResponse.json({ error: 'Please fix the highlighted fields.', errors }, { status: 400 });

  const { data: profile, error } = await service
    .from('profiles')
    .upsert({ id: user.id, email: user.email, ...v }, { onConflict: 'id' })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Keep the membership records current (own rows only)
  const email = norm(user.email);
  if (email) {
    const { data: rows } = await service.from('membership_members').select('id, email').ilike('email', likeExact(email));
    const ids = ((rows ?? []) as { id: string; email: string | null }[]).filter((r) => norm(r.email) === email).map((r) => r.id);
    const sex = v.gender === 'Male' ? 'male' : v.gender === 'Female' ? 'female' : null;
    if (ids.length) {
      await service.from('membership_members').update({ phone: v.phone, ...(sex ? { sex } : {}) }).in('id', ids);
    }
    const { data: hh } = await service.from('membership_households').select('id, primary_email, user_id').ilike('primary_email', likeExact(email));
    const hhIds = ((hh ?? []) as { id: string; primary_email: string | null; user_id: string | null }[])
      .filter((h) => norm(h.primary_email) === email && (!h.user_id || h.user_id === user.id))
      .map((h) => h.id);
    if (hhIds.length) await service.from('membership_households').update({ primary_phone: v.phone }).in('id', hhIds);
  }

  return NextResponse.json({ ok: true, profile });
}
