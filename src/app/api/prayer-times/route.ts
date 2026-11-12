// Prayer and iqamah times from Masjidal (the same data the ICFC admins manage
// for the Masjidal widget), normalized and cached for 15 minutes.
import { NextRequest, NextResponse } from 'next/server';
import { PrayerDay, parseMasjidalDate, to24 } from '@/lib/prayer';

export const revalidate = 900;

function masjidId() {
  if (process.env.MASJIDAL_MASJID_ID) return process.env.MASJIDAL_MASJID_ID;
  const src = process.env.NEXT_PUBLIC_MASJIDAL_PRAYER_IFRAME ?? '';
  return /[?&]masjid_id=([^&]+)/.exec(src)?.[1] ?? null;
}

const isDate = (s: string | null) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

type SalahRow = Record<string, string | undefined>;

export async function GET(req: NextRequest) {
  const id = masjidId();
  if (!id) return NextResponse.json({ error: 'Prayer times are not configured.' }, { status: 503 });

  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  if (!isDate(from) || !isDate(to) || to! < from!) {
    return NextResponse.json({ error: 'Use ?from=YYYY-MM-DD&to=YYYY-MM-DD' }, { status: 400 });
  }
  if ((Date.parse(to!) - Date.parse(from!)) / 864e5 > 62) {
    return NextResponse.json({ error: 'Range too long (max 62 days).' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://masjidal.com/api/v1/time/range?masjid_id=${encodeURIComponent(id)}&from_date=${from}&to_date=${to}`,
      { next: { revalidate: 900 } }
    );
    const json = await res.json();
    if (!res.ok || json?.status !== 'success') throw new Error('Masjidal request failed');

    const salah: SalahRow[] = json.data?.salah ?? [];
    const iqamah: SalahRow[] = json.data?.iqamah ?? [];
    const iqByDate = new Map(iqamah.map((r) => [parseMasjidalDate(r.date ?? ''), r]));

    const days: PrayerDay[] = salah
      .map((s): PrayerDay | null => {
        const date = parseMasjidalDate(s.date ?? '');
        if (!date) return null;
        const iq: SalahRow = iqByDate.get(date) ?? {};
        return {
          date,
          weekday: s.day ?? '',
          hijri: s.hijri_month && s.hijri_date ? `${s.hijri_month} ${s.hijri_date}` : null,
          adhan: {
            fajr: to24(s.fajr), sunrise: to24(s.sunrise), dhuhr: to24(s.zuhr),
            asr: to24(s.asr), maghrib: to24(s.maghrib), isha: to24(s.isha),
          },
          iqamah: {
            fajr: to24(iq.fajr), dhuhr: to24(iq.zuhr), asr: to24(iq.asr),
            maghrib: to24(iq.maghrib), isha: to24(iq.isha),
          },
          jumuah: [iq.jummah1, iq.jummah2, iq.jummah3].map(to24).filter((t): t is string => !!t),
        };
      })
      .filter((d): d is PrayerDay => d !== null);

    return NextResponse.json({ days });
  } catch {
    return NextResponse.json({ error: 'Prayer times are temporarily unavailable.' }, { status: 502 });
  }
}
