import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!
  );

  const build = (q: any) => {
    const method = url.searchParams.get('method');
    const status = url.searchParams.get('status');
    const fund   = url.searchParams.get('fund');
    const from   = url.searchParams.get('from');
    const to     = url.searchParams.get('to');
    const s      = url.searchParams.get('q');

    if (method) q = q.eq('method', method);
    if (status) q = q.eq('status', status);
    if (fund)   q = q.eq('fund', fund);
    if (from)   q = q.gte('created_at', `${from}T00:00:00Z`);
    if (to)     q = q.lte('created_at', `${to}T23:59:59Z`);
    if (s)      q = q.or([
      `donor_email.ilike.%${s}%`,
      `donor_name.ilike.%${s}%`,
      `external_ref.ilike.%${s}%`,
    ].join(','));
    return q;
  };

  const byMethodQ = build(supabase.from('donations').select('method,total:sum(amount_cents)'));
  const byFundQ   = build(supabase.from('donations').select('fund,total:sum(amount_cents)'));

  const [mRes, fRes] = await Promise.all([byMethodQ, byFundQ]);
  if (mRes.error) return NextResponse.json({ error: mRes.error.message }, { status: 500 });
  if (fRes.error) return NextResponse.json({ error: fRes.error.message }, { status: 500 });

  return NextResponse.json({
    byMethod: (mRes.data || []).map((r: any) => ({ method: r.method, total_cents: r.total || 0 })),
    byFund:   (fRes.data || []).map((r: any) => ({ fund: r.fund, total_cents: r.total || 0 })),
  });
}
