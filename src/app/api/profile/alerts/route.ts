import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth-user';
import { ALERTS, AlertKey, alertsForRole } from '@/lib/staff-alert-kinds';

export const dynamic = 'force-dynamic';

async function roleOf(service: SupabaseClient, userId: string) {
  const { data } = await service.from('user_roles').select('roles(name)').eq('user_id', userId);
  const names = ((data ?? []) as { roles: { name?: string } | { name?: string }[] | null }[])
    .flatMap((r) => (Array.isArray(r.roles) ? r.roles : [r.roles]))
    .map((r) => r?.name)
    .filter(Boolean) as string[];
  return ['super_admin', 'admin', 'volunteer'].find((n) => names.includes(n)) ?? null;
}

// GET: the alerts this user's role receives, and which ones they turned off
export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  const { user, service } = auth;

  const keys = alertsForRole(await roleOf(service, user.id));
  if (!keys.length) return NextResponse.json({ alerts: [], email: user.email });

  const { data } = await service.from('staff_alert_prefs').select('muted_alerts').eq('user_id', user.id).maybeSingle();
  const muted = new Set(((data as { muted_alerts: string[] } | null)?.muted_alerts) ?? []);
  return NextResponse.json({
    email: user.email,
    alerts: keys.map((k) => ({ key: k, label: ALERTS[k].label, on: !muted.has(k) })),
  });
}

// PUT { key, on }: turn one alert on or off for the signed-in staff member
export async function PUT(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  const { user, service } = auth;

  const b = await req.json().catch(() => ({}));
  const keys = alertsForRole(await roleOf(service, user.id));
  if (!keys.includes(b.key as AlertKey) || typeof b.on !== 'boolean') {
    return NextResponse.json({ error: 'Invalid alert' }, { status: 400 });
  }

  const { data } = await service.from('staff_alert_prefs').select('muted_alerts').eq('user_id', user.id).maybeSingle();
  const muted = new Set(((data as { muted_alerts: string[] } | null)?.muted_alerts) ?? []);
  if (b.on) muted.delete(b.key); else muted.add(b.key);

  const { error } = await service
    .from('staff_alert_prefs')
    .upsert({ user_id: user.id, muted_alerts: [...muted] }, { onConflict: 'user_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
