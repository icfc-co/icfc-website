// /src/app/modules/community/events/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  EVENT_CATEGORIES, EVENT_TZ, EventRow, categoryOf, fmtEventTime, fmtEventWhen, posterUrl, zonedDayKey,
} from '@/lib/events';

type View = 'upcoming' | 'month';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const todayKey = () => zonedDayKey(new Date().toISOString());
const monthLabel = (y: number, m: number) =>
  new Date(Date.UTC(y, m, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

// All Fort Collins day keys an event covers (multi-day events show on each day)
function eventDays(e: EventRow) {
  const first = zonedDayKey(e.starts_at);
  const last = e.ends_at ? zonedDayKey(e.ends_at) : first;
  const days: string[] = [];
  const d = new Date(first + 'T00:00:00Z');
  for (let i = 0; i < 62; i++) {
    const k = d.toISOString().slice(0, 10);
    days.push(k);
    if (k >= last) break;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return days;
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [view, setView] = useState<View>('month');
  const [category, setCategory] = useState<string>('all');
  const [showPast, setShowPast] = useState(false);
  const [{ y, m }, setMonth] = useState(() => {
    const k = todayKey();
    return { y: +k.slice(0, 4), m: +k.slice(5, 7) - 1 };
  });
  const [selectedDay, setSelectedDay] = useState<string>(todayKey());

  useEffect(() => {
    // A year back and two years ahead covers the calendar and past events
    const from = new Date(Date.now() - 365 * 864e5).toISOString();
    const to = new Date(Date.now() + 730 * 864e5).toISOString();
    supabase
      .from('events')
      .select('*')
      .gte('starts_at', from)
      .lte('starts_at', to)
      .order('starts_at', { ascending: true })
      .then(({ data }) => setEvents((data as EventRow[]) ?? []));
  }, []);

  const filtered = useMemo(
    () => (events ?? []).filter((e) => category === 'all' || e.category === category),
    [events, category]
  );

  const today = todayKey();
  const upcoming = useMemo(() => {
    const isPast = (e: EventRow) => zonedDayKey(e.ends_at ?? e.starts_at) < today;
    const list = filtered.filter((e) => (showPast ? isPast(e) : !isPast(e)));
    return showPast ? [...list].reverse() : list;
  }, [filtered, showPast, today]);

  const byDay = useMemo(() => {
    const map: Record<string, EventRow[]> = {};
    for (const e of filtered) for (const d of eventDays(e)) (map[d] ??= []).push(e);
    return map;
  }, [filtered]);

  // Month grid cells
  const cells = useMemo(() => {
    const first = new Date(Date.UTC(y, m, 1));
    const start = new Date(first);
    start.setUTCDate(1 - first.getUTCDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      return { key: d.toISOString().slice(0, 10), day: d.getUTCDate(), inMonth: d.getUTCMonth() === m };
    }).filter((c, i, all) => !(i >= 35 && !all.slice(35).some((x) => x.inMonth)));
  }, [y, m]);

  const shiftMonth = (delta: number) =>
    setMonth(({ y, m }) => {
      const d = new Date(Date.UTC(y, m + delta, 1));
      return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
    });

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <section className="mx-auto max-w-6xl px-4 pb-6 pt-12 sm:px-6 lg:px-8">
        <h1
          className="text-center font-[var(--font-bebas,inherit)] text-5xl tracking-wide sm:text-6xl"
          style={{ color: '#FFD700' }}
        >
          Community Calendar
        </h1>
        <p className="mt-2 text-center text-gray-600">Programs, classes and events at ICFC. Times are Fort Collins time.</p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl border border-gray-200 p-1" role="tablist">
            {(['month', 'upcoming'] as View[]).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium ${view === v ? 'bg-[#006400] text-white' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                {v === 'upcoming' ? 'List' : 'Month'}
              </button>
            ))}
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Filter by category"
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="all">All categories</option>
            {EVENT_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>

        {events === null && <p className="mt-8 text-center text-gray-500">Loading events…</p>}

        {/* LIST VIEW */}
        {events !== null && view === 'upcoming' && (
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{showPast ? 'Past events' : 'Upcoming events'}</h2>
              <button onClick={() => setShowPast((p) => !p)} className="text-sm text-[#006400] underline">
                {showPast ? 'Show upcoming events' : 'Show past events'}
              </button>
            </div>
            {upcoming.length === 0 ? (
              <p className="rounded-2xl bg-gray-50 p-8 text-center text-gray-600">
                {showPast ? 'No past events.' : 'No upcoming events yet. Please check back soon, in shā’ Allāh.'}
              </p>
            ) : (
              <ul className="space-y-4">
                {upcoming.map((e) => <EventCard key={e.id} e={e} />)}
              </ul>
            )}
          </div>
        )}

        {/* MONTH VIEW */}
        {events !== null && view === 'month' && (
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <button onClick={() => shiftMonth(-1)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm" aria-label="Previous month">‹ Prev</button>
              <h2 className="text-lg font-semibold">{monthLabel(y, m)}</h2>
              <button onClick={() => shiftMonth(1)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm" aria-label="Next month">Next ›</button>
            </div>

            <div className="grid grid-cols-7 overflow-hidden rounded-2xl border border-gray-200 text-sm">
              {WEEKDAYS.map((d) => (
                <div key={d} className="border-b border-gray-200 bg-gray-50 py-2 text-center text-xs font-semibold text-gray-600">{d}</div>
              ))}
              {cells.map((c) => {
                const dayEvents = byDay[c.key] ?? [];
                const isToday = c.key === today;
                const isSel = c.key === selectedDay;
                return (
                  <button
                    key={c.key}
                    onClick={() => setSelectedDay(c.key)}
                    className={`min-h-[56px] border-b border-r border-gray-100 p-1 text-left align-top sm:min-h-[96px] sm:p-1.5 ${
                      c.inMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'
                    } ${isSel ? 'ring-2 ring-inset ring-[#006400]' : ''}`}
                  >
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday ? 'bg-[#006400] font-bold text-white' : ''}`}>
                      {c.day}
                    </span>
                    {/* Phones: dots; larger screens: titles */}
                    {dayEvents.length > 0 && (
                      <div className="mt-0.5 flex gap-0.5 sm:hidden">
                        {dayEvents.slice(0, 3).map((e) => <span key={e.id} className="h-1.5 w-1.5 rounded-full bg-[#006400]" />)}
                      </div>
                    )}
                    <div className="hidden space-y-0.5 sm:block">
                      {dayEvents.slice(0, 3).map((e) => (
                        <span key={e.id} className={`block truncate rounded px-1 text-[11px] ${categoryOf(e.category).color} ${e.status === 'cancelled' ? 'line-through opacity-60' : ''}`}>
                          {!e.all_day && zonedDayKey(e.starts_at) === c.key ? `${fmtEventTime(e.starts_at)} ` : ''}{e.title}
                        </span>
                      ))}
                      {dayEvents.length > 3 && <span className="block text-[11px] text-gray-500">+{dayEvents.length - 3} more</span>}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6">
              <h3 className="mb-3 font-semibold">
                {new Date(selectedDay + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })}
              </h3>
              {(byDay[selectedDay] ?? []).length === 0 ? (
                <p className="text-sm text-gray-500">No events on this day.</p>
              ) : (
                <ul className="space-y-4">{(byDay[selectedDay] ?? []).map((e) => <EventCard key={e.id} e={e} />)}</ul>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function EventCard({ e }: { e: EventRow }) {
  const poster = posterUrl(e.poster_path);
  const cat = categoryOf(e.category);
  const day = new Date(e.starts_at);
  return (
    <li>
      <Link
        href={`/modules/community/events/${e.id}`}
        className="flex gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-[#006400] hover:shadow"
      >
        <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-[#006400] py-2 text-white">
          <span className="text-xs uppercase">{day.toLocaleDateString('en-US', { month: 'short', timeZone: EVENT_TZ })}</span>
          <span className="text-2xl font-bold leading-none">{day.toLocaleDateString('en-US', { day: 'numeric', timeZone: EVENT_TZ })}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cat.color}`}>{cat.label}</span>
            {e.status === 'cancelled' && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Cancelled</span>}
            {e.donations_enabled && e.status === 'published' && (
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">Accepting donations</span>
            )}
          </div>
          <h3 className={`mt-1 text-lg font-semibold ${e.status === 'cancelled' ? 'line-through text-gray-500' : ''}`}>{e.title}</h3>
          <p className="text-sm text-gray-600">{fmtEventWhen(e)}</p>
          {e.location && <p className="text-sm text-gray-600">{e.location}</p>}
          {e.description && <p className="mt-1 line-clamp-2 text-sm text-gray-700">{e.description}</p>}
        </div>
        {poster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt="" className="hidden h-24 w-20 shrink-0 rounded-lg object-cover sm:block" loading="lazy" />
        )}
      </Link>
    </li>
  );
}
