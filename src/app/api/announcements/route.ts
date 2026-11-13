import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, serviceClient } from '@/lib/auth-user';
import { canSeeMemberAnnouncements } from '@/lib/announcements-server';

export const dynamic = 'force-dynamic';

const FIELDS = 'id, created_at, updated_at, title, body, audience, important, expires_at';

/**
 * GET ?scope=public   live "Everyone" announcements (home page, no sign-in)
 * GET ?scope=members  live members-only announcements (active members and staff)
 */
export async function GET(req: NextRequest) {
  const scope = new URL(req.url).searchParams.get('scope') === 'members' ? 'members' : 'public';
  const now = new Date().toISOString();

  let service = serviceClient();
  if (scope === 'members') {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
    if (!(await canSeeMemberAnnouncements(auth.service, auth.user))) return NextResponse.json({ data: [], member: false });
    service = auth.service;
  }

  const { data, error } = await service
    .from('announcements')
    .select(FIELDS)
    .eq('audience', scope)
    .eq('published', true)
    .or(`expires_at.is.null,expires_at.gt."${now}"`)
    .order('important', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(scope === 'public' ? 5 : 20);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    { data: data ?? [], member: scope === 'members' ? true : undefined },
    { headers: scope === 'public' ? { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } : { 'Cache-Control': 'no-store' } }
  );
}
