import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-admin';
import { POSTER_BUCKET } from '@/lib/events';

export const dynamic = 'force-dynamic';

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

// POST { contentType } -> a one-time signed upload URL; the browser uploads the
// poster straight to storage (keeps large phone photos off this server).
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { contentType } = await req.json().catch(() => ({} as { contentType?: string }));
  const ext = EXT[String(contentType)];
  if (!ext) return NextResponse.json({ error: 'Please choose a JPG, PNG, WebP or GIF image.' }, { status: 400 });

  const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await auth.service.storage.from(POSTER_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Could not start upload' }, { status: 500 });

  return NextResponse.json({ path: data.path, token: data.token });
}
