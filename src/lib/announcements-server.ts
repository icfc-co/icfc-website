// Server-only: announcement recipients, unsubscribe links and the email itself.
import { createHmac, timingSafeEqual } from 'crypto';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { HouseholdRow, householdsFor, isActive, norm } from '@/lib/membership-access';
import { SITE } from '@/lib/site';
import { SITE_URL, esc } from '@/lib/mailer';
import { Announcement, linkParts } from '@/lib/announcements';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STAFF = ['super_admin', 'admin', 'volunteer'];

/** Every unique email on an active membership (primary contacts and household members). */
export async function activeMemberRecipients(service: SupabaseClient) {
  const households: HouseholdRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await service.from('membership_households').select('*').range(from, from + 999);
    if (error) throw error;
    households.push(...((data ?? []) as HouseholdRow[]));
    if (!data || data.length < 1000) break;
  }
  const active = households.filter(isActive);

  const byEmail = new Map<string, string | null>();
  const add = (email: string | null | undefined, name: string | null | undefined) => {
    const e = norm(email);
    if (EMAIL.test(e) && !byEmail.has(e)) byEmail.set(e, name?.trim() || null);
  };
  for (const h of active) add(h.primary_email, h.primary_name);

  const ids = active.map((h) => h.id);
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await service
      .from('membership_members').select('email, name').in('household_id', ids.slice(i, i + 200));
    if (error) throw error;
    for (const m of (data ?? []) as { email: string | null; name: string | null }[]) add(m.email, m.name);
  }
  return [...byEmail].map(([email, name]) => ({ email, name }));
}

export async function unsubscribedSet(service: SupabaseClient) {
  const { data, error } = await service.from('announcement_unsubscribes').select('email');
  if (error) throw error;
  return new Set(((data ?? []) as { email: string }[]).map((r) => r.email));
}

/** Staff, or anyone on an active membership, may read members-only announcements. */
export async function canSeeMemberAnnouncements(service: SupabaseClient, user: User) {
  const { data } = await service.from('user_roles').select('roles(name)').eq('user_id', user.id);
  const roles = ((data ?? []) as { roles: { name?: string } | { name?: string }[] | null }[])
    .flatMap((r) => (Array.isArray(r.roles) ? r.roles : [r.roles])).map((r) => r?.name);
  if (roles.some((n) => n && STAFF.includes(n))) return true;
  return (await householdsFor(service, user)).some(isActive);
}

/* ---------------------------- unsubscribe links ---------------------------- */

const secret = () => process.env.UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const sign = (email: string) => createHmac('sha256', secret()).update(`unsub:${norm(email)}`).digest('hex').slice(0, 32);

export function verifyUnsubscribe(email: string, token: string) {
  const a = Buffer.from(sign(email));
  const b = Buffer.from(String(token));
  return a.length === b.length && timingSafeEqual(a, b);
}

export const unsubscribeUrl = (email: string) =>
  `${SITE_URL}/unsubscribe?e=${encodeURIComponent(norm(email))}&t=${sign(email)}`;
// Target of Gmail's one-click "Unsubscribe" button (RFC 8058 POST)
export const oneClickUrl = (email: string) =>
  `${SITE_URL}/api/announcements/unsubscribe?e=${encodeURIComponent(norm(email))}&t=${sign(email)}`;

/* --------------------------------- email ---------------------------------- */

function bodyHtml(body: string) {
  return body.split(/\n{2,}/).map((para) => {
    const html = linkParts(para)
      .map((p) => (p.href ? `<a href="${esc(p.href)}" style="color:#006400">${esc(p.text)}</a>` : esc(p.text)))
      .join('')
      .replace(/\n/g, '<br>');
    return `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">${html}</p>`;
  }).join('');
}

export function renderAnnouncement(a: Pick<Announcement, 'title' | 'body' | 'important'>, recipient: { email: string; name?: string | null }) {
  const unsub = unsubscribeUrl(recipient.email);
  const greeting = recipient.name ? `Assalamu alaikum ${recipient.name.split(' ')[0]},` : 'Assalamu alaikum,';
  const html = `<!doctype html><html><body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827">
<div style="max-width:600px;margin:0 auto;padding:24px 12px">
 <div style="background:#006400;color:#fff;padding:18px 22px;border-radius:12px 12px 0 0">
  <div style="font-size:12px;letter-spacing:.05em;text-transform:uppercase;opacity:.85">${esc(SITE.name)}${a.important ? ' · Important' : ''}</div>
  <div style="font-size:21px;font-weight:bold;margin-top:4px">${esc(a.title)}</div>
 </div>
 <div style="background:#fff;padding:22px;border-radius:0 0 12px 12px">
  <p style="margin:0 0 14px;font-size:15px">${esc(greeting)}</p>
  ${bodyHtml(a.body)}
  <p style="margin:18px 0 0;font-size:14px;color:#374151">${esc(SITE.name)}<br>${esc(SITE.address)}, ${esc(SITE.cityLine)} · ${esc(SITE.phone)}</p>
 </div>
 <p style="font-size:12px;color:#6b7280;line-height:1.5;margin:14px 4px">
  You receive this as an ICFC member (${esc(recipient.email)}).
  <a href="${esc(unsub)}" style="color:#6b7280">Unsubscribe from announcements</a>${a.important ? ' — important notices are still sent to all members.' : '.'}
  <br><a href="${SITE_URL}" style="color:#6b7280">${SITE_URL.replace(/^https?:\/\//, '')}</a>
 </p>
</div></body></html>`;

  const text = `${a.title}\n\n${greeting}\n\n${a.body}\n\n${SITE.name}\n${SITE.address}, ${SITE.cityLine} · ${SITE.phone}\n\n` +
    `Unsubscribe from announcements: ${unsub}`;
  return { html, text };
}
