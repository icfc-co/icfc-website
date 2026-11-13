'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AUDIENCES, Announcement, Audience, DeliveryStats, fmtPosted, isLive } from '@/lib/announcements';
import { isoToZonedInput, zonedInputToIso } from '@/lib/events';

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) }, cache: 'no-store' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
  return json as T;
}

const input = 'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#006400] focus:outline-none';
const label = 'block text-sm font-medium text-gray-800';

type Form = {
  id: string | null;
  title: string;
  body: string;
  audience: Audience;
  important: boolean;
  published: boolean;
  expires: string; // YYYY-MM-DD (Fort Collins), '' = never
  send_email: boolean;
  locked_audience: boolean;
};

const emptyForm = (): Form => ({
  id: null, title: '', body: '', audience: 'members', important: false, published: true, expires: '', send_email: true, locked_audience: false,
});

const toForm = (a: Announcement): Form => ({
  id: a.id, title: a.title, body: a.body, audience: a.audience, important: a.important, published: a.published,
  expires: a.expires_at ? isoToZonedInput(a.expires_at).slice(0, 10) : '', send_email: false, locked_audience: a.email_requested,
});

type ListResp = {
  data: Announcement[];
  stats: Record<string, DeliveryStats>;
  reach: { members: number; unsubscribed: number };
  emailReady: boolean;
};

