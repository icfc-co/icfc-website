import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  IMPEDIMENT_OPTS, KAFAAH_OPTS, LICENSE_OPTS, MAHR_OPTS, REQUIREMENTS, WALI_OPTS, WITNESS_OPTS,
  todayInFortCollins,
} from '@/lib/nikah';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PER_HOUR = 5;

const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const opt = (v: unknown, max = 300) => str(v, max) || null;
const oneOf = (opts: { value: string }[], v: unknown) => opts.some((o) => o.value === v);

// POST: public Nikah request (no sign-in needed)
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== 'object') return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });

  // Honeypot: real people never see this field
  if (str(b.website)) return NextResponse.json({ ok: true });

  const row = {
    contact_email: str(b.contact_email, 200).toLowerCase(),
    groom_name: str(b.groom_name, 150),
    groom_phone: str(b.groom_phone, 40),
    groom_email: opt(b.groom_email, 200)?.toLowerCase() ?? null,
    groom_address: opt(b.groom_address, 300),
    bride_name: str(b.bride_name, 150),
    bride_phone: str(b.bride_phone, 40),
    bride_email: opt(b.bride_email, 200)?.toLowerCase() ?? null,
    nikah_date: str(b.nikah_date, 10),
    nikah_time: str(b.nikah_time, 5),
    location: str(b.location, 200) || 'ICFC',
    location_address: opt(b.location_address, 300),
    requirements: {} as Record<string, string>,
    requirements_notes: opt(b.requirements_notes, 2000),
    vows_acknowledged: b.vows_acknowledged === true,
    witnesses: str(b.witnesses, 20),
    mahr: str(b.mahr, 20),
    wali: str(b.wali, 20),
    wali_details: opt(b.wali_details, 200),
    kafaah: str(b.kafaah, 20),
    impediments: str(b.impediments, 20),
    license: str(b.license, 20),
    declaration_groom: b.declaration_groom === true,
    declaration_bride: b.declaration_bride === true,
    resources_checked: b.resources_checked === true,
    resources_note: opt(b.resources_note, 500),
    wants_to_donate: b.wants_to_donate === true,
    donation_amount: b.wants_to_donate === true ? opt(b.donation_amount, 40) : null,
  };

  for (const q of REQUIREMENTS) {
    const v = b.requirements?.[q.key];
    if (v !== 'available' && v !== 'not_available') {
      return NextResponse.json({ error: `Please mark "${q.label}" as available or not available.` }, { status: 400 });
    }
    row.requirements[q.key] = v;
  }

  const missing: string[] = [];
  if (!EMAIL.test(row.contact_email)) missing.push('a valid contact email');
  if (!row.groom_name) missing.push('groom’s full name');
  if (!row.groom_phone) missing.push('groom’s phone');
  if (!row.bride_name) missing.push('bride’s full name');
  if (!row.bride_phone) missing.push('bride’s phone');
  if (row.groom_email && !EMAIL.test(row.groom_email)) missing.push('a valid groom email');
  if (row.bride_email && !EMAIL.test(row.bride_email)) missing.push('a valid bride email');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(row.nikah_date)) missing.push('the requested date');
  if (!/^\d{2}:\d{2}$/.test(row.nikah_time)) missing.push('the requested time');
  if (row.location.toUpperCase() !== 'ICFC' && !row.location_address) missing.push('the address of the requested location');
  if (!oneOf(WITNESS_OPTS, row.witnesses)) missing.push('the witnesses question');
  if (!oneOf(MAHR_OPTS, row.mahr)) missing.push('the mahr question');
  if (!oneOf(WALI_OPTS, row.wali)) missing.push('who will serve as wali');
  if (row.wali === 'relative' && !row.wali_details) missing.push('the wali’s name and relation');
  if (!oneOf(KAFAAH_OPTS, row.kafaah)) missing.push('the kafā’ah question');
  if (!oneOf(IMPEDIMENT_OPTS, row.impediments)) missing.push('the impediments question');
  if (!oneOf(LICENSE_OPTS, row.license)) missing.push('the marriage license question');
  if (!row.declaration_groom || !row.declaration_bride) missing.push('the declaration by both the groom and the bride');
  if (!row.resources_checked && !row.resources_note) missing.push('the resources acknowledgment');
  if (missing.length) {
    return NextResponse.json({ error: `Please provide ${missing.join(', ')}.` }, { status: 400 });
  }
  if (row.nikah_date < todayInFortCollins()) {
    return NextResponse.json({ error: 'The requested Nikah date is in the past.' }, { status: 400 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
  if (ip) {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from('nikah_requests')
      .select('id', { count: 'exact', head: true })
      .eq('submitter_ip', ip)
      .gte('created_at', since);
    if ((count ?? 0) >= MAX_PER_HOUR) {
      return NextResponse.json({ error: 'Too many requests. Please try again later or call the office.' }, { status: 429 });
    }
  }

  // Link the request to the account when the submitter is signed in (optional)
  let submitted_by: string | null = null;
  try {
    const supa = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
    );
    const { data } = await supa.auth.getUser();
    submitted_by = data.user?.id ?? null;
  } catch { /* anonymous */ }

  const { data, error } = await supabaseAdmin
    .from('nikah_requests')
    .insert({ ...row, submitted_by, submitter_ip: ip, user_agent: req.headers.get('user-agent')?.slice(0, 300) ?? null })
    .select('id')
    .single();

  if (error) {
    console.error('[nikah] insert error:', error);
    return NextResponse.json({ error: 'Could not save your request. Please try again or call the office.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data.id });
}
