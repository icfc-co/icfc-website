// Event detail. Rendered on the server so shared links (WhatsApp, Facebook)
// preview the title and poster.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { EventRow, categoryOf, fmtEventWhen, fmtUsd, posterUrl } from '@/lib/events';
import EventActions from './EventActions';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

const anon = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

async function loadEvent(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = anon();
  const { data } = await db.from('events').select('*').eq('id', id).maybeSingle();
  if (!data) return null;
  const event = data as EventRow;
  let raised = 0;
  if (event.donations_enabled) {
    const { data: totals } = await db.rpc('event_donation_totals');
    raised = Number((totals as { event_id: string; total_cents: number }[] | null)?.find((t) => t.event_id === id)?.total_cents ?? 0);
  }
  return { event, raised };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const res = await loadEvent(id);
  if (!res) return { title: 'Event not found | ICFC' };
  const { event } = res;
  const poster = posterUrl(event.poster_path);
  const description = `${fmtEventWhen(event)}${event.location ? ` · ${event.location}` : ''}`;
  return {
    title: `${event.title} | ICFC`,
    description,
    openGraph: { title: event.title, description, ...(poster ? { images: [poster] } : {}) },
  };
}

export default async function EventPage({ params }: Props) {
  const { id } = await params;
  const res = await loadEvent(id);
  if (!res) notFound();
  const { event, raised } = res;

  const poster = posterUrl(event.poster_path);
  const cat = categoryOf(event.category);
  const cancelled = event.status === 'cancelled';
  const goal = event.donation_goal_cents;
  const pct = goal ? Math.min(100, Math.round((raised / goal) * 100)) : 0;

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/modules/community/events" className="text-sm text-[#006400] hover:underline">← All events</Link>

        <div className={`mt-4 grid gap-8 ${poster ? 'md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]' : ''}`}>
          {poster && (
            <a href={poster} target="_blank" rel="noopener noreferrer" className="block" title="Open full-size poster">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={poster} alt={`Poster for ${event.title}`} className="w-full rounded-2xl border border-gray-200 shadow-sm" />
            </a>
          )}

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cat.color}`}>{cat.label}</span>
              {cancelled && <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">Cancelled</span>}
            </div>
            <h1 className={`mt-2 text-3xl font-bold ${cancelled ? 'line-through text-gray-500' : ''}`}>{event.title}</h1>

            <dl className="mt-4 space-y-2 text-gray-800">
              <div className="flex gap-2"><dt className="w-20 shrink-0 font-medium text-gray-500">When</dt><dd>{fmtEventWhen(event)}</dd></div>
              {event.location && (
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 font-medium text-gray-500">Where</dt>
                  <dd>
                    {event.location}{' '}
                    <a
                      className="text-sm text-[#006400] underline"
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Map
                    </a>
                  </dd>
                </div>
              )}
            </dl>

            {cancelled && (
              <p className="mt-4 rounded-xl bg-red-50 p-3 text-red-800">This event has been cancelled.</p>
            )}

            {event.description && <p className="mt-6 whitespace-pre-wrap leading-relaxed text-gray-800">{event.description}</p>}

            {event.donations_enabled && !cancelled && (
              <div className="mt-8 rounded-2xl border border-yellow-300 bg-yellow-50 p-5">
                <h2 className="text-lg font-semibold">Support this event</h2>
                {goal ? (
                  <>
                    <div className="mt-3 h-3 overflow-hidden rounded-full bg-yellow-200" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                      <div className="h-full rounded-full bg-[#006400]" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-2 text-sm text-gray-700">
                      <strong>{fmtUsd(raised)}</strong> raised of {fmtUsd(goal)} goal
                    </p>
                  </>
                ) : (
                  raised > 0 && <p className="mt-1 text-sm text-gray-700"><strong>{fmtUsd(raised)}</strong> raised so far</p>
                )}
                <Link
                  href={`/donate?event=${event.id}`}
                  className="mt-4 inline-flex rounded-xl bg-[#006400] px-5 py-3 font-semibold text-white shadow hover:opacity-90"
                >
                  Donate for this event
                </Link>
                <p className="mt-2 text-xs text-gray-600">Card, Zelle or bank transfer.</p>
              </div>
            )}

            {!cancelled && <EventActions event={event} />}
          </div>
        </div>
      </section>
    </main>
  );
}
