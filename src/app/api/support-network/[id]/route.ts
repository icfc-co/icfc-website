import { NextRequest, NextResponse } from 'next/server';
import { getCaller, canView, present, relation, matchesPreference, clean, Caller, RequestRow } from '@/lib/support-network';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

async function load(c: Caller, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await c.service.from('support_requests').select('*').eq('id', id).maybeSingle();
  return (data as RequestRow | null) ?? null;
}

// Activity line in the reply thread so everyone sees who did what.
async function logEvent(c: Caller, requestId: string, text: string) {
  await c.service.from('support_request_replies').insert({
    request_id: requestId, author_id: c.id, author_name: c.name, author_role: 'system', body: text,
  });
}

export async function GET(req: NextRequest, { params }: Ctx) {
  const r = await getCaller(req);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const c = r.caller;
  const { id } = await params;

  const row = await load(c, id);
  if (!row || !canView(row, c)) return NextResponse.json({ error: 'Request not found or no longer open.' }, { status: 404 });

  const { data: replies } = await c.service
    .from('support_request_replies')
    .select('id, author_id, author_name, author_role, body, created_at')
    .eq('request_id', id)
    .order('created_at', { ascending: true });

  return NextResponse.json({
    me: { id: c.id, name: c.name, phone: c.phone, isStaff: c.isStaff },
    data: present(row, c),
    replies: (replies ?? []).map((x) => ({ ...x, mine: x.author_id === c.id })),
  });
}

// PATCH { action: accept | withdraw | complete | cancel | reopen | notes, phone?, staff_notes? }
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const r = await getCaller(req);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const c = r.caller;
  const { id } = await params;

  const row = await load(c, id);
  if (!row || !canView(row, c)) return NextResponse.json({ error: 'Request not found or no longer open.' }, { status: 404 });

  const b = await req.json().catch(() => ({} as Record<string, unknown>));
  const action = String(b.action ?? '');
  const rel = relation(row, c);
  const now = new Date().toISOString();
  const deny = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });

  let patch: Partial<RequestRow> = {};
  let expectStatus: string[] = [];
  let event = '';

  switch (action) {
    case 'accept': {
      if (rel === 'requester') return deny('You cannot accept your own request.');
      if (!c.isStaff && !matchesPreference(row, c)) return deny('This request asked for a different helper.', 403);
      const phone = clean(b.phone, 40) || c.phone;
      if (!phone) return deny('Please enter a phone number so the requester can reach you.');
      patch = { status: 'accepted', helper_id: c.id, helper_name: c.name, helper_phone: phone, accepted_at: now };
      expectStatus = ['open'];
      event = `${c.name} accepted this request.`;
      break;
    }
    case 'withdraw': {
      if (rel !== 'helper' && !c.isStaff) return deny('Only the helper can withdraw.', 403);
      patch = { status: 'open', helper_id: null, helper_name: null, helper_phone: null, accepted_at: null };
      expectStatus = ['accepted'];
      event = rel === 'helper'
        ? `${c.name} can no longer help. The request is open again.`
        : `Staff (${c.name}) removed the helper. The request is open again.`;
      break;
    }
    case 'complete': {
      if (rel === 'member') return deny('Not allowed.', 403);
      patch = { status: 'completed', completed_at: now };
      expectStatus = c.isStaff ? ['open', 'accepted'] : ['accepted'];
      event = `${c.name} marked this request as completed.`;
      break;
    }
    case 'cancel': {
      if (rel !== 'requester' && !c.isStaff) return deny('Only the requester can cancel.', 403);
      patch = { status: 'cancelled', cancelled_at: now };
      expectStatus = ['open', 'accepted'];
      event = `${c.name} cancelled this request.`;
      break;
    }
    case 'reopen': {
      if (rel !== 'requester' && !c.isStaff) return deny('Not allowed.', 403);
      patch = {
        status: 'open', helper_id: null, helper_name: null, helper_phone: null,
        accepted_at: null, completed_at: null, cancelled_at: null,
      };
      expectStatus = rel === 'requester' && !c.isStaff ? ['cancelled'] : ['cancelled', 'completed'];
      event = `${c.name} reopened this request.`;
      break;
    }
    case 'notes': {
      if (!c.isStaff) return deny('Not allowed.', 403);
      patch = { staff_notes: clean(b.staff_notes, 4000) || null };
      expectStatus = [row.status];
      break;
    }
    default:
      return deny('Unknown action.');
  }

  if (!expectStatus.includes(row.status)) {
    return deny(`This request is ${row.status}; that action is not available.`, 409);
  }

  // Conditional on the current status so two members can't accept at once.
  const { data, error } = await c.service
    .from('support_requests')
    .update(patch)
    .eq('id', id)
    .eq('status', row.status)
    .select('*')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return deny('Someone else just updated this request. Please refresh.', 409);

  if (event) await logEvent(c, id, event);
  return NextResponse.json({ ok: true, data: present(data as RequestRow, c) });
}
