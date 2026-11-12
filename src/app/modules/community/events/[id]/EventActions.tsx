'use client';

import { useState } from 'react';
import { EventRow, googleCalendarUrl, icsFile } from '@/lib/events';

// Add to calendar + share
export default function EventActions({ event }: { event: EventRow }) {
  const [copied, setCopied] = useState(false);
  const pageUrl = () => window.location.href.split('?')[0];

  const downloadIcs = () => {
    const blob = new Blob([icsFile(event, pageUrl())], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${event.title.replace(/[^\w-]+/g, '-').slice(0, 60) || 'event'}.ics`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const share = async () => {
    const url = pageUrl();
    if (navigator.share) {
      try { await navigator.share({ title: event.title, url }); } catch { /* dismissed */ }
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const btn = 'rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50';
  return (
    <div className="mt-8 flex flex-wrap gap-2">
      <button className={btn} onClick={() => window.open(googleCalendarUrl(event, pageUrl()), '_blank', 'noopener')}>
        Add to Google Calendar
      </button>
      <button className={btn} onClick={downloadIcs}>Add to Apple / Outlook</button>
      <button className={btn} onClick={share}>{copied ? 'Link copied ✓' : 'Share'}</button>
    </div>
  );
}
