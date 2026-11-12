import { NextRequest, NextResponse } from 'next/server';
import { getCaller, canView, clean, RequestRow } from '@/lib/support-network';

export const dynamic = 'force-dynamic';

// POST { body } — add a reply to a request the caller can see.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const r = await getCaller(req);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const c = r.caller;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: row } = await c.service.from('support_requests').select('*').eq('id', id).maybeSingle();
  if (!row || !canView(row as RequestRow, c)) {
    return NextResponse.json({ error: 'Request not found or no longer open.' }, { status: 404 });
  }
  if ((row as RequestRow).status === 'cancelled' && !c.isStaff) {
    return NextResponse.json({ error: 'This request was cancelled.' }, { status: 409 });
  }

  const b = await req.json().catch(() => ({} as Record<string, unknown>));
  const body = clean(b.body, 2000);
  if (!body) return NextResponse.json({ error: 'Please write a message.' }, { status: 400 });

  const { data, error } = await c.service
    .from('support_request_replies')
    .insert({ request_id: id, author_id: c.id, author_name: c.name, author_role: c.isStaff ? 'staff' : 'member', body })
    .select('id, author_id, author_name, author_role, body, created_at')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data: { ...data, mine: true } });
}
