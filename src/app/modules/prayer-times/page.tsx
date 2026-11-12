// File: app/modules/prayer-times/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeftIcon, ChevronRightIcon, PrinterIcon, MapPinIcon, ClockIcon,
} from '@heroicons/react/24/outline';
import { PRAYERS, PrayerDay, PrayerKey, fmt12, minutesOf } from '@/lib/prayer';
import { EVENT_TZ, isoToZonedInput } from '@/lib/events';
import { MAPS, SITE } from '@/lib/site';

type Main = Exclude<PrayerKey, 'sunrise'>;
const MAIN: Main[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const label = (k: PrayerKey) => PRAYERS.find((p) => p.key === k)!.label;

// Fort Collins wall clock
function nowInFortCollins() {
  const now = new Date();
  const local = isoToZonedInput(now.toISOString()); // YYYY-MM-DDTHH:mm
  const sec = Number(new Intl.DateTimeFormat('en-US', { timeZone: EVENT_TZ, second: '2-digit' }).format(now));
  return { date: local.slice(0, 10), seconds: minutesOf(local.slice(11)) * 60 + sec, now };
}

const addDays = (date: string, n: number) => {
  const d = new Date(date + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const monthRange = (y: number, m: number) => {
  const first = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const last = new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10);
  return { first, last };
};
const monthName = (y: number, m: number) =>
  new Date(Date.UTC(y, m, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

async function loadDays(from: string, to: string): Promise<PrayerDay[]> {
  const res = await fetch(`/api/prayer-times?from=${from}&to=${to}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !Array.isArray(json.days)) throw new Error(json?.error || 'Prayer times are unavailable.');
  return json.days;
}

function countdown(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m ${String(s).padStart(2, '0')}s`;
}

export default function PrayerTimesPage() {
  // The clock is browser-only (server and browser times differ, which breaks hydration)
  const [clock, setClock] = useState<ReturnType<typeof nowInFortCollins> | null>(null);
  useEffect(() => {
    setClock(nowInFortCollins());
    const t = setInterval(() => setClock(nowInFortCollins()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!clock) {
    return (
      <main className="min-h-screen bg-gray-50">
        <section className="bg-gradient-to-br from-[#004d00] via-primary to-[#0b7a3b] pb-24 pt-10 text-center text-white">
          <h1 className="font-title text-5xl tracking-wide sm:text-6xl">Prayer Times</h1>
          <p className="mt-2 text-white/85">Islamic Center of Fort Collins · Fort Collins time</p>
        </section>
      </main>
    );
  }
  return <PrayerTimesView clock={clock} />;
}

function PrayerTimesView({ clock }: { clock: ReturnType<typeof nowInFortCollins> }) {
  const [near, setNear] = useState<PrayerDay[] | null>(null); // today + tomorrow
  const [error, setError] = useState('');
  const [{ y, m }, setMonth] = useState(() => ({ y: +clock.date.slice(0, 4), m: +clock.date.slice(5, 7) - 1 }));
  const [monthDays, setMonthDays] = useState<PrayerDay[] | null>(null);

  const today = clock.date;
  useEffect(() => {
    loadDays(today, addDays(today, 1)).then(setNear).catch((e) => setError(e.message));
  }, [today]);

  useEffect(() => {
    const { first, last } = monthRange(y, m);
    setMonthDays(null);
    loadDays(first, last).then(setMonthDays).catch(() => setMonthDays([]));
  }, [y, m]);

  const todayData = near?.find((d) => d.date === today) ?? null;
  const tomorrowData = near?.find((d) => d.date === addDays(today, 1)) ?? null;
  const isFriday = todayData?.weekday?.startsWith('Fri') ?? false;

  // Next prayer: the first one whose iqamah (or adhan) is still ahead
  const next = useMemo(() => {
    if (!todayData) return null;
    const nowSec = clock.seconds;
    for (const k of MAIN) {
      const jumuah = k === 'dhuhr' && isFriday && todayData.jumuah.length > 0;
      const adhan = todayData.adhan[k];
      const iqamah = jumuah ? todayData.jumuah[0] : todayData.iqamah[k] ?? null;
      const end = iqamah ?? adhan;
      if (!end || minutesOf(end) * 60 <= nowSec) continue;
      const beforeAdhan = !!adhan && minutesOf(adhan) * 60 > nowSec;
      return {
        key: k, name: jumuah ? 'Jumu‘ah' : label(k), adhan, iqamah, tomorrow: false,
        phase: beforeAdhan ? 'adhan' : 'iqamah',
        secondsLeft: (beforeAdhan ? minutesOf(adhan!) : minutesOf(end)) * 60 - nowSec,
      };
    }
    if (tomorrowData?.adhan.fajr) {
      return {
        key: 'fajr' as Main, name: 'Fajr', adhan: tomorrowData.adhan.fajr, iqamah: tomorrowData.iqamah.fajr ?? null,
        tomorrow: true, phase: 'adhan',
        secondsLeft: 86400 - nowSec + minutesOf(tomorrowData.adhan.fajr) * 60,
      };
    }
    return null;
  }, [todayData, tomorrowData, clock.seconds, isFriday]);

  const shiftMonth = (d: number) =>
    setMonth(({ y, m }) => {
      const t = new Date(Date.UTC(y, m + d, 1));
      return { y: t.getUTCFullYear(), m: t.getUTCMonth() };
    });

  const dateLabel = clock.now.toLocaleDateString('en-US', { timeZone: EVENT_TZ, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const timeLabel = clock.now.toLocaleTimeString('en-US', { timeZone: EVENT_TZ, hour: 'numeric', minute: '2-digit', second: '2-digit' });

  const dailySrc = process.env.NEXT_PUBLIC_MASJIDAL_PRAYER_IFRAME;
  const monthlySrc = process.env.NEXT_PUBLIC_MASJIDAL_MONTHLY_IFRAME;

  return (
    <main className="min-h-screen bg-gray-50 font-body text-gray-900">
      {/* Print only the monthly timetable */}
      <style>{`@media print {
        body * { visibility: hidden !important; }
        #monthly-timetable, #monthly-timetable * { visibility: visible !important; }
        #monthly-timetable { position: absolute; inset: 0 auto auto 0; width: 100%; box-shadow: none !important; border: 0 !important; }
        #monthly-timetable .no-print { display: none !important; }
      }`}</style>

      {/* Header band */}
      <section className="bg-gradient-to-br from-[#004d00] via-primary to-[#0b7a3b] text-white">
        <div className="mx-auto max-w-6xl px-4 pb-24 pt-10 text-center sm:px-6">
          <h1 className="font-title text-5xl tracking-wide sm:text-6xl">Prayer Times</h1>
          <p className="mt-2 text-white/85">Islamic Center of Fort Collins · Fort Collins time</p>
          <div className="mt-5 inline-flex flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-full bg-white/10 px-5 py-2 text-sm ring-1 ring-white/15">
            <span>{dateLabel}</span>
            {todayData?.hijri && <span className="text-secondary">{todayData.hijri} AH</span>}
            <span className="tabular-nums">{timeLabel}</span>
          </div>
        </div>
      </section>

      <div className="mx-auto -mt-16 max-w-6xl px-4 pb-16 sm:px-6">
        {error ? (
          // Masjidal data unavailable: show the widget instead
          <div className="rounded-3xl bg-white p-4 shadow-lg">
            {dailySrc ? (
              <iframe title="ICFC prayer times" src={dailySrc} className="mx-auto block h-[640px] w-full max-w-[420px] border-0" />
            ) : (
              <p className="p-8 text-center text-gray-600">Prayer times are temporarily unavailable. Please check back soon.</p>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
              {/* Next prayer */}
              <div className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-black/5 sm:p-8">
                <p className="text-sm font-semibold uppercase tracking-wider text-primary">Next prayer{next?.tomorrow ? ' · tomorrow' : ''}</p>
                {next ? (
                  <>
                    <h2 className="mt-2 font-heading text-4xl font-bold">{next.name}</h2>
                    <p className="mt-1 font-[var(--font-arabic)] text-2xl text-gray-500" dir="rtl" lang="ar">
                      {next.name.startsWith('Jumu') ? 'الجمعة' : PRAYERS.find((p) => p.key === next.key)?.arabic}
                    </p>
                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase text-gray-500">{next.name.startsWith('Jumu') ? 'Dhuhr time' : 'Adhan'}</p>
                        <p className="mt-1 text-2xl font-bold tabular-nums">{fmt12(next.adhan)}</p>
                      </div>
                      <div className="rounded-2xl bg-green-50 p-4">
                        <p className="text-xs font-semibold uppercase text-primary">{next.name.startsWith('Jumu') ? 'Khutbah' : 'Iqamah'}</p>
                        <p className="mt-1 text-2xl font-bold tabular-nums text-primary">{fmt12(next.iqamah)}</p>
                      </div>
                    </div>
                    <div className="mt-6 flex items-center gap-3 rounded-2xl bg-primary px-5 py-4 text-white">
                      <ClockIcon className="h-7 w-7 shrink-0 text-secondary" aria-hidden />
                      <p>
                        <span className="block text-sm text-white/80">
                          {next.phase === 'adhan' ? 'Adhan in' : next.name.startsWith('Jumu') ? 'Khutbah in' : 'Iqamah in'}
                        </span>
                        <span className="text-2xl font-bold tabular-nums">{countdown(Math.max(0, next.secondsLeft))}</span>
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="mt-4 h-48 animate-pulse rounded-2xl bg-gray-100" />
                )}
              </div>

              {/* Today */}
              <div className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-black/5 sm:p-8">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-heading text-xl font-bold">Today</h2>
                  <span className="text-sm text-gray-500">{todayData?.weekday}</span>
                </div>
                <table className="mt-4 w-full text-left">
                  <thead>
                    <tr className="text-xs uppercase tracking-wider text-gray-500">
                      <th className="pb-2 font-semibold">Prayer</th>
                      <th className="pb-2 text-right font-semibold">Adhan</th>
                      <th className="pb-2 text-right font-semibold">Iqamah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PRAYERS.map((p) => {
                      const isNext = !next?.tomorrow && next?.key === p.key;
                      const jumuah = p.key === 'dhuhr' && isFriday && (todayData?.jumuah.length ?? 0) > 0;
                      const iq = p.key === 'sunrise' ? null : todayData?.iqamah[p.key as Main];
                      return (
                        <tr key={p.key} className={isNext ? 'bg-secondary/20' : 'border-t border-gray-100'}>
                          <td className={`py-3 pl-2 ${isNext ? 'rounded-l-xl' : ''}`}>
                            <span className="font-semibold">{jumuah ? 'Jumu‘ah' : p.label}</span>
                            {isNext && <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-white">Next</span>}
                          </td>
                          <td className="py-3 text-right tabular-nums text-gray-700">{todayData ? fmt12(todayData.adhan[p.key]) : '…'}</td>
                          <td className={`py-3 pr-2 text-right font-bold tabular-nums text-primary ${isNext ? 'rounded-r-xl' : ''}`}>
                            {p.key === 'sunrise' ? '' : jumuah ? todayData!.jumuah.map(fmt12).join(' · ') : todayData ? fmt12(iq) : '…'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Jumu'ah + visit */}
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
                <h2 className="font-heading text-xl font-bold">Jumu‘ah (Friday Prayer)</h2>
                {(todayData?.jumuah.length ?? 0) > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {todayData!.jumuah.map((t, i) => (
                      <div key={t} className="flex-1 rounded-2xl bg-green-50 p-4 text-center">
                        <p className="text-xs font-semibold uppercase text-primary">
                          {todayData!.jumuah.length > 1 ? `${['First', 'Second', 'Third'][i]} khutbah` : 'Khutbah'}
                        </p>
                        <p className="mt-1 text-2xl font-bold tabular-nums">{fmt12(t)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-gray-600">Jumu‘ah times will appear here.</p>
                )}
                <p className="mt-4 text-sm text-gray-600">
                  For changes to Jumu‘ah or special announcements, please check the{' '}
                  <Link href="/modules/community/events" className="font-semibold text-primary underline">community calendar</Link>.
                </p>
              </div>
              <div className="rounded-3xl bg-primary p-6 text-white shadow-sm">
                <h2 className="font-heading text-xl font-bold">Praying at ICFC</h2>
                <p className="mt-3 text-white/85">
                  {SITE.address}
                  <br />
                  {SITE.cityLine}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <a href={MAPS.directions} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-secondary px-5 py-2 text-sm font-semibold text-gray-900">
                    <MapPinIcon className="h-4 w-4" aria-hidden /> Get directions
                  </a>
                  <Link href="/modules/contact" className="inline-flex items-center rounded-full border border-white/60 px-5 py-2 text-sm font-semibold">
                    Contact ICFC
                  </Link>
                </div>
              </div>
            </div>

            {/* Monthly timetable */}
            <section id="monthly-timetable" className="mt-6 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-heading text-xl font-bold">Monthly Timetable</h2>
                  <p className="text-sm text-gray-500">Islamic Center of Fort Collins · {monthName(y, m)}</p>
                </div>
                <div className="no-print flex items-center gap-2">
                  <button onClick={() => shiftMonth(-1)} className="rounded-full border border-gray-300 p-2 hover:bg-gray-50" aria-label="Previous month">
                    <ChevronLeftIcon className="h-5 w-5" />
                  </button>
                  <span className="min-w-[9rem] text-center font-semibold">{monthName(y, m)}</span>
                  <button onClick={() => shiftMonth(1)} className="rounded-full border border-gray-300 p-2 hover:bg-gray-50" aria-label="Next month">
                    <ChevronRightIcon className="h-5 w-5" />
                  </button>
                  <button onClick={() => window.print()} className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">
                    <PrinterIcon className="h-4 w-4" aria-hidden /> Print
                  </button>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                {monthDays === null ? (
                  <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />
                ) : monthDays.length === 0 ? (
                  monthlySrc ? (
                    <iframe title="ICFC monthly prayer times" src={monthlySrc} className="h-[720px] w-full border-0" />
                  ) : (
                    <p className="p-6 text-center text-gray-600">This month is not available yet.</p>
                  )
                ) : (
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-xs uppercase tracking-wider text-gray-600">
                        <th className="sticky left-0 bg-gray-50 px-3 py-2 text-left">Date</th>
                        <th className="px-3 py-2 text-left">Hijri</th>
                        {PRAYERS.map((p) => <th key={p.key} className="px-3 py-2 text-center">{p.label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {monthDays.map((d) => {
                        const isToday = d.date === today;
                        const friday = d.weekday.startsWith('Fri');
                        return (
                          <tr key={d.date} className={`border-t border-gray-100 ${isToday ? 'bg-secondary/20 font-semibold' : friday ? 'bg-green-50/60' : ''}`}>
                            <td className={`sticky left-0 whitespace-nowrap px-3 py-2 ${isToday ? 'bg-[#fff6c4]' : friday ? 'bg-[#f3faf3]' : 'bg-white'}`}>
                              {Number(d.date.slice(8))} <span className="text-gray-500">{d.weekday.slice(0, 3)}</span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-gray-500">{d.hijri?.replace(/,\s*\d{4}$/, '')}</td>
                            {PRAYERS.map((p) => {
                              const iq = p.key === 'sunrise' ? null : p.key === 'dhuhr' && friday && d.jumuah.length ? d.jumuah[0] : d.iqamah[p.key as Main];
                              return (
                                <td key={p.key} className="whitespace-nowrap px-3 py-2 text-center tabular-nums">
                                  <span className="text-gray-700">{fmt12(d.adhan[p.key])}</span>
                                  {iq && <span className="block text-xs font-semibold text-primary">{fmt12(iq)}</span>}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Top: adhan (start time). <span className="font-semibold text-primary">Green: iqamah</span>; on Fridays, the first Jumu‘ah khutbah.
              </p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
