'use client';

import { useEffect, useMemo, useState } from 'react';

/* ==================== types ==================== */
type Donation = {
  id: string;
  donor_name: string | null;
  donor_email: string | null;
  method: 'stripe' | 'zelle' | 'bank';
  status: 'pending' | 'succeeded' | 'failed' | 'refunded' | 'needs_review';
  amount_cents: number;
  currency: string;
  fund: string;
  recurrence: 'one_time' | 'monthly';
  external_ref: string | null;
  created_at: string;
  zelle_proof?: string | null;
  zelle_transfer_date?: string | null;
  bank_transaction_id?: string | null;
  bank_transfer_date?: string | null;
  bank_proof?: string | null;
};

type SummaryItem = { method: string; total_cents: number };
type SummaryResponse = {
  byMethod: SummaryItem[];
  byFund: { fund: string; total_cents: number }[];
};

const METHODS = ['all','stripe','zelle','bank'] as const;
const STATUSES = ['all','pending','succeeded','failed','refunded','needs_review'] as const;

const STATUS_STYLES: Record<Donation['status'], string> = {
  pending: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  succeeded: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  failed: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  refunded: 'bg-slate-50 text-slate-700 ring-1 ring-slate-200',
  needs_review: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
};

const METHOD_STYLES: Record<Donation['method'], string> = {
  stripe: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  zelle: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  bank: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200',
};

