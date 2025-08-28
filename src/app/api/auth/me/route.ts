// src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(req: NextRequest) {
  const supa = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supa.auth.getUser();
  const { data: isAdmin } = user ? await supa.rpc('is_admin') : { data: false };
  return NextResponse.json({ user, isAdmin: !!isAdmin });
}
