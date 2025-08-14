// File: src/app/admin/messages/page.tsx
// ----------------------------------------------
'use client';

import { useEffect, useMemo, useState } from 'react';

const TITLE_FONT = 'font-[var(--font-bebas-neue)]';
const HEADING_FONT = 'font-[var(--font-montserrat)]';
const BODY_FONT = 'font-[var(--font-roboto)]';
const BRAND_GREEN = '#006400';

type Status = 'new' | 'seen' | 'closed';

interface MessageRow {
  id: string;
  created_at: string;
  name: string;
  email: string;
  reason: string;
  subject?: string;
  status: Status;
  notes?: string | null;
}

function toQuery(params: Record<string, string | number | undefined>) {
  const u = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') u.set(k, String(v));
  });
  return u.toString();
}

export default function AdminMessagesPage() {
  const [data, setData] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const qs = useMemo(() => toQuery({ reason, status, from, to, search, page, pageSize }), [reason, status, from, to, search, page, pageSize]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/messages?' + qs);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load messages');
      setData(json.data || []);
      setTotal(json.total || 0);
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs]);

  async function updateRow(row: Partial<MessageRow> & { id: string }) {
    const res = await fetch('/api/admin/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || 'Update failed');
  }

  function exportCsv() {
    const url = '/api/admin/messages/export?' + qs;
    window.location.href = url;
  }

  return (
    <main className={BODY_FONT + ' min-h-[70vh] py-8 md:py-12 px-4 md:px-6 bg-gradient-to-b from-[#f7f7f7] to-[#eef2f0]'}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 md:mb-6">
          <h1 className={TITLE_FONT + ' text-3xl md:text-4xl'} style={{ color: BRAND_GREEN }}>Admin - Messages</h1>
          <p className="text-gray-700 mt-1">View and manage contact form submissions.</p>
        </div>

        {/* Filters */}
        <div className="rounded-2xl bg-white/90 border border-black/5 p-4 md:p-5 shadow-sm mb-4 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700 mb-1">Reason</label>
            <select value={reason} onChange={e=>{setPage(1);setReason(e.target.value);}} className="w-full rounded-xl border border-gray-300 px-3 py-2 bg-white">
              <option value="">All</option>
              <option value="general">General</option>
              <option value="membership">Membership</option>
              <option value="donation">Donations / Receipts</option>
              <option value="school">School / Classes</option>
              <option value="volunteer">Volunteering</option>
              <option value="event">Events / Facility</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Status</label>
            <select value={status} onChange={e=>{setPage(1);setStatus(e.target.value);}} className="w-full rounded-xl border border-gray-300 px-3 py-2 bg-white">
              <option value="">All</option>
              <option value="new">New</option>
              <option value="seen">Seen</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">From</label>
            <input type="date" value={from} onChange={e=>{setPage(1);setFrom(e.target.value);}} className="w-full rounded-xl border border-gray-300 px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">To</label>
            <input type="date" value={to} onChange={e=>{setPage(1);setTo(e.target.value);}} className="w-full rounded-xl border border-gray-300 px-3 py-2" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700 mb-1">Search</label>
            <input placeholder="name/email/subject" value={search} onChange={e=>{setPage(1);setSearch(e.target.value);}} className="w-full rounded-xl border border-gray-300 px-3 py-2" />
          </div>
          <div className="flex gap-2">
            <button onClick={()=>{setPage(1);load();}} className="px-4 py-2 rounded-xl text-white" style={{backgroundColor: BRAND_GREEN}}>Apply</button>
            <button onClick={()=>{setReason('');setStatus('');setFrom('');setTo('');setSearch('');setPage(1);}} className="px-4 py-2 rounded-xl border border-gray-300 bg-white">Reset</button>
          </div>
          <div className="md:col-span-6 flex items-center justify-between">
            <div className="text-sm text-gray-600">{loading ? 'Loading...' : 'Total: ' + total}</div>
            <div className="flex items-center gap-2">
              <label className="text-sm">Rows:</label>
              <select value={pageSize} onChange={e=>{setPage(1);setPageSize(parseInt(e.target.value) || 20);}} className="rounded-lg border border-gray-300 px-2 py-1 bg-white">
                <option>10</option>
                <option>20</option>
                <option>50</option>
                <option>100</option>
              </select>
              <button onClick={exportCsv} className="ml-2 px-3 py-2 rounded-xl border border-gray-300 bg-white">Export CSV</button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl overflow-hidden border border-black/5 bg-white/90 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left">Created</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Reason</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Notes</th>
                </tr>
              </thead>
              <tbody>
                {data.map(row => (
                  <tr key={row.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(row.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2"><a className="underline" href={'mailto:' + row.email}>{row.email}</a></td>
                    <td className="px-3 py-2">{row.reason}</td>
                    <td className="px-3 py-2">
                      <select
                        value={row.status}
                        onChange={async (e)=>{
                          const next = e.target.value as Status;
                          const prev = row.status;
                          try {
                            setData(d=>d.map(r=>r.id===row.id?{...r,status:next}:r));
                            await updateRow({ id: row.id, status: next });
                          } catch(err){
                            setData(d=>d.map(r=>r.id===row.id?{...r,status:prev}:r));
                            alert('Failed to update status');
                          }
                        }}
                        className="rounded-lg border border-gray-300 px-2 py-1 bg-white"
                      >
                        <option value="new">new</option>
                        <option value="seen">seen</option>
                        <option value="closed">closed</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 w-[24rem] min-w-[16rem]">
                      <textarea
                        defaultValue={row.notes || ''}
                        onBlur={async (e)=>{
                          const val = e.currentTarget.value;
                          try {
                            await updateRow({ id: row.id, notes: val });
                            setData(d=>d.map(r=>r.id===row.id?{...r,notes:val}:r));
                          } catch(err){
                            alert('Failed to save notes');
                          }
                        }}
                        rows={2}
                        className="w-full rounded-lg border border-gray-300 px-2 py-1 bg-white"
                        placeholder="Add a short note..."
                      />
                    </td>
                  </tr>
                ))}
                {!loading && data.length===0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-gray-600">No messages found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between p-3 border-t border-gray-100 bg-white">
            <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-3 py-2 rounded-lg border border-gray-300 bg-white disabled:opacity-50">Prev</button>
            <div className="text-sm text-gray-600">{'Page ' + page + ' of ' + Math.max(1, Math.ceil(total / pageSize))}</div>
            <button disabled={page>=Math.ceil(total/pageSize)} onClick={()=>setPage(p=>p+1)} className="px-3 py-2 rounded-lg border border-gray-300 bg-white disabled:opacity-50">Next</button>
          </div>
        </div>

        {error && <div className="mt-3 text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>}
      </div>
    </main>
  );
}
