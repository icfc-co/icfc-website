import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

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

    const today = new Date().toISOString().slice(0,10);

    const { data: hh, error } = await supabase
      .from('membership_households')
      .update({ status: 'revoked', end_date: today })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .select('id')
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!hh) return NextResponse.json({ error: 'No household found' }, { status: 404 });

    return NextResponse.json({ ok: true, end_date: today });
  } catch (e: any) {
    console.error('revoke error', e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
