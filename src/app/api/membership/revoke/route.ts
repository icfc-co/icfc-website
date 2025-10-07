import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function findLatestHouseholdByUserOrEmail(supabase: any, uid: string, email?: string) {
  // 1) by user_id
  let { data: hh, error } = await supabase
    .from('membership_households')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (hh) return hh;

  // 2) by primary_email (case-insensitive)
  if (email) {
    const { data: hhByEmail } = await supabase
      .from('membership_households')
      .select('*')
      .ilike('primary_email', email.trim())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (hhByEmail) return hhByEmail;
  }

  return null;
}

export async function POST() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (k) => cookieStore.get(k)?.value,
          set: (k, v, o) => cookieStore.set(k, v, o),
          remove: (k, o) => cookieStore.set(k, '', { ...o, maxAge: 0 }),
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const hh = await findLatestHouseholdByUserOrEmail(supabase, user.id, user.email || undefined);
    if (!hh) return NextResponse.json({ error: 'No household found' }, { status: 404 });

    const today = new Date().toISOString().slice(0, 10);

    const { error: updErr } = await supabase
      .from('membership_households')
      .update({ status: 'revoked', end_date: today })
      .eq('id', hh.id);

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });

    return NextResponse.json({ ok: true, end_date: today });
  } catch (e: any) {
    console.error('revoke error', e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
