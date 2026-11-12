'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  EVENT_CATEGORIES, EventRow, POSTER_BUCKET, categoryOf, fmtEventWhen, fmtUsd, isoToZonedInput, posterUrl, zonedDayKey,
} from '@/lib/events';

type Totals = Record<string, { succeeded_cents: number; pending_cents: number; gifts: number }>;

type Form = {
  id: string | null;
  title: string;
  category: string;
  all_day: boolean;
  start: string; // Fort Collins wall clock, "YYYY-MM-DDTHH:mm"
  end: string;
  location: string;
  description: string;
  poster_path: string | null;
  status: 'published' | 'draft' | 'cancelled';
  donations_enabled: boolean;
  donation_goal: string;
};

// Same address as the site footer
const DEFAULT_LOCATION = 'ICFC, 925 West Lake Street, Fort Collins, CO 80521';

const emptyForm = (): Form => ({
  id: null, title: '', category: 'community', all_day: false, start: '', end: '',
  location: DEFAULT_LOCATION, description: '', poster_path: null, status: 'published',
  donations_enabled: false, donation_goal: '',
});

const toForm = (e: EventRow, copy = false): Form => ({
  id: copy ? null : e.id,
  title: copy ? `${e.title}` : e.title,
  category: e.category,
  all_day: e.all_day,
  start: copy ? '' : isoToZonedInput(e.starts_at),
  end: copy || !e.ends_at ? '' : isoToZonedInput(e.ends_at),
  location: e.location ?? '',
  description: e.description ?? '',
  poster_path: copy ? null : e.poster_path,
  status: copy ? 'published' : e.status,
  donations_enabled: e.donations_enabled,
  donation_goal: e.donation_goal_cents ? String(e.donation_goal_cents / 100) : '',
});

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) }, cache: 'no-store' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
  return json as T;
}

const input = 'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#006400] focus:outline-none';
const label = 'block text-sm font-medium text-gray-800';

