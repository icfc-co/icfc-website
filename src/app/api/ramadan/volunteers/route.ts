// File: src/app/api/ramadan/volunteers/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE as string | undefined;

const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
  : null;

// POST - Submit volunteer form
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });

    const { name, phone, preferred_team } = body;
    
    if (!name || !phone || !preferred_team) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      console.warn('[ramadan-volunteers] Supabase not configured.');
      return NextResponse.json({ error: 'Server DB not configured.' }, { status: 501 });
    }

    // Insert volunteer record
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('ramadan_volunteers')
      .insert({
        name,
        phone,
        preferred_team,
        status: 'pending',
      })
      .select('id, created_at')
      .single();

    if (insertErr) {
      console.error('[ramadan-volunteers] insert error:', insertErr);
      return NextResponse.json({ error: 'Could not save your volunteer signup. Please try again later.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: inserted?.id, created_at: inserted?.created_at });
  } catch (err: any) {
    console.error('[ramadan-volunteers] API error:', err?.message || err);
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 });
  }
}

// GET - Fetch volunteers (admin only)
export async function GET(req: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server DB not configured.' }, { status: 501 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get('status') || '';
    const search = url.searchParams.get('search') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');

    let query = supabaseAdmin
      .from('ramadan_volunteers')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,preferred_team.ilike.%${search}%`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('[ramadan-volunteers] GET error:', error);
      return NextResponse.json({ error: 'Failed to fetch volunteers.' }, { status: 500 });
    }

    return NextResponse.json({ data, total: count || 0 });
  } catch (err: any) {
    console.error('[ramadan-volunteers] GET error:', err?.message || err);
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 });
  }
}

// PATCH - Update volunteer status/notes
export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });

    const { id, status, notes } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Missing volunteer ID.' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server DB not configured.' }, { status: 501 });
    }

    const updates: any = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    const { data, error } = await supabaseAdmin
      .from('ramadan_volunteers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[ramadan-volunteers] PATCH error:', error);
      return NextResponse.json({ error: 'Failed to update volunteer.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error('[ramadan-volunteers] PATCH error:', err?.message || err);
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 });
  }
}