/* ==================== helpers ==================== */
const fmtUsd = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const cls = (...parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(' ');

/* ==================== page ==================== */
export default function AdminDonations() {
  // data
  const [rows, setRows] = useState<Donation[]>([]);
  const [count, setCount] = useState(0);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);

  // ui
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  const [method, setMethod] = useState<(typeof METHODS)[number]>('all');
  const [status, setStatusFilter] = useState<(typeof STATUSES)[number]>('all');
  const [fund, setFund] = useState('all');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [sort, setSort] = useState<'date_desc'|'date_asc'|'amount_desc'|'amount_asc'>('date_desc');

  // build querystring (shared by list + summary + csv)
  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (method !== 'all') p.set('method', method);
    if (status !== 'all') p.set('status', status);
    if (fund !== 'all') p.set('fund', fund);
    if (q) p.set('q', q);
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    p.set('page', String(page));
    p.set('pageSize', String(pageSize));
    return p.toString();
  }, [method, status, fund, q, from, to, page, pageSize]);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/donations?${qs}`, { cache: 'no-store' });
    const json = await res.json();
    setLoading(false);
    if (res.ok) { setRows(json.data || []); setCount(json.count || 0); }
    else alert(json.error || 'Failed to load donations');
  }

  async function loadSummary() {
    const res = await fetch(`/api/admin/donations/summary?${qs}`, { cache: 'no-store' });
    if (!res.ok) return setSummary(null);
    const json: SummaryResponse = await res.json();
    setSummary(json);
  }

  function exportCsv() {
    window.location.href = `/api/admin/donations?${qs}&format=csv`;
  }

  async function updateStatus(id: string, newStatus: Donation['status']) {
    const ok = confirm(`Change status to "${newStatus}"?`);
    if (!ok) return;
    const res = await fetch(`/api/admin/donations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const json = await res.json();
    if (!res.ok) return alert(json.error || 'Update failed');
    load();
  }

  // client-side sort for the current page of results
  const displayRows = useMemo(() => {
    const r = [...rows];
    switch (sort) {
      case 'date_asc': r.sort((a,b)=>+new Date(a.created_at) - +new Date(b.created_at)); break;
      case 'date_desc': r.sort((a,b)=>+new Date(b.created_at) - +new Date(a.created_at)); break;
      case 'amount_asc': r.sort((a,b)=>a.amount_cents - b.amount_cents); break;
      case 'amount_desc': r.sort((a,b)=>b.amount_cents - a.amount_cents); break;
    }
    return r;
  }, [rows, sort]);

  // page totals (for currently loaded page)
  const pageTotals = useMemo(() => {
    const sum = displayRows.reduce((acc, r) => acc + (r.amount_cents || 0), 0);
    const byMethod: Record<string, number> = {};
    for (const r of displayRows) byMethod[r.method] = (byMethod[r.method] || 0) + r.amount_cents;
    return { sum, byMethod };
  }, [displayRows]);

  useEffect(() => { load(); loadSummary(); }, [qs]);

  const pages = Math.max(1, Math.ceil(count / pageSize));

  const clearFilters = () => {
    setMethod('all'); setStatusFilter('all'); setFund('all');
    setQ(''); setFrom(''); setTo(''); setPage(1);
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-4">
        <header className="sticky top-0 z-10 bg-slate-50/75 backdrop-blur border-b border-slate-200/70 py-3 mb-4">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl sm:text-2xl font-semibold">Donations</h1>
            <div className="flex items-center gap-2">
              <select
                className="border rounded px-2 py-1"
                value={sort}
                onChange={e => setSort(e.target.value as any)}
                title="Sort"
              >
                <option value="date_desc">Newest first</option>
                <option value="date_asc">Oldest first</option>
                <option value="amount_desc">Amount high → low</option>
                <option value="amount_asc">Amount low → high</option>
              </select>
              <button onClick={exportCsv} className="border rounded px-3 py-1 hover:bg-white">
                Export CSV
              </button>
              <button onClick={() => { load(); loadSummary(); }} className="border rounded px-3 py-1 hover:bg-white">
                Refresh
              </button>
            </div>
          </div>

          {/* toolbar */}
          <div className="mt-3 grid gap-2 md:grid-cols-7">
            <select className="border rounded px-2 py-2" value={method}
                    onChange={e => { setMethod(e.target.value as any); setPage(1); }}>
              {METHODS.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
            </select>
            <select className="border rounded px-2 py-2" value={status}
                    onChange={e => { setStatusFilter(e.target.value as any); setPage(1); }}>
              {STATUSES.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
            </select>
            <input className="border rounded px-2 py-2" placeholder="Fund (all/general/zakat/...)"
                   value={fund} onChange={e => { setFund(e.target.value); setPage(1); }} />
            <input className="border rounded px-2 py-2" placeholder="Search name/email/ref"
                   value={q} onChange={e => { setQ(e.target.value); setPage(1); }} />
            <input type="date" className="border rounded px-2 py-2"
                   value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} />
            <input type="date" className="border rounded px-2 py-2"
                   value={to} onChange={e => { setTo(e.target.value); setPage(1); }} />
            <button onClick={clearFilters} className="border rounded px-3 py-2 hover:bg-white">
              Clear
            </button>
          </div>
        </header>

        {/* summary cards */}
        <section className="grid sm:grid-cols-3 gap-3 mb-4">
          <SummaryCard label="Total (page)" value={fmtUsd(pageTotals.sum)} />
          <SummaryCard label="Rows (page / all)" value={`${displayRows.length} / ${count}`} />
          <SummaryCard
            label="Page by method"
            value={Object.entries(pageTotals.byMethod).map(([k,v]) => `${k}:${fmtUsd(v)}`).join('  ')}
          />
          {summary && (
            <>
              <SummaryCard
                label="Filtered total by method"
                value={summary.byMethod.map(x => `${x.method}:${fmtUsd(x.total_cents)}`).join('  ')}
              />
              <SummaryCard
                label="Top funds (filtered)"
                value={summary.byFund
                  .slice()
                  .sort((a,b)=>b.total_cents-a.total_cents)
                  .slice(0,3)
                  .map(x => `${x.fund}:${fmtUsd(x.total_cents)}`).join('  ')}
              />
            </>
          )}
        </section>

        {/* table */}
        <div className="overflow-x-auto border rounded bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <Th>Date</Th>
                <Th>Donor</Th>
                <Th>Email</Th>
                <Th>Fund</Th>
                <Th>Method</Th>
                <Th right>Amount</Th>
                <Th>Status</Th>
                <Th>Ref / Proof</Th>
                <Th>Actions</Th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_,i)=>(
                  <tr key={i} className="border-t animate-pulse">
                    <Td colSpan={9}><div className="h-4 w-2/3 bg-slate-100 rounded"/></Td>
                  </tr>
                ))
              ) : displayRows.length === 0 ? (
                <tr>
                  <Td colSpan={9}>
                    <div className="py-8 text-center text-slate-500">
                      No results. Try changing filters or date range.
                    </div>
                  </Td>
                </tr>
              ) : (
                displayRows.map(r => (
                  <tr key={r.id} className="border-t hover:bg-slate-50">
                    <Td>{new Date(r.created_at).toLocaleString()}</Td>
                    <Td>{r.donor_name || '-'}</Td>
                    <Td>{r.donor_email || '-'}</Td>
                    <Td><span className="inline-block px-2 py-0.5 rounded-full bg-slate-100">{r.fund}</span></Td>
                    <Td>
                      <span className={cls('inline-block px-2 py-0.5 rounded-full text-xs font-medium', METHOD_STYLES[r.method])}>
                        {r.method.toUpperCase()}
                      </span>
                    </Td>
                    <Td right className="font-semibold">{fmtUsd(r.amount_cents)}</Td>
                    <Td>
                      <span className={cls('inline-block px-2 py-0.5 rounded-full text-xs font-medium', STATUS_STYLES[r.status])}>
                        {r.status}
                      </span>
                    </Td>
                    <Td>
                      {r.method === 'stripe' && (
                        <code className="text-xs break-all">{r.external_ref}</code>
                      )}
                      {r.method === 'zelle' && (
                        <div className="text-xs space-y-1">
                          {r.zelle_transfer_date && <div>Transfer: {r.zelle_transfer_date}</div>}
                          {r.zelle_proof && <a className="text-blue-600 underline" href={r.zelle_proof} target="_blank">Proof</a>}
                          {r.external_ref && <div>Last4: {r.external_ref}</div>}
                        </div>
                      )}
                      {r.method === 'bank' && (
                        <div className="text-xs space-y-1">
                          {r.bank_transfer_date && <div>Transfer: {r.bank_transfer_date}</div>}
                          {r.bank_transaction_id && <div>Txn: {r.bank_transaction_id}</div>}
                          {r.bank_proof && <a className="text-blue-600 underline" href={r.bank_proof} target="_blank">Proof</a>}
                        </div>
                      )}
                    </Td>
                    <Td>
                      <div className="flex gap-1">
                        {r.status !== 'succeeded' && (
                          <button
                            onClick={() => updateStatus(r.id, 'succeeded')}
                            className="px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                          >
                            Verify
                          </button>
                        )}
                        {r.status !== 'failed' && (
                          <button
                            onClick={() => updateStatus(r.id, 'failed')}
                            className="px-2 py-1 rounded bg-rose-600 text-white hover:bg-rose-700"
                          >
                            Fail
                          </button>
                        )}
                        {r.status !== 'needs_review' && (
                          <button
                            onClick={() => updateStatus(r.id, 'needs_review')}
                            className="px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                          >
                            Review
                          </button>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* pagination */}
        <div className="flex items-center justify-between mt-3">
          <div className="text-sm">Page {page} / {pages}</div>
          <div className="flex items-center gap-2">
            <button className="border rounded px-3 py-1" disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
            <button className="border rounded px-3 py-1" disabled={page >= pages}
                    onClick={() => setPage(p => p + 1)}>Next</button>
            <select className="border rounded px-2 py-1"
                    value={pageSize}
                    onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
              {[50, 100, 200, 500].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ==================== tiny UI bits ==================== */
function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value || '-'}</div>
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={cls('p-2 text-left text-slate-600 text-xs uppercase', right && 'text-right')}>{children}</th>;
}
function Td({ children, right, colSpan }: { children: React.ReactNode; right?: boolean; colSpan?: number }) {
  return <td colSpan={colSpan} className={cls('p-2 align-top', right && 'text-right')}>{children}</td>;
}
