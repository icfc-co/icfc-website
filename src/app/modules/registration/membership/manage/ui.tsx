'use client';
import { useState } from 'react';

export default function ManageMembershipClient({ userId, household, members }: any) {
  const [busy, setBusy] = useState(false);
  const [hh, setHh] = useState(household);

  if (!hh) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Manage Membership</h1>
        <p>You don’t have an active membership yet.</p>
      </div>
    );
  }

  const total = (members || []).reduce((s: number, m: any) => s + m.price_cents, 0) / 100;

  const onRevoke = async () => {
    if (!confirm('Are you sure you want to revoke your membership? This will end benefits today.')) return;
    setBusy(true);
    try {
      const res = await fetch('/api/membership/revoke', { method: 'POST' });
      const json = await res.json();
      if (res.ok) setHh({ ...hh, status: 'revoked', end_date: json.end_date });
      else alert(json?.error || 'Failed to revoke');
    } catch (e: any) {
      alert(e?.message || 'Network error');
    } finally {
      setBusy(false);
    }
  };

  const onRenew = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/membership/renew', { method: 'POST' });
      const json = await res.json();
      if (res.ok && json?.url) window.location.href = json.url;
      else alert(json?.error || 'Failed to start renewal');
    } catch (e: any) {
      alert(e?.message || 'Network error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Manage Membership</h1>

      <div className="border rounded p-4 space-y-1">
        <div className="font-medium">Household</div>
        <div>{hh.primary_name}</div>
        <div>{hh.primary_email}</div>
        {hh.primary_phone && <div>{hh.primary_phone}</div>}
        <div className="text-sm">Status: {hh.status}</div>
        <div className="text-sm">Start: {hh.start_date} · End: {hh.end_date}</div>
      </div>

      <div className="border rounded p-4">
        <div className="font-medium mb-2">Members</div>
        <ul className="space-y-1">
          {members.map((m: any) => (
            <li key={m.id} className="flex items-center justify-between">
              <span>{m.name} · Age {m.age} ({m.category})</span>
              <span>${(m.price_cents/100).toFixed(0)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 border-t pt-3 font-medium">Yearly Total: ${total}</div>
      </div>

      <div className="border rounded p-4 space-y-3">
        <div className="font-medium">Membership Benefits</div>
        <ul className="list-disc pl-6 text-sm space-y-1">
          <li>ICFC Member Portal access</li>
          <li>Discounts on community classes/events</li>
          <li>Priority notifications and seating for special programs</li>
          <li>Voting eligibility (where applicable)</li>
        </ul>
      </div>

      <div className="flex gap-3">
        <button disabled={busy || hh.status === 'revoked'} onClick={onRenew}
                className="px-4 py-2 rounded bg-emerald-700 text-white disabled:opacity-50">
          Renew for Next Year
        </button>
        <button disabled={busy || hh.status === 'revoked'} onClick={onRevoke}
                className="px-4 py-2 rounded border border-red-600 text-red-700 disabled:opacity-50">
          Revoke Membership
        </button>
      </div>
    </div>
  );
}
