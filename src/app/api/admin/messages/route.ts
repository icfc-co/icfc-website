// ----------
// FILE: src/app/api/admin/messages/route.ts
// ----------
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const A_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const A_KEY = process.env.SUPABASE_SERVICE_ROLE as string | undefined;
const admin = A_URL && A_KEY ? createClient(A_URL, A_KEY) : null;

function parseIntSafe(v: string | null, d: number) { const n = v ? parseInt(v, 10) : NaN; return Number.isFinite(n) && n>0 ? n : d; }

export async function GET(req: Request) {
  try {
    if (!admin) return NextResponse.json({ error: 'Server DB not configured.' }, { status: 501 });

    const url = new URL(req.url);
    const reason = url.searchParams.get('reason') || undefined;
    const status = url.searchParams.get('status') || undefined;
    const from = url.searchParams.get('from') || undefined; // YYYY-MM-DD
    const to = url.searchParams.get('to') || undefined;     // YYYY-MM-DD
    const search = url.searchParams.get('search') || undefined;
    const page = parseIntSafe(url.searchParams.get('page'), 1);
    const pageSize = parseIntSafe(url.searchParams.get('pageSize'), 20);

    let query = admin
      .from('contact_messages')
      .select('id, created_at, name, email, reason, subject, status, notes', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (reason) query = query.eq('reason', reason);
    if (status) query = query.eq('status', status);
    if (from) query = query.gte('created_at', `${from}T00:00:00Z`);
    if (to) query = query.lte('created_at', `${to}T23:59:59Z`);
    if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,subject.ilike.%${search}%`);

    const fromIdx = (page - 1) * pageSize;
    const toIdx = fromIdx + pageSize - 1;

    const { data, count, error } = await query.range(fromIdx, toIdx);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data, total: count ?? 0, page, pageSize });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    if (!admin) return NextResponse.json({ error: 'Server DB not configured.' }, { status: 501 });
    const body = await req.json().catch(() => null);
    if (!body?.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const payload: any = {};
    if (body.status) payload.status = body.status;
    if (body.notes !== undefined) payload.notes = body.notes;

    const { error } = await admin.from('contact_messages').update(payload).eq('id', body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}