export default function AnnouncementsManager() {
  const [list, setList] = useState<ListResp | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [sending, setSending] = useState<{ id: string; stats: DeliveryStats; paused?: string } | null>(null);
  const stopRef = useRef(false);
  const formRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      setList(await api<ListResp>('/api/admin/announcements'));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  };
  useEffect(() => { load(); }, []);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((p) => (p ? { ...p, [k]: v } : p));
  const open = (f: Form) => {
    setForm(f);
    setNotice('');
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const reach = list?.reach;
  const emailCount = reach ? (form?.important ? reach.members : reach.members - reach.unsubscribed) : 0;
  const payload = (f: Form) => ({
    title: f.title, body: f.body, audience: f.audience, important: f.important, published: f.published,
    expires_at: f.expires ? zonedInputToIso(`${f.expires}T23:59`) : null,
  });

  // Send queued emails in batches until done (or paused / stopped)
  const runSend = async (id: string, retryFailed = false) => {
    stopRef.current = false;
    let first = true;
    for (;;) {
      if (stopRef.current) break;
      let r: { stats: DeliveryStats; stalled: boolean; lastError: string | null };
      try {
        r = await api(`/api/admin/announcements/${id}/send`, { method: 'POST', body: JSON.stringify({ retryFailed: first && retryFailed }) });
      } catch (e) {
        setSending((s) => (s ? { ...s, paused: (e as Error).message } : s));
        break;
      }
      first = false;
      setSending({ id, stats: r.stats });
      if (r.stats.pending === 0) break;
      if (r.stalled) {
        setSending({ id, stats: r.stats, paused: r.lastError || 'Emails could not be sent right now.' });
        break;
      }
    }
    await load();
  };

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form) return;
    const emailing = !form.id && form.audience === 'members' && form.send_email;
    if (emailing && !window.confirm(`Publish and email this announcement to ${emailCount} member${emailCount === 1 ? '' : 's'}? Emails can’t be recalled once sent.`)) return;

    setBusy('save');
    try {
      if (form.id) {
        await api(`/api/admin/announcements/${form.id}`, { method: 'PATCH', body: JSON.stringify(payload(form)) });
        setNotice('Announcement updated.');
        setForm(null);
        await load();
      } else {
        const r = await api<{ data: Announcement; queued: number; warning?: string }>('/api/admin/announcements', {
          method: 'POST', body: JSON.stringify({ ...payload(form), send_email: emailing }),
        });
        setForm(null);
        setNotice(r.warning ?? (form.audience === 'public' ? 'Published on the home page.' : 'Published for members.'));
        await load();
        if (r.queued > 0) {
          setSending({ id: r.data.id, stats: { total: r.queued, sent: 0, failed: 0, pending: r.queued } });
          await runSend(r.data.id);
        }
      }
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy('');
    }
  };

  const sendTest = async () => {
    if (!form) return;
    setBusy('test');
    try {
      const r = await api<{ to: string }>('/api/admin/announcements/test', { method: 'POST', body: JSON.stringify(payload(form)) });
      alert(`Test email sent to ${r.to}.`);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy('');
    }
  };

  const patch = async (a: Announcement, p: Partial<Announcement>) => {
    try {
      await api(`/api/admin/announcements/${a.id}`, { method: 'PATCH', body: JSON.stringify(p) });
      await load();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const remove = async (a: Announcement) => {
    const st = list?.stats[a.id];
    const extra = st?.pending ? ` ${st.pending} email${st.pending === 1 ? '' : 's'} not yet sent will be cancelled.` : '';
    if (!window.confirm(`Delete "${a.title}"? It disappears from the website.${extra} Emails already sent can’t be recalled. To just hide it, use Hide instead.`)) return;
    try {
      await api(`/api/admin/announcements/${a.id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const now = Date.now();

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 text-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Announcements</h1>
          <p className="text-gray-600">Post to the home page for everyone, or to members (website + email).</p>
        </div>
        <button onClick={() => open(emptyForm())} className="rounded-xl bg-[#006400] px-4 py-2 text-sm font-medium text-white shadow hover:opacity-90">+ New announcement</button>
      </div>

      {notice && <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-900">{notice}</p>}

      {/* Sending progress */}
      {sending && (
        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          {(() => {
            const s = sending.stats;
            const done = s.sent + s.failed;
            const pct = s.total ? Math.round((done / s.total) * 100) : 100;
            const finished = s.pending === 0;
            return (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-semibold">
                    {finished ? 'Emails sent' : sending.paused ? 'Sending paused' : 'Sending emails… keep this page open'}
                  </span>
                  <span className="text-gray-600">{s.sent} sent{s.failed ? ` · ${s.failed} failed` : ''} of {s.total}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-[#006400] transition-all" style={{ width: `${pct}%` }} />
                </div>
                {sending.paused && (
                  <p className="mt-2 text-sm text-amber-800">
                    {sending.paused} The remaining {s.pending} will wait; use “Resume sending” on the announcement later (Gmail allows about 2,000 recipients a day).
                  </p>
                )}
                <div className="mt-2 flex gap-2">
                  {!finished && !sending.paused && (
                    <button onClick={() => { stopRef.current = true; setSending((x) => x && { ...x, paused: 'Stopped.' }); }} className="rounded-lg border border-gray-300 px-3 py-1 text-sm">Pause</button>
                  )}
                  {(finished || sending.paused) && (
                    <button onClick={() => setSending(null)} className="rounded-lg border border-gray-300 px-3 py-1 text-sm">Close</button>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Composer */}
      {form && (
        <div ref={formRef} className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">{form.id ? 'Edit announcement' : 'New announcement'}</h2>
          <form onSubmit={save} className="mt-4 space-y-5">
            <div>
              <span className={label}>Who is it for?</span>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {AUDIENCES.map((o) => (
                  <label key={o.value} className={`rounded-xl border p-3 text-sm ${form.locked_audience && form.audience !== o.value ? 'opacity-50' : 'cursor-pointer'} ${form.audience === o.value ? 'border-[#006400] bg-green-50' : 'border-gray-200'}`}>
                    <span className="flex items-center gap-2 font-semibold">
                      <input type="radio" name="audience" className="accent-[#006400]" checked={form.audience === o.value}
                        disabled={form.locked_audience} onChange={() => set('audience', o.value)} />
                      {o.label}
                    </span>
                    <span className="mt-1 block text-gray-600">{o.help}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className={label} htmlFor="title">Title *</label>
              <input id="title" className={input} required maxLength={200} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Eid prayer timings" />
            </div>

            <div>
              <label className={label} htmlFor="body">Message *</label>
              <textarea id="body" className={input} required rows={8} maxLength={10000} value={form.body} onChange={(e) => set('body', e.target.value)}
                placeholder={'Write the announcement. Leave a blank line between paragraphs. Links like https://www.icfc.org/donate become clickable.'} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="exp">Show on the website until <span className="font-normal text-gray-500">(optional)</span></label>
                <input id="exp" type="date" className={input} value={form.expires} onChange={(e) => set('expires', e.target.value)} />
                <p className="mt-1 text-xs text-gray-500">Hidden automatically after this day. Leave empty to keep it up.</p>
              </div>
              <div className="flex flex-col justify-center gap-2 text-sm">
                <label className="flex items-start gap-2">
                  <input type="checkbox" className="mt-0.5 accent-[#006400]" checked={form.important} onChange={(e) => set('important', e.target.checked)} />
                  <span>
                    <strong>Important</strong> — highlighted on the website
                    {form.audience === 'members' && ', and emailed even to members who unsubscribed. Use only for closures, emergencies and similar.'}
                  </span>
                </label>
                {form.id && (
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="accent-[#006400]" checked={form.published} onChange={(e) => set('published', e.target.checked)} />
                    Visible on the website
                  </label>
                )}
              </div>
            </div>

            {!form.id && form.audience === 'members' && (
              <div className="rounded-xl bg-yellow-50 p-4 text-sm">
                <label className="flex items-start gap-2 font-medium">
                  <input type="checkbox" className="mt-0.5 accent-[#006400]" checked={form.send_email} disabled={!list?.emailReady}
                    onChange={(e) => set('send_email', e.target.checked)} />
                  <span>
                    Also email it to <strong>{emailCount}</strong> active member{emailCount === 1 ? '' : 's'}
                    {reach && !form.important && reach.unsubscribed > 0 && <span className="font-normal text-gray-600"> ({reach.unsubscribed} unsubscribed are skipped)</span>}
                  </span>
                </label>
                {!list?.emailReady && <p className="mt-1 text-red-700">Email isn’t set up on the server yet (SMTP_USER / SMTP_PASS).</p>}
                <p className="mt-2 text-gray-600">Each member gets their own email with an unsubscribe link; replies go to info@icfc.org. Tip: send yourself a test first.</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={!!busy} className="rounded-xl bg-[#006400] px-5 py-2.5 font-medium text-white shadow hover:opacity-90 disabled:opacity-60">
                {busy === 'save' ? 'Saving…'
                  : form.id ? 'Save changes'
                  : form.audience === 'members' && form.send_email ? `Publish & email ${emailCount} members`
                  : 'Publish'}
              </button>
              {list?.emailReady && (
                <button type="button" onClick={sendTest} disabled={!!busy || !form.title.trim() || !form.body.trim()} className="rounded-xl border border-gray-300 px-5 py-2.5 font-medium disabled:opacity-50">
                  {busy === 'test' ? 'Sending…' : 'Send test to me'}
                </button>
              )}
              <button type="button" onClick={() => setForm(null)} className="rounded-xl border border-gray-300 px-5 py-2.5 font-medium">Cancel</button>
            </div>
            {form.id && form.locked_audience && <p className="text-xs text-gray-500">Edits change the website only; emails already sent stay as they were.</p>}
          </form>
        </div>
      )}

      {/* List */}
      <h2 className="mt-8 text-lg font-semibold">All announcements</h2>
      {error && <p className="mt-3 text-red-600">{error}</p>}
      {!list && !error && <p className="mt-3 text-gray-500">Loading…</p>}
      {list && !list.data.length && <p className="mt-3 text-gray-600">No announcements yet.</p>}

      <ul className="mt-3 space-y-3">
        {list?.data.map((a) => {
          const st = list.stats[a.id];
          const live = isLive(a, now);
          const expired = a.published && !!a.expires_at && Date.parse(a.expires_at) <= now;
          const isSending = sending?.id === a.id && sending.stats.pending > 0 && !sending.paused;
          return (
            <li key={a.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{a.title}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${a.audience === 'members' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                  {a.audience === 'members' ? 'Members' : 'Everyone'}
                </span>
                {a.important && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Important</span>}
                {live ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">Live</span>
                  : expired ? <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700">Expired</span>
                  : <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700">Hidden</span>}
              </div>
              <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm text-gray-700">{a.body}</p>
              <p className="mt-1 text-xs text-gray-500">
                {fmtPosted(a.created_at)}{a.created_by_name ? ` by ${a.created_by_name}` : ''}
                {a.expires_at ? ` · ${expired ? 'expired' : 'until'} ${fmtPosted(a.expires_at)}` : ''}
              </p>
              {st && (
                <p className="mt-1 text-sm">
                  Email: <strong>{st.sent}</strong> of {st.total} sent
                  {st.failed > 0 && <span className="text-red-700"> · {st.failed} failed</span>}
                  {st.pending > 0 && <span className="text-amber-700"> · {st.pending} waiting</span>}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => open(toForm(a))} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm">Edit</button>
                <button onClick={() => patch(a, { published: !a.published })} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm">
                  {a.published ? 'Hide' : 'Show'}
                </button>
                {st && st.pending > 0 && !isSending && (
                  <button onClick={() => { setSending({ id: a.id, stats: st }); runSend(a.id); }} className="rounded-lg border border-[#006400] px-3 py-1.5 text-sm font-medium text-[#006400]">
                    Resume sending
                  </button>
                )}
                {st && st.failed > 0 && st.pending === 0 && !isSending && (
                  <button onClick={() => { setSending({ id: a.id, stats: st }); runSend(a.id, true); }} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm">
                    Retry failed
                  </button>
                )}
                {a.audience === 'public' ? (
                  <Link href="/" className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm">View home page</Link>
                ) : null}
                <button onClick={() => remove(a)} className="ml-auto rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700">Delete</button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
