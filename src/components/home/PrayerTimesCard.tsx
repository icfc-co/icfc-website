import Link from 'next/link';
import { ClockIcon } from '@heroicons/react/24/outline';

// This week's prayer, iqamah and Jumu'ah times from Masjidal (same widget as /modules/prayer-times)
export default function PrayerTimesCard() {
  const src = process.env.NEXT_PUBLIC_MASJIDAL_PRAYER_IFRAME;
  return (
    <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-gray-900">
          <ClockIcon className="h-6 w-6 text-primary" aria-hidden />
          Prayer &amp; Jumu&lsquo;ah Times
        </h2>
        <Link href="/modules/prayer-times" className="whitespace-nowrap text-sm font-semibold text-primary hover:underline">
          Monthly →
        </Link>
      </div>
      {src ? (
        <iframe
          title="ICFC prayer times"
          src={src}
          loading="lazy"
          className="mx-auto block h-[600px] w-full max-w-[400px] border-0"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="p-8 text-center text-gray-600">
          <Link href="/modules/prayer-times" className="font-semibold text-primary underline">View prayer times</Link>
        </div>
      )}
    </div>
  );
}
