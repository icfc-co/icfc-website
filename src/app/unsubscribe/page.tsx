'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { EnvelopeIcon } from '@heroicons/react/24/outline';

// Opened from the link in announcement emails. It asks for a click instead of
// unsubscribing on load, because email security scanners open links automatically.
function Unsubscribe() {
  const sp = useSearchParams();
  const e = sp.get('e') ?? '';
  const t = sp.get('t') ?? '';
  const [state, setState] = useState<'idle' | 'busy' | 'unsubscribed' | 'resubscribed'>('idle');
  const [error, setError] = useState('');

  const send = async (action: 'unsubscribe' | 'resubscribe') => {
    setState('busy');
    setError('');
    const res = await fetch('/api/announcements/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ e, t, action }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setError(j.error || 'Something went wrong.'); setState('idle'); return; }
    setState(action === 'unsubscribe' ? 'unsubscribed' : 'resubscribed');
  };

  if (!e || !t) {
    return <p className="text-gray-700">This link is incomplete. Please use the unsubscribe link from the email you received.</p>;
  }

  return (
    <>
      {state === 'unsubscribed' ? (
        <>
          <p className="text-gray-800">
            <strong>{e}</strong> will no longer receive ICFC announcement emails. Important notices (such as
            closures or emergencies) may still be sent to all members.
          </p>
          <button onClick={() => send('resubscribe')} className="mt-6 rounded-full border border-primary px-5 py-2 text-sm font-semibold text-primary">
            Undo — keep me subscribed
          </button>
        </>
      ) : state === 'resubscribed' ? (
        <p className="text-gray-800">You’re subscribed again. JazakAllahu khairan!</p>
      ) : (
        <>
          <p className="text-gray-800">Stop sending ICFC announcement emails to <strong>{e}</strong>?</p>
          <p className="mt-2 text-sm text-gray-600">You can still read announcements on the website when you sign in.</p>
          <button disabled={state === 'busy'} onClick={() => send('unsubscribe')}
            className="mt-6 rounded-full bg-primary px-6 py-2.5 font-semibold text-white disabled:opacity-60">
            {state === 'busy' ? 'Please wait…' : 'Unsubscribe'}
          </button>
        </>
      )}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </>
  );
}

export default function UnsubscribePage() {
  return (
    <main className="min-h-[60vh] bg-gray-50 px-4 py-16">
      <div className="mx-auto max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
        <EnvelopeIcon className="mx-auto h-12 w-12 text-primary" aria-hidden />
        <h1 className="mt-4 font-heading text-2xl font-bold text-gray-900">Announcement emails</h1>
        <div className="mt-4">
          <Suspense fallback={<p className="text-gray-500">Loading…</p>}>
            <Unsubscribe />
          </Suspense>
        </div>
        <Link href="/" className="mt-8 inline-block text-sm font-semibold text-primary hover:underline">Go to icfc.org</Link>
      </div>
    </main>
  );
}
