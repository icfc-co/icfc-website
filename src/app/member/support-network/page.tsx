'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, RequestCard, SupportRequest } from '@/components/support-network/shared';

const TABS = [
  { key: 'open', label: 'Members needing help', empty: 'No open requests right now. JazakAllahu khayran for checking!' },
  { key: 'mine', label: 'My requests', empty: 'You have not asked for help yet.' },
  { key: 'helping', label: "Requests I'm helping with", empty: 'You have not accepted any requests yet.' },
] as const;
type Tab = (typeof TABS)[number]['key'];

export default function SupportNetworkPage() {
  const [tab, setTab] = useState<Tab>('open');
  const [rows, setRows] = useState<SupportRequest[] | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    if (t && TABS.some((x) => x.key === t)) setTab(t as Tab);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError('');
    api<{ data: SupportRequest[]; me: { isStaff: boolean } }>(`/api/support-network?view=${tab}`)
      .then((j) => { if (!cancelled) { setRows(j.data); setIsStaff(j.me.isStaff); } })
      .catch((e) => { if (!cancelled) { setError(e.message); setRows([]); } });
    return () => { cancelled = true; };
  }, [tab]);

  const current = TABS.find((t) => t.key === tab)!;

  return (
    <section className="mx-auto max-w-4xl px-4 py-6">
      <Link href="/member" className="text-sm text-[#006400] hover:underline">← Member dashboard</Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Community Support Network</h1>
          <p className="mt-1 max-w-2xl text-gray-700">
            Members helping members with rides, groceries, meals, laundry and household chores.
            Ask for help, or lend a hand to someone in our community.
          </p>
        </div>
        <div className="flex gap-2">
          {isStaff && (
            <Link href="/admin/support-network" className="rounded-xl border border-[#006400] px-4 py-2 font-medium text-[#006400]">
              Staff view
            </Link>
          )}
          <Link href="/member/support-network/new" className="rounded-xl bg-[#006400] px-4 py-2 font-medium text-white shadow hover:opacity-90">
            + Request help
          </Link>
        </div>
      </div>

      <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
        This is not an emergency service. In an emergency, call <strong>911</strong>.
      </p>

      <div className="mt-6 flex flex-wrap gap-1 border-b border-gray-200" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => { setTab(t.key); window.history.replaceState(null, '', `?tab=${t.key}`); }}
            className={`-mb-px rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium ${
              tab === t.key ? 'border-[#006400] text-[#006400]' : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {error && <p className="text-red-600">{error}</p>}
        {rows === null && <p className="text-gray-500">Loading…</p>}
        {rows?.length === 0 && !error && <p className="text-gray-600">{current.empty}</p>}
        {rows?.map((r) => <RequestCard key={r.id} r={r} />)}
      </div>
    </section>
  );
}
