'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import { supabase } from '@/lib/supabaseClient';
import { EVENT_TZ, EventRow, fmtEventWhen } from '@/lib/events';

// Next few events from the community calendar
export default function UpcomingEvents({ limit = 4 }: { limit?: number }) {
  const [events, setEvents] = useState<EventRow[] | null>(null);

  useEffect(() => {
    // Include events that started earlier today
    const from = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
    supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .gte('starts_at', from)
      .order('starts_at', { ascending: true })
      .limit(limit)
      .then(({ data, error }) => setEvents(error ? [] : ((data as EventRow[]) ?? [])));
  }, [limit]);

  return (
    <div className="flex flex-col rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-gray-900">
          <CalendarDaysIcon className="h-6 w-6 text-primary" aria-hidden />
          Upcoming Events
        </h2>
        <Link href="/modules/community/events" className="whitespace-nowrap text-sm font-semibold text-primary hover:underline">
          Full calendar →
        </Link>
      </div>

      <div className="flex-1 p-3">
        {events === null && <p className="p-4 text-sm text-gray-500">Loading…</p>}
        {events?.length === 0 && (
          <p className="p-4 text-sm text-gray-600">
            No upcoming events are posted right now. Check the{' '}
            <Link href="/modules/community/events" className="font-semibold text-primary underline">community calendar</Link>{' '}
            and follow us on social media for announcements.
          </p>
        )}
        <ul className="divide-y divide-gray-100">
          {events?.map((e) => {
            const d = new Date(e.starts_at);
            return (
              <li key={e.id}>
                <Link href={`/modules/community/events/${e.id}`} className="flex gap-4 rounded-xl p-2 transition hover:bg-gray-50">
                  <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-green-50 py-2 text-primary">
                    <span className="text-[11px] font-semibold uppercase">{d.toLocaleDateString('en-US', { month: 'short', timeZone: EVENT_TZ })}</span>
                    <span className="text-2xl font-bold leading-none">{d.toLocaleDateString('en-US', { day: 'numeric', timeZone: EVENT_TZ })}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">{e.title}</p>
                    <p className="text-sm text-gray-600">{fmtEventWhen(e)}</p>
                    {e.donations_enabled && <p className="mt-0.5 text-xs font-medium text-yellow-700">Accepting donations</p>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
