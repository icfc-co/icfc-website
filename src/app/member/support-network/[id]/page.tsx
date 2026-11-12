'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  api, fmtDate, fmtDateTime, helpList, StatusBadge, SupportRequest, URGENCY_LABELS, errMsg,
} from '@/components/support-network/shared';

type Reply = { id: string; author_name: string; author_role: string; body: string; created_at: string; mine: boolean };
type Me = { id: string; name: string; phone: string | null; isStaff: boolean };

const btn = 'rounded-xl px-4 py-2 text-sm font-medium shadow-sm disabled:opacity-60';
const primary = `${btn} bg-[#006400] text-white hover:opacity-90`;
const secondary = `${btn} border border-gray-300 bg-white text-gray-800 hover:bg-gray-50`;
const danger = `${btn} border border-red-300 bg-white text-red-700 hover:bg-red-50`;

export default function SupportRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const [r, setR] = useState<SupportRequest | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [helperPhone, setHelperPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [notesSaved, setNotesSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const j = await api<{ data: SupportRequest; replies: Reply[]; me: Me }>(`/api/support-network/${id}`);
      setR(j.data);
      setReplies(j.replies);
      setMe(j.me);
      setNotes(j.data.staff_notes ?? '');
      setHelperPhone((p) => p || j.me.phone || '');
      setError('');
    } catch (e) {
      setError(errMsg(e));
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const act = async (action: string, extra: Record<string, unknown> = {}, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    try {
      await api(`/api/support-network/${id}`, { method: 'PATCH', body: JSON.stringify({ action, ...extra }) });
      setAccepting(false);
      await load();
    } catch (e) {
      alert(errMsg(e));
      await load();
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msg.trim()) return;
    setBusy(true);
    try {
      const j = await api<{ data: Reply }>(`/api/support-network/${id}/replies`, { method: 'POST', body: JSON.stringify({ body: msg }) });
      setReplies((p) => [...p, j.data]);
      setMsg('');
    } catch (err) {
      alert(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const saveNotes = async () => {
    await act('notes', { staff_notes: notes });
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  };

  if (error) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-6">
        <Link href="/member/support-network" className="text-sm text-[#006400] hover:underline">← Support Network</Link>
        <p className="mt-4 text-red-600">{error}</p>
      </section>
    );
  }
  if (!r || !me) return <section className="px-4 py-6 text-gray-500">Loading…</section>;

  const v = r.viewer;
  const staff = me.isStaff;
  const seesContact = v !== 'member';
  const canReply = r.status !== 'cancelled' || staff;

  return (
    <section className="mx-auto max-w-3xl px-4 py-6">
      <Link href={staff && v === 'staff' ? '/admin/support-network' : '/member/support-network'}
        className="text-sm text-[#006400] hover:underline">
        ← {staff && v === 'staff' ? 'All requests' : 'Support Network'}
      </Link>

      <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold">{helpList(r)}</h1>
          <StatusBadge status={r.status} />
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Posted {fmtDate(r.created_at)}
          {v === 'requester' && ' by you'}
        </p>

        <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <Item k="For" v={`${r.recipient_name}${!r.for_self ? ' (family member)' : ''}`} />
          <Item k="Area" v={r.area} />
          <Item k="How soon" v={URGENCY_LABELS[r.urgency]} />
          <Item k="When" v={[r.needed_on && fmtDate(r.needed_on), r.time_window].filter(Boolean).join(', ') || 'Not specified'} />
          {r.preferred_helper !== 'any' && <Item k="Preferred helper" v={r.preferred_helper === 'Female' ? 'Sister' : 'Brother'} />}
        </dl>

        <div className="mt-4">
          <dt className="text-sm font-medium text-gray-500">Details</dt>
          <p className="mt-1 whitespace-pre-wrap text-gray-900">{r.details}</p>
        </div>

        {seesContact && (
          <div className="mt-5 grid gap-4 rounded-xl bg-green-50 p-4 text-sm sm:grid-cols-2">
            <div>
              <p className="font-semibold text-green-900">Requester contact</p>
              <p>{r.recipient_name}</p>
              {r.contact_phone && <p><a className="text-[#006400] underline" href={`tel:${r.contact_phone}`}>{r.contact_phone}</a></p>}
              {r.contact_email && <p><a className="text-[#006400] underline" href={`mailto:${r.contact_email}`}>{r.contact_email}</a></p>}
              {r.address && <p>{r.address}</p>}
            </div>
            <div>
              <p className="font-semibold text-green-900">Helper</p>
              {r.helper_name ? (
                <>
                  <p>{r.helper_name}{v === 'helper' && ' (you)'}</p>
                  {r.helper_phone && <p><a className="text-[#006400] underline" href={`tel:${r.helper_phone}`}>{r.helper_phone}</a></p>}
                  {r.accepted_at && <p className="text-gray-600">Accepted {fmtDateTime(r.accepted_at)}</p>}
                </>
              ) : (
                <p className="text-gray-600">No one has accepted yet.</p>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex flex-wrap gap-2">
          {r.status === 'open' && v !== 'requester' && !accepting && (
            <button className={primary} disabled={busy} onClick={() => setAccepting(true)}>I can help</button>
          )}
          {r.status === 'accepted' && (v === 'requester' || v === 'helper' || staff) && (
            <button className={primary} disabled={busy}
              onClick={() => act('complete', {}, 'Mark this request as completed?')}>Mark completed</button>
          )}
          {r.status === 'accepted' && (v === 'helper' || staff) && (
            <button className={secondary} disabled={busy}
              onClick={() => act('withdraw', {}, v === 'helper'
                ? 'Let the requester know you can no longer help? The request will open again for other members.'
                : 'Remove the helper and reopen this request?')}>
              {v === 'helper' ? 'I can no longer help' : 'Remove helper'}
            </button>
          )}
          {r.status === 'open' && staff && v !== 'requester' && (
            <button className={secondary} disabled={busy}
              onClick={() => act('complete', {}, 'Mark this request as completed without a helper?')}>Mark completed</button>
          )}
          {(r.status === 'open' || r.status === 'accepted') && (v === 'requester' || staff) && (
            <button className={danger} disabled={busy}
              onClick={() => act('cancel', {}, 'Cancel this request?')}>Cancel request</button>
          )}
          {(r.status === 'cancelled' && (v === 'requester' || staff)) || (r.status === 'completed' && staff) ? (
            <button className={secondary} disabled={busy} onClick={() => act('reopen', {}, 'Reopen this request?')}>Reopen</button>
          ) : null}
        </div>

        {accepting && (
          <div className="mt-4 rounded-xl border border-[#006400] p-4">
            <p className="font-medium">JazakAllahu khayran for offering to help!</p>
            <p className="mt-1 text-sm text-gray-700">
              Your name and phone number will be shared with the requester, and you will see their contact details.
            </p>
            <label className="mt-3 block text-sm font-medium" htmlFor="hp">Your phone number</label>
            <input id="hp" type="tel" maxLength={40} value={helperPhone} onChange={(e) => setHelperPhone(e.target.value)}
              className="mt-1 w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2" />
            <div className="mt-3 flex gap-2">
              <button className={primary} disabled={busy || !helperPhone.trim()}
                onClick={() => act('accept', { phone: helperPhone })}>Accept request</button>
              <button className={secondary} disabled={busy} onClick={() => setAccepting(false)}>Not now</button>
            </div>
          </div>
        )}
      </div>

      {staff && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <label className="text-sm font-semibold text-amber-900" htmlFor="notes">Staff notes (visible to staff only)</label>
          <textarea id="notes" rows={3} maxLength={4000} value={notes} onChange={(e) => setNotes(e.target.value)}
            className="mt-2 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm" />
          <button className={`${secondary} mt-2`} disabled={busy} onClick={saveNotes}>
            {notesSaved ? 'Saved ✓' : 'Save notes'}
          </button>
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-lg font-semibold">Replies</h2>
        {r.status === 'open' && v !== 'requester' && (
          <p className="text-sm text-gray-500">
            Replies on open requests are visible to the requester, staff and other members who can see this request.
          </p>
        )}
        <ul className="mt-3 space-y-3">
          {replies.length === 0 && <li className="text-sm text-gray-500">No replies yet.</li>}
          {replies.map((x) =>
            x.author_role === 'system' ? (
              <li key={x.id} className="text-center text-xs text-gray-500">
                {x.body} · {fmtDateTime(x.created_at)}
              </li>
            ) : (
              <li key={x.id} className={`rounded-xl p-3 text-sm ${x.mine ? 'ml-8 bg-green-50' : 'mr-8 bg-gray-50'}`}>
                <p className="font-medium">
                  {x.mine ? 'You' : x.author_name}
                  {x.author_role === 'staff' && <span className="ml-1 rounded bg-amber-100 px-1.5 text-xs text-amber-800">ICFC staff</span>}
                  <span className="ml-2 text-xs font-normal text-gray-500">{fmtDateTime(x.created_at)}</span>
                </p>
                <p className="mt-1 whitespace-pre-wrap">{x.body}</p>
              </li>
            )
          )}
        </ul>

        {canReply && (
          <form onSubmit={sendReply} className="mt-4">
            <textarea rows={3} maxLength={2000} value={msg} onChange={(e) => setMsg(e.target.value)}
              placeholder={v === 'member' ? 'Ask a question or offer help…' : 'Write a reply…'}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <button type="submit" className={`${primary} mt-2`} disabled={busy || !msg.trim()}>Send reply</button>
          </form>
        )}
      </div>
    </section>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="font-medium text-gray-500">{k}</dt>
      <dd className="text-gray-900">{v}</dd>
    </div>
  );
}
