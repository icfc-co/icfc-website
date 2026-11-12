'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  IMPEDIMENT_OPTS, KAFAAH_OPTS, LICENSE_OPTS, MAHR_OPTS, NIKAH_STATUSES, NikahRow, NikahStatus, REQUIREMENTS,
  WALI_OPTS, WITNESS_OPTS, fmtDate, fmtTime, nikahFlags, optLabel, statusOf, todayInFortCollins,
} from '@/lib/nikah';

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) }, cache: 'no-store' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
  return json as T;
}

const input = 'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#006400] focus:outline-none';
const label = 'block text-sm font-medium text-gray-800';

type Filter = 'open' | 'all' | NikahStatus;
const OPEN: NikahStatus[] = ['new', 'in_review', 'scheduled'];

// The date that matters: the confirmed one, else the requested one
const whenOf = (r: NikahRow) => ({ date: r.scheduled_date ?? r.nikah_date, time: r.scheduled_time ?? r.nikah_time });

function StatusBadge({ s }: { s: string }) {
  const st = statusOf(s);
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${st.color}`}>{st.label}</span>;
}

function Field({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5 text-sm">
      <dt className="text-gray-500">{k}</dt>
      <dd className="col-span-2 break-words text-gray-900">{v || <span className="text-gray-400">—</span>}</dd>
    </div>
  );
}

function toCsv(rows: NikahRow[]) {
  const cols: [string, (r: NikahRow) => unknown][] = [
    ['Submitted', (r) => r.created_at], ['Status', (r) => statusOf(r.status).label],
    ['Requested date', (r) => r.nikah_date], ['Requested time', (r) => fmtTime(r.nikah_time)],
    ['Scheduled date', (r) => r.scheduled_date], ['Scheduled time', (r) => fmtTime(r.scheduled_time)], ['Officiant', (r) => r.officiant],
    ['Contact email', (r) => r.contact_email],
    ['Groom', (r) => r.groom_name], ['Groom phone', (r) => r.groom_phone], ['Groom email', (r) => r.groom_email], ['Groom address', (r) => r.groom_address],
    ['Bride', (r) => r.bride_name], ['Bride phone', (r) => r.bride_phone], ['Bride email', (r) => r.bride_email],
    ['Location', (r) => r.location], ['Location address', (r) => r.location_address],
    ...REQUIREMENTS.map((q) => [q.label, (r: NikahRow) => (r.requirements?.[q.key] === 'available' ? 'Available' : 'Not available')] as [string, (r: NikahRow) => unknown]),
    ['Requirements notes', (r) => r.requirements_notes], ['Vows', (r) => (r.vows_acknowledged ? 'True' : 'False')],
    ['Witnesses', (r) => optLabel(WITNESS_OPTS, r.witnesses)], ['Mahr', (r) => optLabel(MAHR_OPTS, r.mahr)],
    ['Wali', (r) => optLabel(WALI_OPTS, r.wali)], ['Wali details', (r) => r.wali_details],
    ['Kafaah', (r) => optLabel(KAFAAH_OPTS, r.kafaah)], ['Impediments', (r) => optLabel(IMPEDIMENT_OPTS, r.impediments)],
    ['License', (r) => optLabel(LICENSE_OPTS, r.license)],
    ['Resources checked', (r) => (r.resources_checked ? 'Yes' : r.resources_note)],
    ['Wants to donate', (r) => (r.wants_to_donate ? 'Yes' : 'No')], ['Donation amount', (r) => r.donation_amount],
    ['Staff notes', (r) => r.staff_notes],
  ];
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [cols.map(([h]) => esc(h)).join(','), ...rows.map((r) => cols.map(([, f]) => esc(f(r))).join(','))].join('\r\n');
}

export default function NikahManager() {
  const [rows, setRows] = useState<NikahRow[] | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('open');
  const [q, setQ] = useState('');
  const [selId, setSelId] = useState<string | null>(null);
  const [edit, setEdit] = useState({ status: 'new' as NikahStatus, scheduled_date: '', scheduled_time: '', officiant: '', staff_notes: '' });
  const [saving, setSaving] = useState(false);
  const today = useMemo(() => todayInFortCollins(), []);

  const load = async () => {
    try {
      const j = await api<{ data: NikahRow[] }>('/api/admin/nikah');
      setRows(j.data);
      setError('');
    } catch (e) {
      setError((e as Error).message);
      setRows([]);
    }
  };
  useEffect(() => { load(); }, []);

  const sel = rows?.find((r) => r.id === selId) ?? null;
  const openRow = (r: NikahRow) => {
    setSelId(r.id);
    setEdit({
      status: r.status,
      scheduled_date: r.scheduled_date ?? '',
      scheduled_time: r.scheduled_time?.slice(0, 5) ?? '',
      officiant: r.officiant ?? '',
      staff_notes: r.staff_notes ?? '',
    });
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { open: 0, all: rows?.length ?? 0 };
    for (const r of rows ?? []) {
      c[r.status] = (c[r.status] ?? 0) + 1;
      if (OPEN.includes(r.status)) c.open++;
    }
    return c;
  }, [rows]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    let l = (rows ?? []).filter((r) => (filter === 'all' ? true : filter === 'open' ? OPEN.includes(r.status) : r.status === filter));
    if (term) {
      l = l.filter((r) => [r.groom_name, r.bride_name, r.contact_email, r.groom_phone, r.bride_phone, r.officiant]
        .some((v) => v?.toLowerCase().includes(term)));
    }
    // Open requests: soonest ceremony first. Otherwise newest submission first.
    if (filter === 'open') l = [...l].sort((a, b) => (whenOf(a).date + whenOf(a).time).localeCompare(whenOf(b).date + whenOf(b).time));
    return l;
  }, [rows, filter, q]);

  const save = async (patch: Partial<typeof edit>) => {
    if (!sel) return;
    setSaving(true);
    try {
      const j = await api<{ data: NikahRow }>(`/api/admin/nikah/${sel.id}`, { method: 'PATCH', body: JSON.stringify(patch) });
      setRows((p) => p?.map((r) => (r.id === j.data.id ? j.data : r)) ?? p);
      setEdit((e) => ({ ...e, ...patch }));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const schedule = () => {
    if (!sel) return;
    save({
      status: 'scheduled',
      scheduled_date: edit.scheduled_date || sel.nikah_date,
      scheduled_time: edit.scheduled_time || sel.nikah_time.slice(0, 5),
      officiant: edit.officiant,
      staff_notes: edit.staff_notes,
    });
  };

  const remove = async () => {
    if (!sel) return;
    if (!window.confirm(`Delete the request from ${sel.groom_name} & ${sel.bride_name}? This cannot be undone. To keep a record, set the status to Declined or Cancelled instead.`)) return;
    try {
      await api(`/api/admin/nikah/${sel.id}`, { method: 'DELETE' });
      setSelId(null);
      setRows((p) => p?.filter((r) => r.id !== sel.id) ?? p);
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const exportCsv = () => {
    const blob = new Blob(['﻿' + toCsv(list)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `nikah-requests-${today}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const tabs: { key: Filter; label: string }[] = [
    { key: 'open', label: 'Open' },
    ...NIKAH_STATUSES.map((s) => ({ key: s.value as Filter, label: s.label })),
    { key: 'all', label: 'All' },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 text-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Nikah Requests</h1>
          <p className="text-gray-600">Requests submitted from the Nikah/Matrimony page.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/services/nikah-matrimony" className="rounded-xl border border-[#006400] px-4 py-2 text-sm font-medium text-[#006400]">View form</Link>
          <button onClick={exportCsv} disabled={!list.length} className="rounded-xl bg-[#006400] px-4 py-2 text-sm font-medium text-white shadow hover:opacity-90 disabled:opacity-50">Export CSV</button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            className={`rounded-full border px-3 py-1.5 text-sm ${filter === t.key ? 'border-[#006400] bg-[#006400] text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}>
            {t.label} <span className="opacity-70">({counts[t.key] ?? 0})</span>
          </button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search names, email, phone…" className="ml-auto w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm sm:w-64" />
      </div>

      {error && <p className="mt-4 text-red-600">{error}</p>}
      {rows === null && <p className="mt-4 text-gray-500">Loading…</p>}
      {rows !== null && !list.length && !error && <p className="mt-4 text-gray-600">No requests here.</p>}

      <ul className="mt-4 space-y-3">
        {list.map((r) => {
          const w = whenOf(r);
          const flags = nikahFlags(r);
          const past = w.date < today && OPEN.includes(r.status);
          return (
            <li key={r.id}>
              <button onClick={() => openRow(r)} className="w-full rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-[#006400]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{r.groom_name} &amp; {r.bride_name}</span>
                  <StatusBadge s={r.status} />
                  {flags.length > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">{flags.length} to follow up</span>}
                  {past && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Date passed</span>}
                </div>
                <p className="mt-1 text-sm text-gray-700">
                  {r.scheduled_date ? 'Scheduled' : 'Requested'}: <strong>{fmtDate(w.date)}</strong> at {fmtTime(w.time)}
                  {' · '}{r.location.toUpperCase() === 'ICFC' ? 'ICFC' : r.location}
                  {r.officiant ? ` · Officiant: ${r.officiant}` : ''}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">{r.contact_email} · submitted {new Date(r.created_at).toLocaleDateString()}</p>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Detail drawer */}
      {sel && (
        <div className="fixed inset-0 z-50 flex bg-black/40" onClick={() => setSelId(null)}>
          <div className="ml-auto h-full w-full max-w-2xl overflow-y-auto bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{sel.groom_name} &amp; {sel.bride_name}</h2>
                <p className="text-sm text-gray-500">Submitted {new Date(sel.created_at).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelId(null)} className="rounded-lg border px-3 py-1 text-sm">Close</button>
            </div>

            {nikahFlags(sel).length > 0 && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-semibold">Needs follow-up</p>
                <ul className="mt-1 list-disc pl-5">{nikahFlags(sel).map((f) => <li key={f}>{f}</li>)}</ul>
              </div>
            )}

            {/* Workflow */}
            <div className="mt-4 rounded-2xl border border-gray-200 p-4">
              <h3 className="font-semibold">Manage</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={label} htmlFor="st">Status</label>
                  <select id="st" className={input} value={edit.status} onChange={(e) => setEdit((p) => ({ ...p, status: e.target.value as NikahStatus }))}>
                    {NIKAH_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={label} htmlFor="off">Officiant</label>
                  <input id="off" className={input} maxLength={150} value={edit.officiant} onChange={(e) => setEdit((p) => ({ ...p, officiant: e.target.value }))} placeholder="e.g. Imam …" />
                </div>
                <div>
                  <label className={label} htmlFor="sd">Confirmed date</label>
                  <input id="sd" type="date" className={input} value={edit.scheduled_date} onChange={(e) => setEdit((p) => ({ ...p, scheduled_date: e.target.value }))} />
                </div>
                <div>
                  <label className={label} htmlFor="stm">Confirmed time</label>
                  <input id="stm" type="time" className={input} value={edit.scheduled_time} onChange={(e) => setEdit((p) => ({ ...p, scheduled_time: e.target.value }))} />
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">Requested: {fmtDate(sel.nikah_date)} at {fmtTime(sel.nikah_time)}. Leave the confirmed date/time empty until it’s agreed.</p>
              <div className="mt-3">
                <label className={label} htmlFor="notes">Staff notes</label>
                <textarea id="notes" rows={4} maxLength={5000} className={input} value={edit.staff_notes} onChange={(e) => setEdit((p) => ({ ...p, staff_notes: e.target.value }))}
                  placeholder="Counseling sessions, calls made, documents received…" />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button disabled={saving} onClick={() => save(edit)} className="rounded-xl bg-[#006400] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
                {sel.status !== 'scheduled' && (
                  <button disabled={saving} onClick={schedule} className="rounded-xl border border-[#006400] px-4 py-2 text-sm font-medium text-[#006400] disabled:opacity-60" title="Sets status to Scheduled; uses the requested date/time unless you entered another">
                    Schedule
                  </button>
                )}
                <a href={`mailto:${[sel.contact_email, sel.groom_email, sel.bride_email].filter((v, i, a) => v && a.indexOf(v) === i).join(',')}?subject=${encodeURIComponent('Your Nikah request at ICFC')}`}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium">Email couple</a>
                <button onClick={remove} className="ml-auto rounded-xl border border-red-300 px-4 py-2 text-sm font-medium text-red-700">Delete</button>
              </div>
            </div>

            {/* Answers */}
            <h3 className="mt-6 font-semibold">Contact &amp; ceremony</h3>
            <dl className="mt-1 divide-y divide-gray-100">
              <Field k="Contact email" v={<a className="underline" href={`mailto:${sel.contact_email}`}>{sel.contact_email}</a>} />
              <Field k="Groom" v={sel.groom_name} />
              <Field k="Groom phone" v={<a className="underline" href={`tel:${sel.groom_phone}`}>{sel.groom_phone}</a>} />
              <Field k="Groom email" v={sel.groom_email} />
              <Field k="Groom address" v={sel.groom_address} />
              <Field k="Bride" v={sel.bride_name} />
              <Field k="Bride phone" v={<a className="underline" href={`tel:${sel.bride_phone}`}>{sel.bride_phone}</a>} />
              <Field k="Bride email" v={sel.bride_email} />
              <Field k="Requested" v={`${fmtDate(sel.nikah_date)} at ${fmtTime(sel.nikah_time)}`} />
              <Field k="Location" v={sel.location.toUpperCase() === 'ICFC' ? 'ICFC' : `${sel.location} — ${sel.location_address ?? ''}`} />
            </dl>

            <h3 className="mt-6 font-semibold">Requirements</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {REQUIREMENTS.map((rq) => {
                const ok = sel.requirements?.[rq.key] === 'available';
                return (
                  <li key={rq.key} className="flex items-start gap-2">
                    <span className={`mt-0.5 rounded px-1.5 text-xs font-semibold ${ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>{ok ? 'Available' : 'Not available'}</span>
                    <span>{rq.label}</span>
                  </li>
                );
              })}
            </ul>
            <dl className="mt-2 divide-y divide-gray-100">
              <Field k="Explanation" v={sel.requirements_notes && <span className="whitespace-pre-wrap">{sel.requirements_notes}</span>} />
              <Field k="Vows (Ijāb & Qubūl)" v={sel.vows_acknowledged ? 'True' : 'False'} />
              <Field k="Witnesses" v={optLabel(WITNESS_OPTS, sel.witnesses)} />
              <Field k="Mahr" v={optLabel(MAHR_OPTS, sel.mahr)} />
              <Field k="Wali" v={optLabel(WALI_OPTS, sel.wali) + (sel.wali_details ? ` — ${sel.wali_details}` : '')} />
              <Field k="Kafā’ah" v={optLabel(KAFAAH_OPTS, sel.kafaah)} />
              <Field k="Impediments" v={optLabel(IMPEDIMENT_OPTS, sel.impediments)} />
              <Field k="Marriage license" v={optLabel(LICENSE_OPTS, sel.license)} />
            </dl>

            <h3 className="mt-6 font-semibold">Declaration, resources &amp; donation</h3>
            <dl className="mt-1 divide-y divide-gray-100">
              <Field k="Declaration" v={[sel.declaration_groom && 'Groom', sel.declaration_bride && 'Bride'].filter(Boolean).join(' & ')} />
              <Field k="Resources" v={sel.resources_checked ? 'Checked the resources' : `Other: ${sel.resources_note ?? ''}`} />
              <Field k="Donation" v={sel.wants_to_donate ? `Yes${sel.donation_amount ? ` — ${sel.donation_amount}` : ''}` : 'No'} />
            </dl>
          </div>
        </div>
      )}
    </section>
  );
}
