// Server-only: one SMTP connection for all site email (staff alerts, announcements).
// Mail goes out through the icfc.org Google Workspace account in SMTP_USER using
// an App Password (SMTP_PASS). Without them, getMailer() returns null.
import nodemailer, { type Transporter } from 'nodemailer';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.icfc.org').replace(/\/$/, '');

export const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Header-safe single line (no CR/LF), length-capped
export const oneLine = (s: string, max = 150) => s.replace(/[\r\n]+/g, ' ').trim().slice(0, max);

function create(pool: boolean): Transporter | null {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  const port = Number(process.env.SMTP_PORT || 465);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    ...(pool ? { pool: true, maxConnections: 3 } : {}),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS.replace(/\s+/g, '') },
  } as Parameters<typeof nodemailer.createTransport>[0]);
}

// One connection per message; fine for occasional mail like staff alerts
let single: Transporter | null = null;
export function getMailer() {
  single ??= create(false);
  return single;
}

// Pooled connections for sending a batch; call .close() when the batch is done
// (serverless instances freeze between requests, so pools must not outlive one)
export const openMailPool = () => create(true);

export const fromAddress = (name: string) => `"${name.replace(/["\r\n]/g, '')}" <${process.env.SMTP_USER}>`;
