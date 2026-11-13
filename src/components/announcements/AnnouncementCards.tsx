'use client';

import { useEffect, useState } from 'react';
import { MegaphoneIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { supabase } from '@/lib/supabaseClient';
import { Announcement, fmtPosted, linkParts } from '@/lib/announcements';

type Item = Pick<Announcement, 'id' | 'created_at' | 'title' | 'body' | 'important'>;

const LONG = 420;

function Body({ text }: { text: string }) {
  return (
    <>
      {linkParts(text).map((p, i) =>
        p.href ? (
          <a key={i} href={p.href} target="_blank" rel="noopener noreferrer" className="break-all font-medium text-primary underline">{p.text}</a>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </>
  );
}

function Card({ a }: { a: Item }) {
  const [open, setOpen] = useState(false);
  const long = a.body.length > LONG;
  const text = long && !open ? `${a.body.slice(0, LONG).trimEnd()}…` : a.body;
  return (
    <article className={`rounded-2xl border p-5 ${a.important ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex flex-wrap items-center gap-2">
        {a.important && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
            <ExclamationTriangleIcon className="h-3.5 w-3.5" aria-hidden /> Important
          </span>
        )}
        <span className="text-xs text-gray-500">{fmtPosted(a.created_at)}</span>
      </div>
      <h3 className="mt-1 font-heading text-lg font-bold text-gray-900">{a.title}</h3>
      <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-gray-700"><Body text={text} /></p>
      {long && (
        <button onClick={() => setOpen((o) => !o)} className="mt-2 text-sm font-semibold text-primary hover:underline">
          {open ? 'Show less' : 'Read more'}
        </button>
      )}
    </article>
  );
}

/**
 * Live announcements. scope="public" for the home page; scope="members" for
 * signed-in active members (renders nothing for everyone else or when empty).
 */
export default function AnnouncementCards({ scope, title, className = '' }: { scope: 'public' | 'members'; title?: string; className?: string }) {
  const [items, setItems] = useState<Item[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const headers: Record<string, string> = {};
      if (scope === 'members') {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return setItems([]);
        headers.Authorization = `Bearer ${session.access_token}`;
      }
      const res = await fetch(`/api/announcements?scope=${scope}`, { headers, cache: 'no-store' }).catch(() => null);
      const j = res?.ok ? await res.json().catch(() => ({})) : {};
      if (!cancelled) setItems((j.data as Item[]) ?? []);
    })();
    return () => { cancelled = true; };
  }, [scope]);

  if (!items?.length) return null;

  return (
    <section className={className} aria-label={title ?? 'Announcements'}>
      <h2 className="flex items-center gap-2 font-heading text-xl font-bold text-gray-900">
        <MegaphoneIcon className="h-6 w-6 text-primary" aria-hidden /> {title ?? 'Announcements'}
      </h2>
      <div className={`mt-4 grid gap-4 ${items.length > 1 ? 'md:grid-cols-2' : ''}`}>
        {items.map((a) => <Card key={a.id} a={a} />)}
      </div>
    </section>
  );
}
