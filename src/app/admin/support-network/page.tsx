'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  api, fmtDate, helpList, StatusBadge, SupportRequest, UrgencyBadge, STATUS_LABELS, errMsg,
} from '@/components/support-network/shared';

export default function SupportNetworkAdmin() {
  const [rows, setRows] = useState<SupportRequest[] | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<string>('active');
  const [q, setQ] = useState('');

  const load = async (query = q) => {
    setError('');
    try {
      const params = new URLSearchParams({ view: 'all' });
      if (query.trim()) params.set('q', query.trim());
      const j = await api<{ data: SupportRequest[] }>(`/api/support-network?${params}`);
      setRows(j.data);
    } catch (e) {
      setError(errMsg(e));
      setRows([]);
    }
  };
  useEffect(() => { load(''); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => {
    const c: Record<string, number> = { open: 0, accepted: 0, completed: 0, cancelled: 0, urgent: 0 };
    rows?.forEach((r) => {
      c[r.status] = (c[r.status] ?? 0) + 1;
      if (r.urgency === 'urgent' && r.status === 'open') c.urgent++;
    });
    return c;
  }, [rows]);

  const shown = useMemo(() => {
    if (!rows) return [];
    const list = rows.filter((r) =>
      status === 'all' ? true : status === 'active' ? r.status === 'open' || r.status === 'accepted' : r.status === status
    );
    // urgent open requests first, then newest
    return [...list].sort((a, b) => {
      const ua = a.status === 'open' && a.urgency === 'urgent' ? 0 : 1;
      const ub = b.status === 'open' && b.urgency === 'urgent' ? 0 : 1;
      return ua - ub || b.created_at.localeCompare(a.created_at);
    });
  }, [rows, status]);

  const exportCsv = () => {
    const cols: [string, (r: SupportRequest) => string][] = [
      ['Posted', (r) => r.created_at],
      ['Status', (r) => r.status],
      ['Urgency', (r) => r.urgency],
      ['For', (r) => r.recipient_name],
      ['Phone', (r) => r.contact_phone ?? ''],
      ['Email', (r) => r.contact_email ?? ''],
      ['Area', (r) => r.area],
      ['Address', (r) => r.address ?? ''],
      ['Help', (r) => helpList(r)],
      ['Needed on', (r) => r.needed_on ?? ''],
      ['Time', (r) => r.time_window ?? ''],
      ['Details', (r) => r.details],
      ['Helper', (r) => r.helper_name ?? ''],
      ['Helper phone', (r) => r.helper_phone ?? ''],
      ['Accepted', (r) => r.accepted_at ?? ''],
      ['Completed', (r) => r.completed_at ?? ''],
      ['Staff notes', (r) => r.staff_notes ?? ''],
    ];
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const csv = [cols.map(([h]) => esc(h)).join(','), ...shown.map((r) => cols.map(([, f]) => esc(f(r))).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `support-network-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Community Support Network</h1>
          <p className="text-gray-600">All member requests, helpers and replies.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/member/support-network" className="rounded-xl border border-[#006400] px-4 py-2 text-sm font-medium text-[#006400]">
            Member view
          </Link>
          <button onClick={exportCsv} disabled={!shown.length}
            className="rounded-xl bg-[#006400] px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            Export CSV
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Urgent & open" value={counts.urgent} tone="text-red-700" />
        <Stat label="Open" value={counts.open} />
        <Stat label="Accepted" value={counts.accepted} />
        <Stat label="Completed" value={counts.completed} tone="text-green-700" />
        <Stat label="Cancelled" value={counts.cancelled} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="active">Open + accepted</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          <option value="all">All</option>
        </select>
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, area, helper, details"
            className="w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <button className="rounded-lg border border-gray-300 px-3 py-2 text-sm">Search</button>
        </form>
      </div>

      {error && <p className="mt-4 text-red-600">{error}</p>}
      {rows === null ? (
        <p className="mt-4 text-gray-500">Loading…</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-3 py-2">Posted</th>
                <th className="px-3 py-2">For</th>
                <th className="px-3 py-2">Help</th>
                <th className="px-3 py-2">Area</th>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Urgency</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Helper</th>
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-500">No requests.</td></tr>
              )}
              {shown.map((r) => (
                <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="whitespace-nowrap px-3 py-2">
                    <Link href={`/member/support-network/${r.id}`} className="text-[#006400] underline">{fmtDate(r.created_at)}</Link>
                  </td>
                  <td className="px-3 py-2">
                    {r.recipient_name}
                    <div className="text-xs text-gray-500">{r.contact_phone}</div>
                  </td>
                  <td className="px-3 py-2">{helpList(r)}</td>
                  <td className="px-3 py-2">{r.area}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {[r.needed_on && fmtDate(r.needed_on), r.time_window].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-3 py-2"><UrgencyBadge urgency={r.urgency} /></td>
                  <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                  <td className="px-3 py-2">
                    {r.helper_name ?? '—'}
                    {r.helper_phone && <div className="text-xs text-gray-500">{r.helper_phone}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, tone = 'text-gray-900' }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className={`text-2xl font-bold ${tone}`}>{value}</div>
      <div className="text-xs text-gray-600">{label}</div>
    </div>
  );
}