export default function EventsManager() {
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [totals, setTotals] = useState<Totals>({});
  const [error, setError] = useState('');
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const j = await api<{ data: EventRow[]; totals: Totals }>('/api/admin/events');
      setEvents(j.data);
      setTotals(j.totals);
      setError('');
    } catch (e) {
      setError((e as Error).message);
      setEvents([]);
    }
  };
  useEffect(() => { load(); }, []);

  const today = zonedDayKey(new Date().toISOString());
  const list = useMemo(() => {
    const isPast = (e: EventRow) => zonedDayKey(e.ends_at ?? e.starts_at) < today;
    const l = (events ?? []).filter((e) => (showPast ? isPast(e) : !isPast(e)));
    return showPast ? l : [...l].reverse(); // upcoming: soonest first
  }, [events, showPast, today]);

  const open = (f: Form) => {
    setForm(f);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((p) => (p ? { ...p, [k]: v } : p));

  const uploadPoster = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) return alert('Please choose an image under 10 MB.');
    setUploading(true);
    try {
      const { path, token } = await api<{ path: string; token: string }>('/api/admin/events/poster', {
        method: 'POST', body: JSON.stringify({ contentType: file.type }),
      });
      const { error } = await supabase.storage.from(POSTER_BUCKET).uploadToSignedUrl(path, token, file, { contentType: file.type });
      if (error) throw error;
      set('poster_path', path);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      const body = JSON.stringify(form);
      if (form.id) await api(`/api/admin/events/${form.id}`, { method: 'PATCH', body });
      else await api('/api/admin/events', { method: 'POST', body });
      setForm(null);
      await load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (e: EventRow) => {
    if (!window.confirm(`Delete "${e.title}"? This cannot be undone. To keep it visible as cancelled, edit it and set the status to Cancelled instead.`)) return;
    try {
      await api(`/api/admin/events/${e.id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const poster = posterUrl(form?.poster_path);

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 text-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Events Manager</h1>
          <p className="text-gray-600">Events appear on the public calendar as soon as they are published.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/modules/community/events" className="rounded-xl border border-[#006400] px-4 py-2 text-sm font-medium text-[#006400]">View calendar</Link>
          <button onClick={() => open(emptyForm())} className="rounded-xl bg-[#006400] px-4 py-2 text-sm font-medium text-white shadow hover:opacity-90">+ New event</button>
        </div>
      </div>

      {/* Form */}
      {form && (
        <div ref={formRef} className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">{form.id ? 'Edit event' : 'New event'}</h2>
          <form onSubmit={save} className="mt-4 space-y-4">
            <div>
              <label className={label} htmlFor="title">Title *</label>
              <input id="title" className={input} required maxLength={200} value={form.title} onChange={(e) => set('title', e.target.value)} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="cat">Category</label>
                <select id="cat" className={input} value={form.category} onChange={(e) => set('category', e.target.value)}>
                  {EVENT_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className={label} htmlFor="status">Status</label>
                <select id="status" className={input} value={form.status} onChange={(e) => set('status', e.target.value as Form['status'])}>
                  <option value="published">Published (visible)</option>
                  <option value="draft">Draft (hidden)</option>
                  <option value="cancelled">Cancelled (shown as cancelled)</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.all_day} onChange={(e) => {
                const allDay = e.target.checked;
                setForm((p) => p && ({ ...p, all_day: allDay, start: p.start.slice(0, 10) + (allDay ? '' : p.start.length > 10 ? p.start.slice(10) : ''), end: p.end ? p.end.slice(0, 10) + (allDay ? '' : p.end.slice(10)) : '' }));
              }} />
              All-day event
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="start">Starts * <span className="font-normal text-gray-500">(Fort Collins time)</span></label>
                <input id="start" required className={input} type={form.all_day ? 'date' : 'datetime-local'}
                  value={form.all_day ? form.start.slice(0, 10) : form.start} onChange={(e) => set('start', e.target.value)} />
              </div>
              <div>
                <label className={label} htmlFor="end">Ends <span className="font-normal text-gray-500">(optional)</span></label>
                <input id="end" className={input} type={form.all_day ? 'date' : 'datetime-local'} min={form.all_day ? form.start.slice(0, 10) : form.start}
                  value={form.all_day ? form.end.slice(0, 10) : form.end} onChange={(e) => set('end', e.target.value)} />
              </div>
            </div>

            <div>
              <label className={label} htmlFor="loc">Location</label>
              <input id="loc" className={input} maxLength={300} value={form.location} onChange={(e) => set('location', e.target.value)} />
            </div>

            <div>
              <label className={label} htmlFor="desc">Description</label>
              <textarea id="desc" className={input} rows={6} maxLength={5000} value={form.description} onChange={(e) => set('description', e.target.value)}
                placeholder="What is the event about? Speaker, program details, what to bring, who it's for…" />
            </div>

            <div>
              <span className={label}>Poster <span className="font-normal text-gray-500">(optional)</span></span>
              <div className="mt-2 flex flex-wrap items-start gap-4">
                {poster && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={poster} alt="Poster preview" className="h-40 rounded-lg border border-gray-200 object-contain" />
                )}
                <div className="flex flex-col gap-2">
                  <label className="inline-flex cursor-pointer items-center rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50">
                    {uploading ? 'Uploading…' : poster ? 'Replace poster' : 'Upload poster'}
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" disabled={uploading}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPoster(f); e.target.value = ''; }} />
                  </label>
                  {poster && (
                    <button type="button" className="text-left text-sm text-red-700 underline" onClick={() => set('poster_path', null)}>Remove poster</button>
                  )}
                  <span className="text-xs text-gray-500">JPG, PNG, WebP or GIF, up to 10 MB.</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-yellow-50 p-4">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={form.donations_enabled} onChange={(e) => set('donations_enabled', e.target.checked)} />
                Accept donations for this event
              </label>
              {form.donations_enabled && (
                <div className="mt-3 max-w-xs">
                  <label className={label} htmlFor="goal">Fundraising goal in $ <span className="font-normal text-gray-500">(optional)</span></label>
                  <input id="goal" type="number" min={1} step={1} className={input} value={form.donation_goal}
                    onChange={(e) => set('donation_goal', e.target.value)} placeholder="e.g. 2000" />
                  <p className="mt-1 text-xs text-gray-600">With a goal, the event page shows a progress bar.</p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button type="submit" disabled={saving || uploading} className="rounded-xl bg-[#006400] px-5 py-2.5 font-medium text-white shadow hover:opacity-90 disabled:opacity-60">
                {saving ? 'Saving…' : form.id ? 'Save changes' : 'Publish event'}
              </button>
              <button type="button" onClick={() => setForm(null)} className="rounded-xl border border-gray-300 px-5 py-2.5 font-medium">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{showPast ? 'Past events' : 'Upcoming events'}</h2>
        <button onClick={() => setShowPast((p) => !p)} className="text-sm text-[#006400] underline">
          {showPast ? 'Show upcoming' : 'Show past events'}
        </button>
      </div>
      {error && <p className="mt-3 text-red-600">{error}</p>}
      {events === null && <p className="mt-3 text-gray-500">Loading…</p>}
      {events !== null && list.length === 0 && !error && <p className="mt-3 text-gray-600">No {showPast ? 'past' : 'upcoming'} events.</p>}

      <ul className="mt-3 space-y-3">
        {list.map((e) => {
          const t = totals[e.id];
          const thumb = posterUrl(e.poster_path);
          return (
            <li key={e.id} className="flex flex-wrap gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb} alt="" className="h-20 w-16 rounded-lg object-cover" />
              ) : (
                <div className="flex h-20 w-16 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">No poster</div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{e.title}</span>
                  {e.status !== 'published' && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${e.status === 'draft' ? 'bg-gray-200 text-gray-700' : 'bg-red-100 text-red-700'}`}>
                      {e.status === 'draft' ? 'Draft' : 'Cancelled'}
                    </span>
                  )}
                  <span className={`rounded-full px-2 py-0.5 text-xs ${categoryOf(e.category).color}`}>{categoryOf(e.category).label}</span>
                </div>
                <p className="text-sm text-gray-600">{fmtEventWhen(e)}</p>
                {e.location && <p className="text-sm text-gray-600">{e.location}</p>}
                {e.donations_enabled && (
                  <p className="mt-1 text-sm">
                    <strong>{fmtUsd(t?.succeeded_cents ?? 0)}</strong> raised from {t?.gifts ?? 0} gift{t?.gifts === 1 ? '' : 's'}
                    {e.donation_goal_cents ? ` of ${fmtUsd(e.donation_goal_cents)}` : ''}
                    {t?.pending_cents ? <span className="text-gray-500"> · {fmtUsd(t.pending_cents)} pending (Zelle/bank)</span> : null}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-start gap-2">
                <Link href={`/modules/community/events/${e.id}`} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm">View</Link>
                <button onClick={() => open(toForm(e))} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm">Edit</button>
                <button onClick={() => open(toForm(e, true))} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm" title="Copy into a new event, e.g. for a weekly program">Duplicate</button>
                <button onClick={() => remove(e)} className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700">Delete</button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
