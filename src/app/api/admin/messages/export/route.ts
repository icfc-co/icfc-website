// ----------
// FILE: src/app/api/admin/messages/export/route.ts
// ----------
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const E_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const E_KEY = process.env.SUPABASE_SERVICE_ROLE as string | undefined;
const eadmin = E_URL && E_KEY ? createClient(E_URL, E_KEY) : null;

function csvEscape(val: any) {
  const s = (val ?? '').toString();
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export async function GET(req: Request) {
  try {
    if (!eadmin) return NextResponse.json({ error: 'Server DB not configured.' }, { status: 501 });
    const url = new URL(req.url);
    const reason = url.searchParams.get('reason') || undefined;
    const status = url.searchParams.get('status') || undefined;
    const from = url.searchParams.get('from') || undefined;
    const to = url.searchParams.get('to') || undefined;
    const search = url.searchParams.get('search') || undefined;

    let query = eadmin
      .from('contact_messages')
      .select('created_at, name, email, reason, subject, status, message, notes')
      .order('created_at', { ascending: false });

    if (reason) query = query.eq('reason', reason);
    if (status) query = query.eq('status', status);
    if (from) query = query.gte('created_at', `${from}T00:00:00Z`);
    if (to) query = query.lte('created_at', `${to}T23:59:59Z`);
    if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,subject.ilike.%${search}%`);

    const { data, error } = await query.limit(5000);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const header = ['created_at','name','email','reason','subject','status', 'message','notes'];
    const rows = [header.join(',')].concat(
      (data || []).map(r => header.map(h => csvEscape((r as any)[h])).join(','))
    );
    const csv = rows.join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="contact_messages.csv"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
