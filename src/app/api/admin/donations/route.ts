import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function applyFilters(url: URL, q: any) {
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
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // IMPORTANT: use your real env var name
    process.env.SUPABASE_SERVICE_ROLE! 
  );

  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(1000, Number(url.searchParams.get('pageSize') || 100));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from('admin_donations')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  q = applyFilters(url, q);

  // CSV export
  if (url.searchParams.get('format') === 'csv') {
    const { data, error } = await q.range(0, 100000);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const header = [
      'created_at','method','status','amount_usd','fund','recurrence',
      'donor_name','donor_email','external_ref',
      'zelle_transfer_date','zelle_proof',
      'bank_transaction_id','bank_transfer_date','bank_proof'
    ];
    const rows = (data || []).map((d: any) => [
      d.created_at, d.method, d.status, (d.amount_cents/100).toFixed(2),
      d.fund, d.recurrence, d.donor_name||'', d.donor_email||'', d.external_ref||'',
      d.zelle_transfer_date||'', d.zelle_proof||'',
      d.bank_transaction_id||'', d.bank_transfer_date||'', d.bank_proof||'',
    ].map(String).map(v => `"${v.replaceAll('"','""')}"`).join(','));

    const csv = [header.join(','), ...rows].join('\n');
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=donations-${Date.now()}.csv`,
      },
    });
  }

  const { data, error, count } = await q.range(from, to);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, count, page, pageSize });
}
