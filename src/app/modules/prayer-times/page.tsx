// File: app/modules/prayer-times/page.tsx

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * ICFC Prayer Times page
 *
 * This implementation uses Masjidal via embeddable iframes so we don't
 * depend on undocumented APIs. You only need to set two env vars:
 *  - NEXT_PUBLIC_MASJIDAL_PRAYER_IFRAME (required)
 *  - NEXT_PUBLIC_MASJIDAL_MONTHLY_IFRAME (optional)
 *
 * Examples (replace with the URLs you copy from your Masjidal dashboard):
 *  NEXT_PUBLIC_MASJIDAL_PRAYER_IFRAME=https://<masjidal-prayer-widget-url>
 *  NEXT_PUBLIC_MASJIDAL_MONTHLY_IFRAME=https://<masjidal-monthly-widget-url>
 *
 * If you only have one URL, the page will gracefully show the one you provide.
 */

const TITLE_FONT = 'font-[var(--font-bebas-neue)]';
const HEADING_FONT = 'font-[var(--font-montserrat)]';
const BODY_FONT = 'font-[var(--font-roboto)]';

const BRAND_GREEN = 'text-[#006400]';
const BRAND_GOLD_BG = 'bg-[#FFD700]';
const BRAND_GREEN_BG = 'bg-[#006400]';

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl shadow-md border border-black/5 bg-white/90 backdrop-blur p-4 md:p-6 ${className}`}>
      {children}
    </div>
  );
}

function Iframe({ src, title }: { src?: string; title: string }) {
  const [height, setHeight] = useState(720);
  const ref = useRef<HTMLIFrameElement | null>(null);

  // Optional: listen for postMessage height events if Masjidal sends them.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (typeof e?.data === 'object' && e?.data && 'iframeHeight' in e.data) {
        const h = Number((e.data as any).iframeHeight);
        if (!Number.isNaN(h) && h > 300 && h < 3000) setHeight(h);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  if (!src) return null;

  return (
    <iframe
      ref={ref}
      title={title}
      src={src}
      loading="lazy"
      style={{ width: '100%', height }}
      className="w-full rounded-xl border border-black/10 shadow-sm"
      referrerPolicy="no-referrer"
      allow="clipboard-write; encrypted-media; fullscreen"
    />
  );
}

export default function PrayerTimesPage() {
  const dailySrc = process.env.NEXT_PUBLIC_MASJIDAL_PRAYER_IFRAME;
  const monthlySrc = process.env.NEXT_PUBLIC_MASJIDAL_MONTHLY_IFRAME;

  const tabs = useMemo(() => {
    const arr: Array<{ key: 'today' | 'month'; label: string; src?: string }> = [];
    if (dailySrc) arr.push({ key: 'today', label: 'Today', src: dailySrc });
    if (monthlySrc) arr.push({ key: 'month', label: 'Month', src: monthlySrc });
    return arr.length ? arr : [{ key: 'today', label: 'Today' }];
  }, [dailySrc, monthlySrc]);

  const [active, setActive] = useState<(typeof tabs)[number]['key']>(tabs[0].key);

  useEffect(() => {
    // ensure active tab remains valid if envs hot-reload in dev
    if (!tabs.find(t => t.key === active)) setActive(tabs[0].key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs.length]);

  const activeSrc = tabs.find(t => t.key === active)?.src;

  return (
    <main className={`${BODY_FONT} min-h-[70vh] py-10 md:py-14 px-4 md:px-6 bg-gradient-to-b from-[#f7f7f7] to-[#eef2f0]`}>
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 md:mb-8 text-center">
          <h1 className={`${TITLE_FONT} ${BRAND_GREEN} text-4xl md:text-5xl tracking-wide`}>Prayer Times</h1>
          <p className="mt-2 text-sm md:text-base text-gray-700 max-w-2xl mx-auto">
            Live prayer and iqāmah times for the Islamic Center of Fort Collins.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mb-5">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`px-4 py-2 rounded-full text-sm md:text-base transition shadow-sm border ${HEADING_FONT} ${
                active === t.key
                  ? `${BRAND_GREEN_BG} text-white border-transparent`
                  : `bg-white text-gray-800 border-gray-200 hover:border-gray-300`
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <SectionCard>
          {activeSrc ? (
            <Iframe src={activeSrc} title={`Masjidal – ${active === 'today' ? 'Today' : 'Monthly'}`} />
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-800 text-lg">
                Please configure your Masjidal widget URL(s) in <code className="px-1 py-0.5 bg-gray-100 rounded">.env.local</code>.
              </p>
              <p className="text-gray-600 mt-2">
                Set <code className="px-1 py-0.5 bg-gray-100 rounded">NEXT_PUBLIC_MASJIDAL_PRAYER_IFRAME</code>
                {" "}and optionally <code className="px-1 py-0.5 bg-gray-100 rounded">NEXT_PUBLIC_MASJIDAL_MONTHLY_IFRAME</code>.
              </p>
            </div>
          )}
        </SectionCard>

        {/* Helpful notes & links */}
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <SectionCard>
            <h2 className={`${HEADING_FONT} text-xl ${BRAND_GREEN} mb-2`}>Notes</h2>
            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
              <li>Timings are managed by ICFC admins in Masjidal. If a time looks off, the dashboard update reflects here automatically.</li>
              <li>For Jumu’ah changes or special announcements, please check the ICFC homepage banner and social channels.</li>
              <li>All times are local to Fort Collins, CO.</li>
            </ul>
          </SectionCard>

          <SectionCard>
            <h2 className={`${HEADING_FONT} text-xl ${BRAND_GREEN} mb-2`}>Quick Actions</h2>
            <div className="flex flex-wrap gap-2 text-sm">
              {dailySrc && (
                <a
                  href={dailySrc}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 bg-white`}
                >
                  Open widget in new tab
                </a>
              )}
              <a
                href="/modules/contact"
                className={`inline-flex items-center px-3 py-2 rounded-lg ${BRAND_GREEN_BG} text-white`}
              >
                Contact ICFC
              </a>
            </div>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}
