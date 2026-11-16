'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { supabase } from '@/lib/supabaseClient';
import {
  EVENT_CATEGORIES, EventRow, POSTER_BUCKET, categoryOf, fmtEventWhen, fmtUsd, isoToZonedInput, posterUrl, zonedDayKey,
} from '@/lib/events';
import { RepeatRule, describeRule, expandDates, nthWeekday, weekdayOf, MAX_OCCURRENCES } from '@/lib/recurrence';

type Totals = Record<string, { succeeded_cents: number; pending_cents: number; gifts: number }>;
type Scope = 'one' | 'following' | 'all';

type RepeatKind = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly_date' | 'monthly_nth' | 'monthly_last';

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
  // new events only
  repeat: RepeatKind;
  weekdays: number[];
  endMode: 'until' | 'count';
  until: string;
  count: string;
  // editing an event in a series
  series_id: string | null;
  repeat_rule: RepeatRule | null;
  scope: Scope;
};

// Same address as the site footer
const DEFAULT_LOCATION = 'ICFC, 925 West Lake Street, Fort Collins, CO 80521';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ORD = ['1st', '2nd', '3rd', '4th', '5th'];

const repeatDefaults = {
  repeat: 'none' as RepeatKind, weekdays: [] as number[], endMode: 'until' as const, until: '', count: '10',
  series_id: null, repeat_rule: null, scope: 'one' as Scope,
};

const emptyForm = (): Form => ({
  id: null, title: '', category: 'community', all_day: false, start: '', end: '',
  location: DEFAULT_LOCATION, description: '', poster_path: null, status: 'published',
  donations_enabled: false, donation_goal: '', ...repeatDefaults,
});

const toForm = (e: EventRow, copy = false): Form => ({
  id: copy ? null : e.id,
  title: e.title,
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
  ...repeatDefaults,
  series_id: copy ? null : e.series_id ?? null,
  repeat_rule: copy ? null : e.repeat_rule ?? null,
});

// The rule for the form's Repeat settings (null = does not repeat / incomplete)
function ruleOf(f: Form): RepeatRule | null {
  if (f.repeat === 'none') return null;
  const end = f.endMode === 'until' ? { until: f.until || null, count: null } : { until: null, count: Number(f.count) || null };
  if (!end.until && !end.count) return null;
  switch (f.repeat) {
    case 'daily': return { freq: 'daily', interval: 1, ...end };
    case 'weekly': return { freq: 'weekly', interval: 1, weekdays: f.weekdays, ...end };
    case 'biweekly': return { freq: 'weekly', interval: 2, weekdays: f.weekdays, ...end };
    case 'monthly_date': return { freq: 'monthly', interval: 1, monthly: 'date', ...end };
    case 'monthly_nth': return { freq: 'monthly', interval: 1, monthly: 'nth', ...end };
    case 'monthly_last': return { freq: 'monthly', interval: 1, monthly: 'last', ...end };
  }
}

const addMonths = (k: string, n: number) => {
  const d = new Date(`${k}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
};
const fmtShort = (k: string) => new Date(`${k}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) }, cache: 'no-store' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
  return json as T;
}

const input = 'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#006400] focus:outline-none';
const label = 'block text-sm font-medium text-gray-800';

