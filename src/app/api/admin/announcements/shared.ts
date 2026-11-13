import type { Audience } from '@/lib/announcements';

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\r\n/g, '\n').trim().slice(0, max) : '');

export type AnnouncementInput = {
  title: string;
  body: string;
  audience: Audience;
  important: boolean;
  published: boolean;
  expires_at: string | null;
};

// Validate the editable fields of an announcement
export function parseAnnouncement(b: Record<string, unknown>):
  { ok: true; value: AnnouncementInput } | { ok: false; error: string } {
  const title = text(b.title, 200);
  const body = text(b.body, 10000);
  const audience = b.audience === 'members' ? 'members' : b.audience === 'public' ? 'public' : null;
  if (!title) return { ok: false, error: 'Please add a title.' };
  if (!body) return { ok: false, error: 'Please write the announcement.' };
  if (!audience) return { ok: false, error: 'Choose who the announcement is for.' };

  let expires_at: string | null = null;
  if (typeof b.expires_at === 'string' && b.expires_at) {
    const t = Date.parse(b.expires_at);
    if (Number.isNaN(t)) return { ok: false, error: 'Invalid expiry date.' };
    expires_at = new Date(t).toISOString();
  }

  return {
    ok: true,
    value: { title, body, audience, important: b.important === true, published: b.published !== false, expires_at },
  };
}
