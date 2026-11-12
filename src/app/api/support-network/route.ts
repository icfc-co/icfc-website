import { NextRequest, NextResponse } from 'next/server';
import {
  getCaller, present, clean, matchesPreference,
  HELP_TYPES, URGENCIES, STATUSES, PREFERRED_HELPER, RequestRow,
} from '@/lib/support-network';

export const dynamic = 'force-dynamic';

const MAX_ACTIVE_PER_MEMBER = 5;

// GET ?view=open|mine|helping|all  (all = staff only; supports status[] and q)
export async function GET(req: NextRequest) {
  const r = await getCaller(req);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const c = r.caller;

  const url = new URL(req.url);
  const view = url.searchParams.get('view') ?? 'open';

  let qb = c.service.from('support_requests').select('*');

  if (view === 'open') {
    qb = qb.eq('status', 'open').neq('requester_id', c.id);
  } else if (view === 'mine') {
    qb = qb.eq('requester_id', c.id);
  } else if (view === 'helping') {
    qb = qb.eq('helper_id', c.id);
  } else if (view === 'all') {
    if (!c.isStaff) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const status = url.searchParams.getAll('status').filter((s) => (STATUSES as readonly string[]).includes(s));
    if (status.length) qb = qb.in('status', status);
    const q = clean(url.searchParams.get('q'), 100).replace(/[,%()*]/g, ' ').trim();
    if (q) qb = qb.or(`recipient_name.ilike.%${q}%,area.ilike.%${q}%,details.ilike.%${q}%,helper_name.ilike.%${q}%`);
  } else {
    return NextResponse.json({ error: 'Unknown view' }, { status: 400 });
  }

  const { data, error } = await qb.order('created_at', { ascending: false }).limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let rows = (data ?? []) as RequestRow[];
  if (view === 'open' && !c.isStaff) rows = rows.filter((row) => matchesPreference(row, c));

  return NextResponse.json({
    me: { name: c.name, phone: c.phone, email: c.email, isStaff: c.isStaff },
    data: rows.map((row) => present(row, c)),
  });
}

// POST: create a request for the signed-in member
export async function POST(req: NextRequest) {
  const r = await getCaller(req);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const c = r.caller;

  const b = await req.json().catch(() => ({} as Record<string, unknown>));

  const help_types = Array.isArray(b.help_types)
    ? [...new Set(b.help_types.filter((t: unknown): t is string => (HELP_TYPES as readonly string[]).includes(t as string)))]
    : [];
  const row = {
    requester_id: c.id,
    recipient_name: clean(b.recipient_name, 120),
    for_self: b.for_self !== false,
    contact_phone: clean(b.contact_phone, 40),
    contact_email: clean(b.contact_email, 200) || null,
    area: clean(b.area, 120),
    address: clean(b.address, 300) || null,
    help_types,
    other_help: help_types.includes('other') ? clean(b.other_help, 200) || null : null,
    urgency: (URGENCIES as readonly string[]).includes(b.urgency as string) ? (b.urgency as string) : 'flexible',
    needed_on: /^\d{4}-\d{2}-\d{2}$/.test(String(b.needed_on ?? '')) ? (b.needed_on as string) : null,
    time_window: clean(b.time_window, 120) || null,
    details: clean(b.details, 2000),
    preferred_helper: (PREFERRED_HELPER as readonly string[]).includes(b.preferred_helper as string)
      ? (b.preferred_helper as string) : 'any',
  };

  const missing = [
    !row.recipient_name && 'name',
    !row.contact_phone && 'phone number',
    !row.area && 'area / neighborhood',
    !row.help_types.length && 'type of help',
    row.help_types.includes('other') && !row.other_help && 'description of "Other"',
    !row.details && 'details',
    b.agreed !== true && 'agreement',
  ].filter(Boolean);
  if (missing.length) {
    return NextResponse.json({ error: `Please fill in: ${missing.join(', ')}.` }, { status: 400 });
  }

  const { count } = await c.service
    .from('support_requests')
    .select('id', { count: 'exact', head: true })
    .eq('requester_id', c.id)
    .in('status', ['open', 'accepted']);
  if ((count ?? 0) >= MAX_ACTIVE_PER_MEMBER) {
    return NextResponse.json(
      { error: `You already have ${count} active requests. Please complete or cancel one before adding another.` },
      { status: 400 }
    );
  }

  const { data, error } = await c.service.from('support_requests').insert(row).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data: present(data as RequestRow, c) });
}
