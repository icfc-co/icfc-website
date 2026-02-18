// File: src/components/ramadan/RamadanVolunteersTable.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';

const BODY_FONT = 'font-[var(--font-roboto)]';
const BRAND_GREEN = '#006400';

type Status = 'pending' | 'confirmed' | 'declined';

interface VolunteerRow {
  id: string;
  created_at: string;
  name: string;
  phone: string;
  preferred_team: string;
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

interface RamadanVolunteersTableProps {
  canEdit?: boolean; // Whether user can edit status and notes
}

export default function RamadanVolunteersTable({ canEdit = false }: RamadanVolunteersTableProps) {
  const [data, setData] = useState<VolunteerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const qs = useMemo(() => toQuery({ status, search, page, pageSize }), [status, search, page, pageSize]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ramadan/volunteers?' + qs);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load volunteers');
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

  async function updateRow(row: Partial<VolunteerRow> & { id: string }) {
    try {
      const res = await fetch('/api/ramadan/volunteers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(row),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Update failed');
      await load(); // Refresh data
    } catch (e: any) {
      alert(e?.message || 'Update failed');
    }
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className={BODY_FONT}>
      {/* Filters */}
      <div className="rounded-2xl bg-white/90 border border-black/5 p-4 md:p-5 shadow-sm mb-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Status</label>
          <select 
            value={status} 
            onChange={e => { setPage(1); setStatus(e.target.value); }} 
            className="w-full rounded-xl border border-gray-300 px-3 py-2 bg-white"
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="declined">Declined</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm text-gray-700 mb-1">Search (name, phone, team)</label>
          <input
            type="text"
            value={search}
            onChange={e => { setPage(1); setSearch(e.target.value); }}
            placeholder="Search..."
            className="w-full rounded-xl border border-gray-300 px-3 py-2"
          />
        </div>

        <button
          onClick={() => {
            setStatus('');
            setSearch('');
            setPage(1);
          }}
          className="rounded-xl border border-gray-300 px-4 py-2 hover:bg-gray-50"
        >
          Clear Filters
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="rounded-2xl bg-white border border-black/5 p-4 shadow-sm">
          <p className="text-sm text-gray-600">Total</p>
          <p className="text-2xl font-bold" style={{ color: BRAND_GREEN }}>{total}</p>
        </div>
        <div className="rounded-2xl bg-white border border-black/5 p-4 shadow-sm">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">
            {data.filter(v => v.status === 'pending').length}
          </p>
        </div>
        <div className="rounded-2xl bg-white border border-black/5 p-4 shadow-sm">
          <p className="text-sm text-gray-600">Confirmed</p>
          <p className="text-2xl font-bold text-green-600">
            {data.filter(v => v.status === 'confirmed').length}
          </p>
        </div>
        <div className="rounded-2xl bg-white border border-black/5 p-4 shadow-sm">
          <p className="text-sm text-gray-600">Declined</p>
          <p className="text-2xl font-bold text-red-600">
            {data.filter(v => v.status === 'declined').length}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-red-800 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-600">Loading...</div>
      ) : data.length === 0 ? (
        <div className="rounded-2xl bg-white border border-black/5 p-8 text-center text-gray-600">
          No volunteers found.
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="rounded-2xl bg-white border border-black/5 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Phone</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Team</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Notes</th>
                    {canEdit && <th className="px-4 py-3 text-left font-semibold text-gray-700">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, idx) => (
                    <VolunteerRow key={row.id} row={row} idx={idx} canEdit={canEdit} onUpdate={updateRow} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-xl border px-4 py-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-gray-700">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-xl border px-4 py-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function VolunteerRow({ 
  row, 
  idx, 
  canEdit,
  onUpdate 
}: { 
  row: VolunteerRow; 
  idx: number;
  canEdit: boolean;
  onUpdate: (row: Partial<VolunteerRow> & { id: string }) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(row.notes || '');

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    declined: 'bg-red-100 text-red-800',
  };

  const statusLabels = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    declined: 'Declined',
  };

  async function handleStatusChange(newStatus: Status) {
    if (canEdit) {
      await onUpdate({ id: row.id, status: newStatus });
    }
  }

  async function handleSaveNotes() {
    await onUpdate({ id: row.id, notes });
    setEditing(false);
  }

  return (
    <tr className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
      <td className="px-4 py-3 whitespace-nowrap">
        {new Date(row.created_at).toLocaleDateString()}
      </td>
      <td className="px-4 py-3">{row.name}</td>
      <td className="px-4 py-3 whitespace-nowrap">{row.phone}</td>
      <td className="px-4 py-3">{row.preferred_team}</td>
      <td className="px-4 py-3">
        {canEdit ? (
          <select
            value={row.status}
            onChange={e => handleStatusChange(e.target.value as Status)}
            className={`rounded-lg px-2 py-1 text-xs font-semibold ${statusColors[row.status]}`}
          >
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="declined">Declined</option>
          </select>
        ) : (
          <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${statusColors[row.status]}`}>
            {statusLabels[row.status]}
          </span>
        )}
      </td>
      <td className="px-4 py-3 max-w-xs">
        {canEdit && editing ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="flex-1 rounded border px-2 py-1 text-sm"
              placeholder="Add notes..."
            />
            <button
              onClick={handleSaveNotes}
              className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Save
            </button>
            <button
              onClick={() => {
                setNotes(row.notes || '');
                setEditing(false);
              }}
              className="text-xs px-2 py-1 bg-gray-300 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 truncate">{row.notes || '—'}</span>
            {canEdit && (
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-blue-600 hover:underline"
              >
                Edit
              </button>
            )}
          </div>
        )}
      </td>
      {canEdit && (
        <td className="px-4 py-3">
          <a 
            href={`tel:${row.phone}`}
            className="text-xs text-blue-600 hover:underline"
          >
            Call
          </a>
        </td>
      )}
    </tr>
  );
}
