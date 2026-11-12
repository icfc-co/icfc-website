// Shared prayer-time types and helpers. Times are Fort Collins wall-clock "HH:MM" (24h).

export const PRAYERS = [
  { key: 'fajr', label: 'Fajr', arabic: 'الفجر' },
  { key: 'sunrise', label: 'Sunrise', arabic: 'الشروق' },
  { key: 'dhuhr', label: 'Dhuhr', arabic: 'الظهر' },
  { key: 'asr', label: 'Asr', arabic: 'العصر' },
  { key: 'maghrib', label: 'Maghrib', arabic: 'المغرب' },
  { key: 'isha', label: 'Isha', arabic: 'العشاء' },
] as const;

export type PrayerKey = (typeof PRAYERS)[number]['key'];

export type PrayerDay = {
  date: string; // YYYY-MM-DD
  weekday: string;
  hijri: string | null; // "Jumada Al-Thani 2, 1448"
  adhan: Record<PrayerKey, string | null>;
  iqamah: Partial<Record<Exclude<PrayerKey, 'sunrise'>, string | null>>;
  jumuah: string[];
};

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** "Thursday, Nov 12, 2026" -> "2026-11-12" */
export function parseMasjidalDate(s: string): string | null {
  const m = /([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/.exec(s);
  if (!m) return null;
  const mo = MONTHS[m[1].toLowerCase()];
  if (!mo) return null;
  return `${m[3]}-${String(mo).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
}

/** "5:25AM" / "12:10 PM" -> "05:25" / "12:10" */
export function to24(s: string | null | undefined): string | null {
  const m = /^\s*(\d{1,2}):(\d{2})\s*([AaPp])\.?[Mm]?\.?\s*$/.exec(s ?? '');
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (m[3].toLowerCase() === 'p') h += 12;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

/** "17:05" -> "5:05 PM" */
export function fmt12(t: string | null | undefined) {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export const minutesOf = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
