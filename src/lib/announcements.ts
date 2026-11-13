// Announcement types and display helpers (safe for the browser).

export type Audience = 'public' | 'members';

export type Announcement = {
  id: string;
  created_at: string;
  updated_at: string;
  created_by_name: string | null;
  title: string;
  body: string;
  audience: Audience;
  important: boolean;
  published: boolean;
  expires_at: string | null;
  email_requested: boolean;
  emailed_at: string | null;
};

export type DeliveryStats = { total: number; sent: number; failed: number; pending: number };

export const AUDIENCES: { value: Audience; label: string; help: string }[] = [
  { value: 'public', label: 'Everyone', help: 'Shown on the home page. No email is sent.' },
  { value: 'members', label: 'Members only', help: 'Shown on the member dashboard and My Profile, and emailed to all active members.' },
];

export const isLive = (a: Pick<Announcement, 'published' | 'expires_at'>, now = Date.now()) =>
  a.published && (!a.expires_at || Date.parse(a.expires_at) > now);

export const fmtPosted = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Denver' });

// Split text into plain and link parts so pages can render URLs as links without HTML injection
export function linkParts(text: string): { text: string; href?: string }[] {
  const out: { text: string; href?: string }[] = [];
  const re = /\bhttps?:\/\/[^\s<>()]+[^\s<>().,;:!?'"]/g;
  let last = 0;
  for (let m; (m = re.exec(text)); ) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    out.push({ text: m[0], href: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}
