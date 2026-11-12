// Server-only: the signed-in user for an API request (Bearer token from the
// browser session, or the synced auth cookie), plus a service-role client.
import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

export function serviceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.SUPABASE_SERVICE_ROLE ?? process.env.SUPABASE_SERVICE_ROLE_KEY)!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function getAuthUser(req: NextRequest): Promise<{ user: User; service: SupabaseClient } | null> {
  const service = serviceClient();
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  if (token) {
    const { data } = await service.auth.getUser(token);
    return data.user ? { user: data.user, service } : null;
  }
  const browser = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
  );
  const { data } = await browser.auth.getUser();
  return data.user ? { user: data.user, service } : null;
}
