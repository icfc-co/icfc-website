// Server-only: email staff when a new request arrives. Recipients are everyone
// whose role can open the matching dashboard (see src/middleware.ts), minus
// anyone who muted that alert in My Profile (staff_alert_prefs).
//
// Mail goes out through the icfc.org Google Workspace account in SMTP_USER
// using an App Password (SMTP_PASS). Without them, alerts are skipped and logged.
import nodemailer, { type Transporter } from 'nodemailer';
import { serviceClient } from '@/lib/auth-user';
import { ALERTS, AlertKey } from '@/lib/staff-alert-kinds';

export type AlertField = [label: string, value: string | number | null | undefined];

// Exact amount (staff match these against the bank statement)
export const usd = (cents: number) =>
  (Number(cents) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.icfc.org').replace(/\/$/, '');

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Header-safe single line (no CR/LF), length-capped
const oneLine = (s: string, max = 150) => s.replace(/[\r\n]+/g, ' ').trim().slice(0, max);

let transport: Transporter | null = null;
function mailer() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS.replace(/\s+/g, '') },
  });
  return transport;
}

function render(title: string, intro: string, fields: AlertField[], url: string, alertLabel: string) {
  const rows = fields
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')
    .map(([k, v]) => [k, String(v).slice(0, 600)] as const);

  const html = `<!doctype html><html><body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827">
<div style="max-width:560px;margin:0 auto;padding:24px 12px">
 <div style="background:#006400;color:#fff;padding:16px 20px;border-radius:12px 12px 0 0">
  <div style="font-size:12px;opacity:.85;letter-spacing:.04em;text-transform:uppercase">ICFC website</div>
  <div style="font-size:19px;font-weight:bold;margin-top:4px">${esc(title)}</div>
 </div>
 <div style="background:#fff;padding:20px;border-radius:0 0 12px 12px">
  <p style="margin:0 0 14px;font-size:14px;line-height:1.5">${esc(intro)}</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
   ${rows.map(([k, v]) => `<tr><td style="padding:6px 8px 6px 0;color:#6b7280;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:6px 0;white-space:pre-wrap">${esc(v)}</td></tr>`).join('')}
  </table>
  <p style="margin:20px 0 4px"><a href="${esc(url)}" style="display:inline-block;background:#006400;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px;font-weight:bold;font-size:14px">Open dashboard</a></p>
 </div>
 <p style="font-size:12px;color:#6b7280;line-height:1.5;margin:14px 4px">
  You get this because your ICFC website role can see “${esc(alertLabel)}”.
  To stop these emails, turn this alert off under <a href="${SITE_URL}/my-profile" style="color:#006400">My Profile → Email alerts</a>.
 </p>
</div></body></html>`;

  const text = `${title}\n\n${intro}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nOpen dashboard: ${url}\n\n` +
    `To stop these emails, turn this alert off under My Profile → Email alerts: ${SITE_URL}/my-profile`;
  return { html, text };
}

/**
 * Email everyone who can see the dashboard for `key`. Never throws: a failed
 * alert must not fail the visitor's submission. Call it inside `after()` so the
 * visitor's response isn't delayed.
 */
export async function sendStaffAlert(key: AlertKey, opts: { title: string; intro: string; fields: AlertField[] }) {
  try {
    const alert = ALERTS[key];
    const mail = mailer();
    if (!mail) {
      console.warn(`[staff-alerts] SMTP_USER/SMTP_PASS not set; skipped "${key}" alert`);
      return;
    }

    const { data, error } = await serviceClient().rpc('staff_alert_recipients', { p_roles: alert.roles, p_alert: key });
    if (error) throw error;
    const recipients = (data ?? []) as { email: string; role: string }[];
    if (!recipients.length) return;

    // One message per dashboard link (admins and volunteers may land on different pages)
    const byPath = new Map<string, Set<string>>();
    for (const r of recipients) {
      const path = alert.path(r.role);
      if (!byPath.has(path)) byPath.set(path, new Set());
      byPath.get(path)!.add(r.email);
    }

    const from = `"${process.env.ALERT_FROM_NAME || 'ICFC Website'}" <${process.env.SMTP_USER}>`;
    const subject = oneLine(`[ICFC] ${opts.title}`);
    await Promise.all([...byPath].map(([path, emails]) => {
      const { html, text } = render(opts.title, opts.intro, opts.fields, SITE_URL + path, alert.label);
      // Bcc keeps staff addresses private from one another
      return mail.sendMail({ from, to: from, bcc: [...emails], subject, html, text });
    }));
  } catch (e) {
    console.error(`[staff-alerts] "${key}" alert failed:`, (e as Error)?.message ?? e);
  }
}
