'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, HELP_LABELS, URGENCY_LABELS, errMsg } from '@/components/support-network/shared';

const input = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#006400] focus:outline-none';
const label = 'block text-sm font-medium text-gray-800';

export default function NewSupportRequest() {
  const router = useRouter();
  const [me, setMe] = useState<{ name: string; phone: string | null; email: string | null } | null>(null);
  const [f, setF] = useState({
    for_self: true,
    recipient_name: '',
    contact_phone: '',
    contact_email: '',
    area: '',
    address: '',
    help_types: [] as string[],
    other_help: '',
    urgency: 'flexible',
    needed_on: '',
    time_window: '',
    details: '',
    preferred_helper: 'any',
    agreed: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ me: { name: string; phone: string | null; email: string | null } }>('/api/support-network?view=mine')
      .then((j) => {
        setMe(j.me);
        setF((p) => ({
          ...p,
          recipient_name: p.recipient_name || j.me.name,
          contact_phone: p.contact_phone || j.me.phone || '',
          contact_email: p.contact_email || j.me.email || '',
        }));
      })
      .catch((e) => setError(errMsg(e)));
  }, []);

  const set = (k: keyof typeof f, v: unknown) => setF((p) => ({ ...p, [k]: v }));
  const toggleHelp = (t: string) =>
    set('help_types', f.help_types.includes(t) ? f.help_types.filter((x) => x !== t) : [...f.help_types, t]);

  const setForSelf = (self: boolean) =>
    setF((p) => ({ ...p, for_self: self, recipient_name: self ? me?.name ?? '' : '' }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!f.help_types.length) return setError('Please choose at least one type of help.');
    if (!f.agreed) return setError('Please tick the agreement at the bottom.');
    setSaving(true);
    try {
      const j = await api<{ data: { id: string } }>('/api/support-network', { method: 'POST', body: JSON.stringify(f) });
      router.push(`/member/support-network/${j.data.id}`);
    } catch (err) {
      setError(errMsg(err));
      setSaving(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <section className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/member/support-network" className="text-sm text-[#006400] hover:underline">← Support Network</Link>
      <h1 className="mt-2 text-2xl font-bold">Request help</h1>
      <p className="mt-1 text-gray-700">
        Tell us what you need. Other members will see the type of help, your general area and timing.
        Your phone number and full address are shared only with the member who accepts your request, and with ICFC staff.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-6">
        <fieldset className="space-y-3">
          <legend className={label}>Who needs the help?</legend>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input type="radio" checked={f.for_self} onChange={() => setForSelf(true)} /> Me
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={!f.for_self} onChange={() => setForSelf(false)} /> A family member
            </label>
          </div>
          <div>
            <label className={label} htmlFor="name">Full name of the person needing help *</label>
            <input id="name" className={input} required maxLength={120}
              value={f.recipient_name} onChange={(e) => set('recipient_name', e.target.value)} />
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="phone">Phone number *</label>
            <input id="phone" type="tel" className={input} required maxLength={40}
              value={f.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} />
          </div>
          <div>
            <label className={label} htmlFor="email">Email</label>
            <input id="email" type="email" className={input} maxLength={200}
              value={f.contact_email} onChange={(e) => set('contact_email', e.target.value)} />
          </div>
          <div>
            <label className={label} htmlFor="area">Area / neighborhood *</label>
            <input id="area" className={input} required maxLength={120} placeholder="e.g. Midtown, Fort Collins"
              value={f.area} onChange={(e) => set('area', e.target.value)} />
            <p className="mt-1 text-xs text-gray-500">Shown to members.</p>
          </div>
          <div>
            <label className={label} htmlFor="address">Full address</label>
            <input id="address" className={input} maxLength={300}
              value={f.address} onChange={(e) => set('address', e.target.value)} />
            <p className="mt-1 text-xs text-gray-500">Shared only with your helper.</p>
          </div>
        </div>

        <fieldset>
          <legend className={label}>What type of help do you need? *</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {Object.entries(HELP_LABELS).map(([k, v]) => (
              <label key={k} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                <input type="checkbox" checked={f.help_types.includes(k)} onChange={() => toggleHelp(k)} /> {v}
              </label>
            ))}
          </div>
          {f.help_types.includes('other') && (
            <input className={input} required maxLength={200} placeholder="Please describe"
              value={f.other_help} onChange={(e) => set('other_help', e.target.value)} />
          )}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={label} htmlFor="urgency">How soon?</label>
            <select id="urgency" className={input} value={f.urgency} onChange={(e) => set('urgency', e.target.value)}>
              {Object.entries(URGENCY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="date">Date needed</label>
            <input id="date" type="date" min={today} className={input}
              value={f.needed_on} onChange={(e) => set('needed_on', e.target.value)} />
          </div>
          <div>
            <label className={label} htmlFor="time">Time</label>
            <input id="time" className={input} maxLength={120} placeholder="e.g. 10am–12pm"
              value={f.time_window} onChange={(e) => set('time_window', e.target.value)} />
          </div>
        </div>

        <div>
          <label className={label} htmlFor="details">Details *</label>
          <textarea id="details" className={input} rows={5} required maxLength={2000}
            placeholder="What do you need help with? For rides: pickup and drop-off places, round trip or not, wheelchair or mobility needs. For groceries: what to buy and how you'll pay."
            value={f.details} onChange={(e) => set('details', e.target.value)} />
          <p className="mt-1 text-xs text-gray-500">Shown to members. Please do not include your phone number or address here.</p>
        </div>

        <div>
          <label className={label} htmlFor="pref">Preferred helper</label>
          <select id="pref" className={input} value={f.preferred_helper} onChange={(e) => set('preferred_helper', e.target.value)}>
            <option value="any">Anyone</option>
            <option value="Female">Sister</option>
            <option value="Male">Brother</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">Only members matching this preference will see your request.</p>
        </div>

        <label className="flex items-start gap-2 rounded-lg bg-gray-50 p-3 text-sm">
          <input type="checkbox" className="mt-1" checked={f.agreed} onChange={(e) => set('agreed', e.target.checked)} />
          <span>
            I understand that this network relies on community goodwill and volunteer availability, and that help is not
            guaranteed. All shared details will be treated respectfully and used only to coordinate this request.
          </span>
        </label>

        {error && <p className="text-red-600">{error}</p>}

        <button type="submit" disabled={saving}
          className="rounded-xl bg-[#006400] px-6 py-3 font-medium text-white shadow hover:opacity-90 disabled:opacity-60">
          {saving ? 'Submitting…' : 'Submit request'}
        </button>
      </form>
    </section>
  );
}