function ScopeChoice({ value, onChange, name }: { value: Scope; onChange: (s: Scope) => void; name: string }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      {([['one', 'This event only'], ['following', 'This and following events'], ['all', 'All events in the series']] as const).map(([v, l]) => (
        <label key={v} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${value === v ? 'border-[#006400] bg-green-50' : 'border-gray-200'}`}>
          <input type="radio" name={name} className="accent-[#006400]" checked={value === v} onChange={() => onChange(v)} /> {l}
        </label>
      ))}
    </div>
  );
}

export default function EventsManager() {
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [totals, setTotals] = useState<Totals>({});
  const [error, setError] = useState('');
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [openSeries, setOpenSeries] = useState<Record<string, boolean>>({});
  const [del, setDel] = useState<{ e: EventRow; scope: Scope } | null>(null);
  const [notice, setNotice] = useState('');
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

  // Group occurrences of a series under its first listed date
  const groups = useMemo(() => {
    const out: { head: EventRow; items: EventRow[] }[] = [];
    const bySeries = new Map<string, { head: EventRow; items: EventRow[] }>();
    for (const e of list) {
      if (!e.series_id) { out.push({ head: e, items: [e] }); continue; }
      const g = bySeries.get(e.series_id);
      if (g) g.items.push(e);
      else { const ng = { head: e, items: [e] }; bySeries.set(e.series_id, ng); out.push(ng); }
    }
    return out;
  }, [list]);

  const open = (f: Form) => {
    setForm(f);
    setNotice('');
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

  // Repeat preview for a new event
  const startDay = form?.start.slice(0, 10) ?? '';
  const rule = form && !form.id ? ruleOf(form) : null;
  const preview = rule && /^\d{4}-\d{2}-\d{2}$/.test(startDay) ? expandDates(rule, startDay) : [];
  const nth = /^\d{4}-\d{2}-\d{2}$/.test(startDay) ? nthWeekday(startDay) : null;
  const startWd = nth ? weekdayOf(startDay) : null;

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form) return;
    if (!form.id && form.repeat !== 'none') {
      if (!rule) return alert('Choose when the repeating event ends.');
      if (preview.length < 2) return alert('These repeat settings only give one date. Pick a later end date.');
    }
    setSaving(true);
    try {
      if (form.id) {
        const r = await api<{ updated: number }>(`/api/admin/events/${form.id}`, {
          method: 'PATCH', body: JSON.stringify({ ...form, scope: form.series_id ? form.scope : 'one' }),
        });
        setNotice(r.updated > 1 ? `Updated ${r.updated} events in the series.` : 'Event updated.');
      } else {
        const r = await api<{ created: number }>('/api/admin/events', {
          method: 'POST', body: JSON.stringify({ ...form, repeat: rule }),
        });
        setNotice(r.created > 1 ? `Created ${r.created} events (${describeRule(rule, startDay)}).` : 'Event published.');
      }
      setForm(null);
      await load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const askRemove = (e: EventRow) => {
    if (e.series_id) return setDel({ e, scope: 'one' });
    if (!window.confirm(`Delete "${e.title}"? This cannot be undone. To keep it visible as cancelled, edit it and set the status to Cancelled instead.`)) return;
    doRemove(e, 'one');
  };
  const doRemove = async (e: EventRow, scope: Scope) => {
    try {
      const r = await api<{ deleted: number }>(`/api/admin/events/${e.id}?scope=${scope}`, { method: 'DELETE' });
      setDel(null);
      setNotice(r.deleted > 1 ? `Deleted ${r.deleted} events.` : 'Event deleted.');
      await load();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const poster = posterUrl(form?.poster_path);

  const row = (e: EventRow, compact = false) => {
    const t = totals[e.id];
    const thumb = posterUrl(e.poster_path);
    return (
      <div className={`flex flex-wrap gap-4 ${compact ? 'py-3' : ''}`}>
        {!compact && (thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="h-20 w-16 rounded-lg object-cover" />
        ) : (
          <div className="flex h-20 w-16 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">No poster</div>
        ))}
        <div className="min-w-0 flex-1">
          {!compact && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{e.title}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${categoryOf(e.category).color}`}>{categoryOf(e.category).label}</span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <p className={`text-sm ${compact ? 'font-medium text-gray-800' : 'text-gray-600'} ${e.status === 'cancelled' ? 'line-through' : ''}`}>{fmtEventWhen(e)}</p>
            {e.status !== 'published' && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${e.status === 'draft' ? 'bg-gray-200 text-gray-700' : 'bg-red-100 text-red-700'}`}>
                {e.status === 'draft' ? 'Draft' : 'Cancelled'}
              </span>
            )}
          </div>
          {!compact && e.location && <p className="text-sm text-gray-600">{e.location}</p>}
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
          {!compact && (
            <button onClick={() => open(toForm(e, true))} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm" title="Copy into a new event">Duplicate</button>
          )}
          <button onClick={() => askRemove(e)} className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700">Delete</button>
        </div>
      </div>
    );
  };

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

      {notice && <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-900">{notice}</p>}

      {/* Form */}
      {form && (
        <div ref={formRef} className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">{form.id ? 'Edit event' : 'New event'}</h2>
          {form.id && form.series_id && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
              <ArrowPathIcon className="h-4 w-4" aria-hidden /> Part of a repeating series: {describeRule(form.repeat_rule, form.start.slice(0, 10))}
            </p>
          )}
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
                <label className={label} htmlFor="start">{form.repeat !== 'none' ? 'First date *' : 'Starts *'} <span className="font-normal text-gray-500">(Fort Collins time)</span></label>
                <input id="start" required className={input} type={form.all_day ? 'date' : 'datetime-local'}
                  value={form.all_day ? form.start.slice(0, 10) : form.start} onChange={(e) => set('start', e.target.value)} />
              </div>
              <div>
                <label className={label} htmlFor="end">Ends <span className="font-normal text-gray-500">(optional)</span></label>
                <input id="end" className={input} type={form.all_day ? 'date' : 'datetime-local'} min={form.all_day ? form.start.slice(0, 10) : form.start}
                  value={form.all_day ? form.end.slice(0, 10) : form.end} onChange={(e) => set('end', e.target.value)} />
              </div>
            </div>

            {/* Repeat (new events) */}
            {!form.id && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={label} htmlFor="repeat">Repeat</label>
                    <select id="repeat" className={input} value={form.repeat} disabled={!nth}
                      onChange={(e) => setForm((p) => p && ({
                        ...p, repeat: e.target.value as RepeatKind,
                        until: p.until || (startDay ? addMonths(startDay, 3) : ''),
                      }))}>
                      <option value="none">Does not repeat</option>
                      <option value="daily">Every day</option>
                      <option value="weekly">Weekly{startWd != null ? ` on ${WEEKDAY_NAMES[startWd]}` : ''}</option>
                      <option value="biweekly">Every 2 weeks{startWd != null ? ` on ${WEEKDAY_NAMES[startWd]}` : ''}</option>
                      <option value="monthly_date">Monthly on day {startDay ? Number(startDay.slice(8)) : '…'}</option>
                      {nth && nth.n <= 4 && <option value="monthly_nth">Monthly on the {ORD[nth.n - 1]} {WEEKDAY_NAMES[startWd!]}</option>}
                      {nth?.last && <option value="monthly_last">Monthly on the last {WEEKDAY_NAMES[startWd!]}</option>}
                    </select>
                    {!nth && <p className="mt-1 text-xs text-gray-500">Pick the start date first.</p>}
                  </div>

                  {form.repeat !== 'none' && (
                    <div>
                      <span className={label}>Ends</span>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                        <label className="flex items-center gap-1.5">
                          <input type="radio" name="endMode" className="accent-[#006400]" checked={form.endMode === 'until'} onChange={() => set('endMode', 'until')} /> On
                        </label>
                        <input type="date" className="rounded-lg border border-gray-300 px-2 py-1.5" min={startDay} value={form.until}
                          onChange={(e) => setForm((p) => p && ({ ...p, until: e.target.value, endMode: 'until' }))} />
                        <label className="ml-2 flex items-center gap-1.5">
                          <input type="radio" name="endMode" className="accent-[#006400]" checked={form.endMode === 'count'} onChange={() => set('endMode', 'count')} /> After
                        </label>
                        <input type="number" min={2} max={MAX_OCCURRENCES} className="w-20 rounded-lg border border-gray-300 px-2 py-1.5" value={form.count}
                          onChange={(e) => setForm((p) => p && ({ ...p, count: e.target.value, endMode: 'count' }))} />
                        <span>times</span>
                      </div>
                    </div>
                  )}
                </div>

                {(form.repeat === 'weekly' || form.repeat === 'biweekly') && startWd != null && (
                  <div className="mt-3">
                    <span className={label}>On these days</span>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {DAYS.map((d, i) => {
                        const on = i === startWd || form.weekdays.includes(i);
                        return (
                          <button key={d} type="button" disabled={i === startWd}
                            onClick={() => set('weekdays', on ? form.weekdays.filter((x) => x !== i) : [...form.weekdays, i])}
                            className={`h-9 w-11 rounded-lg border text-sm font-medium ${on ? 'border-[#006400] bg-[#006400] text-white' : 'border-gray-300 bg-white text-gray-700'} ${i === startWd ? 'cursor-default' : ''}`}
                            title={i === startWd ? 'The start date’s day is always included' : undefined}>
                            {d}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {form.repeat !== 'none' && preview.length > 0 && (
                  <p className="mt-3 text-sm text-gray-700">
                    Creates <strong>{preview.length} events</strong>: {preview.slice(0, 4).map(fmtShort).join(', ')}
                    {preview.length > 4 ? ` … ${fmtShort(preview[preview.length - 1])}` : ''}.
                    {preview.length >= MAX_OCCURRENCES && <span className="text-amber-700"> (Limit is {MAX_OCCURRENCES} events; add more later by duplicating.)</span>}
                  </p>
                )}
              </div>
            )}

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
                  <p className="mt-1 text-xs text-gray-600">With a goal, the event page shows a progress bar.{form.repeat !== 'none' ? ' Each date tracks its own donations.' : ''}</p>
                </div>
              )}
            </div>

            {form.id && form.series_id && (
              <div className="rounded-xl border border-gray-200 p-4">
                <span className={label}>Apply these changes to</span>
                <div className="mt-2"><ScopeChoice name="editScope" value={form.scope} onChange={(s) => set('scope', s)} /></div>
                {form.scope !== 'one' && (
                  <p className="mt-2 text-xs text-gray-500">
                    Only what you changed is copied to the other dates. Changing the date or time moves each of them the same way.
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button type="submit" disabled={saving || uploading} className="rounded-xl bg-[#006400] px-5 py-2.5 font-medium text-white shadow hover:opacity-90 disabled:opacity-60">
                {saving ? 'Saving…' : form.id ? 'Save changes' : form.repeat !== 'none' && preview.length > 1 ? `Publish ${preview.length} events` : 'Publish event'}
              </button>
              <button type="button" onClick={() => setForm(null)} className="rounded-xl border border-gray-300 px-5 py-2.5 font-medium">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Delete a series event: choose scope */}
      {del && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDel(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Delete repeating event</h3>
            <p className="mt-1 text-sm text-gray-600">
              “{del.e.title}” on {fmtEventWhen(del.e)}. This cannot be undone; to keep a date visible as cancelled, edit it and set the status to Cancelled instead.
            </p>
            <div className="mt-4"><ScopeChoice name="delScope" value={del.scope} onChange={(s) => setDel({ ...del, scope: s })} /></div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setDel(null)} className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium">Keep</button>
              <button onClick={() => doRemove(del.e, del.scope)} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white">Delete</button>
            </div>
          </div>
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
        {groups.map(({ head, items }) => (
          <li key={head.series_id ?? head.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            {row(head)}
            {head.series_id && (
              <div className="mt-3 border-t border-gray-100 pt-2">
                <button onClick={() => setOpenSeries((s) => ({ ...s, [head.series_id!]: !s[head.series_id!] }))}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[#006400]">
                  <ArrowPathIcon className="h-4 w-4" aria-hidden />
                  {describeRule(head.repeat_rule, zonedDayKey(head.starts_at))} · {items.length} {showPast ? 'past' : 'upcoming'} date{items.length === 1 ? '' : 's'}
                  <span className="text-gray-500">{openSeries[head.series_id] ? '▲' : '▼'}</span>
                </button>
                {openSeries[head.series_id] && (
                  <div className="mt-1 divide-y divide-gray-100">
                    {items.slice(1).map((e) => <div key={e.id}>{row(e, true)}</div>)}
                    {items.length === 1 && <p className="py-2 text-sm text-gray-500">No other {showPast ? 'past' : 'upcoming'} dates.</p>}
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
