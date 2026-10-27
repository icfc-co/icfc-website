// src/lib/require-admin.ts
import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export type RequireAdminOk = {
  ok: true;
  service: ReturnType<typeof createClient>;
};
export type RequireAdminFail = { ok: false; status: 401 | 403; error: string };
export type RequireAdminResult = RequireAdminOk | RequireAdminFail;

// alsoAllow: extra role names (e.g. 'volunteer') that pass even when is_admin() is false
export async function requireAdmin(
  req: NextRequest,
  opts: { alsoAllow?: string[] } = {}
): Promise<RequireAdminResult> {
  // 1) Read the user session from cookies
  const browser = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: () => {}, // don't write cookies from API routes
      },
    }
  );

  const { data: { user } } = await browser.auth.getUser();
  if (!user) return { ok: false, status: 401, error: 'Not signed in' };

  // Pass uid: is_admin() and is_admin(uid) are both defined, so a no-arg call is ambiguous (PGRST203)
  const { data: isAdmin } = await browser.rpc('is_admin', { uid: user.id });
  if (!isAdmin) {
    const allowed = opts.alsoAllow ?? [];
    if (!allowed.length) return { ok: false, status: 403, error: 'Forbidden' };

    const { data: roleRows } = await browser
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', user.id);
    const names = (roleRows ?? []).map((r: any) => r?.roles?.name).filter(Boolean) as string[];
    if (!names.some((n) => allowed.includes(n))) return { ok: false, status: 403, error: 'Forbidden' };
  }

  // 2) Use service role for actual admin queries/mutations
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,   // <-- you said your var is this name
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  return { ok: true, service };
}
