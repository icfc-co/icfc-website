import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/require-admin';
import { staffDashboard } from '@/lib/staff-dashboard';

export const dynamic = 'force-dynamic';

// GET: data for the signed-in staff member's dashboard (super admin, admin, volunteer)
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, { alsoAllow: ['volunteer'] });
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const data = await staffDashboard(auth.service as unknown as SupabaseClient, auth.user.id);
  return NextResponse.json({ ...data, email: auth.user.email ?? null });
}
