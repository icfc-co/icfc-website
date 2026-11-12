import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-user';
import { EMAIL_OK, HouseholdRow, MemberRow, PHONE_OK, isPrimaryOf, norm } from '../../shared';

export const dynamic = 'force-dynamic';

const clean = (v: unknown, max = 200) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

// PATCH { name, phone, email, sex } — the household's primary contact can edit
// any member; a member can edit their own row (but not its email: that is their
// login and changes through "Change login email").
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  const { user, service } = auth;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: member } = await service.from('membership_members').select('*').eq('id', id).maybeSingle();
  if (!member) return NextResponse.json({ error: 'Member not found.' }, { status: 404 });
  const m = member as MemberRow;
  const { data: household } = await service.from('membership_households').select('*').eq('id', m.household_id).maybeSingle();
  const h = household as HouseholdRow | null;
  if (!h || h.is_duplicate) return NextResponse.json({ error: 'Member not found.' }, { status: 404 });

  const primary = isPrimaryOf(h, user);
  const self = norm(m.email) === norm(user.email);
  if (!primary && !self) return NextResponse.json({ error: 'You can only edit your own household.' }, { status: 403 });

  const b = await req.json().catch(() => ({} as Record<string, unknown>));
  const name = clean(b.name, 120);
  const phone = clean(b.phone, 40);
  const email = clean(b.email, 200).toLowerCase();
  const sex = b.sex === 'male' || b.sex === 'female' ? b.sex : null;

  const errors: Record<string, string> = {};
  if (!name) errors.name = 'Name is required.';
  if (!PHONE_OK(phone)) errors.phone = 'Enter a valid phone number (10+ digits).';
  if (email && !EMAIL_OK(email)) errors.email = 'Enter a valid email address.';
  if (Object.keys(errors).length) return NextResponse.json({ error: 'Please fix the highlighted fields.', errors }, { status: 400 });

  const patch: Partial<MemberRow> = { name, phone: phone || null, ...(sex ? { sex } : {}) };
  if (!self) patch.email = email || null; // own email changes only via login email change

  const { data, error } = await service.from('membership_members').update(patch).eq('id', id).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Head of household: keep the household's contact name/phone in step
  if (primary && m.designation === 'head_of_household') {
    await service.from('membership_households').update({ primary_name: name, ...(phone ? { primary_phone: phone } : {}) }).eq('id', h.id);
  }

  return NextResponse.json({ ok: true, member: data });
}
