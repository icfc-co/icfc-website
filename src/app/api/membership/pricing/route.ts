import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
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

  const { data, error } = await supabase
    .from('membership_pricing')
    .select('type, amount_cents, min_age, max_age')
    .eq('is_active', true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const map = Object.fromEntries(
    (data || []).map(p => [p.type, { amount_cents: p.amount_cents, min_age: p.min_age, max_age: p.max_age }])
  );

  return NextResponse.json({ prices: map });
}
