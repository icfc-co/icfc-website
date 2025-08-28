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

export async function requireAdmin(req: NextRequest): Promise<RequireAdminResult> {
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

  const { data: isAdmin } = await browser.rpc('is_admin');
  if (!isAdmin) return { ok: false, status: 403, error: 'Forbidden' };

  // 2) Use service role for actual admin queries/mutations
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,   // <-- you said your var is this name
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  return { ok: true, service };
}
