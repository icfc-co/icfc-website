'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import countryList from 'react-select-country-list';
import { BellAlertIcon, CheckCircleIcon, EnvelopeIcon, PencilSquareIcon, UserCircleIcon, UsersIcon } from '@heroicons/react/24/outline';
import { supabase } from '@/lib/supabaseClient';
import AnnouncementCards from '@/components/announcements/AnnouncementCards';
import {
  ManagedMembership, MembershipStatusActions, MultipleMembershipsNotice, useMemberships,
} from '@/components/membership/MembershipStatus';

type Profile = {
  name: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  age: number | '';
  gender: string;
};

type Member = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  age: number | null;
  sex: string | null;
  membership_type: string | null;
  designation: string | null;
  member_uid: number | null;
  self: boolean;
  canEdit: boolean;
  canEditEmail: boolean;
};

type Household = {
  id: string;
  primary_name: string | null;
  start_date: string | null;
  end_date: string | null;
  subscription_status: string | null;
  isPrimary: boolean;
  members: Member[];
};

type Data = { email: string | null; pendingEmail: string | null; profile: Partial<Profile> | null; households: Household[] };

const EMPTY: Profile = { name: '', phone: '', address: '', city: '', country: '', age: '', gender: '' };

const DESIGNATION: Record<string, string> = {
  head_of_household: 'Head of household',
  spouse: 'Spouse',
  father_or_father_in_law: 'Father / father-in-law',
  mother_or_mother_in_law: 'Mother / mother-in-law',
  son_or_son_in_law: 'Son / son-in-law',
  daughter_or_daughter_in_law: 'Daughter / daughter-in-law',
  other: 'Other',
};

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json?.error || `Request failed (${res.status})`), { errors: json?.errors });
  return json as T;
}

const input = 'mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';
const label = 'block text-sm font-medium text-gray-700';
const card = 'rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8';

export default function MyProfilePage() {
  const [data, setData] = useState<Data | null>(null);
  const [loadError, setLoadError] = useState('');
  const [role, setRole] = useState('');

  const load = useCallback(async () => {
    try {
      setData(await api<Data>('/api/profile'));
      setLoadError('');
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: r } = await supabase.from('user_roles').select('roles(name)').eq('user_id', user.id).maybeSingle();
      const rel = (r as { roles?: { name?: string } | { name?: string }[] } | null)?.roles;
      setRole((Array.isArray(rel) ? rel[0]?.name : rel?.name) ?? '');
    })();
  }, [load]);

  if (loadError) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-red-600">{loadError}</p>
        <Link href="/login" className="mt-4 inline-block font-semibold text-primary underline">Sign in</Link>
      </main>
    );
  }
  if (!data) return <main className="mx-auto max-w-4xl px-4 py-16 text-center text-gray-500">Loading your profile…</main>;

  const myIds = [...new Set(data.households.flatMap((h) => h.members.filter((m) => m.self && m.member_uid).map((m) => m.member_uid)))];

  return (
    <main className="min-h-screen bg-gray-50 pb-16 font-body text-gray-900">
      <section className="bg-gradient-to-br from-[#004d00] via-primary to-[#0b7a3b] text-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-4 px-4 pb-20 pt-10 sm:px-6">
          <UserCircleIcon className="h-16 w-16 text-white/80" aria-hidden />
          <div>
            <h1 className="font-heading text-3xl font-bold">{data.profile?.name || 'My Profile'}</h1>
            <p className="mt-1 text-white/85">{data.email}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              {role && <span className="rounded-full bg-white/15 px-3 py-0.5 capitalize">{role.replace('_', ' ')}</span>}
              {myIds.map((id) => (
                <span key={id} className="rounded-full bg-secondary px-3 py-0.5 font-semibold text-gray-900">Member ID {id}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto -mt-12 max-w-4xl space-y-6 px-4 sm:px-6">
        <AnnouncementCards scope="members" title="Member announcements" className={card} />
        <PersonalDetails initial={{ ...EMPTY, ...(data.profile ?? {}), age: (data.profile?.age as number) ?? '' }} onSaved={load} />
        <LoginEmail email={data.email} pending={data.pendingEmail} />
        {['super_admin', 'admin', 'volunteer'].includes(role) && <StaffAlerts />}
        <Memberships households={data.households} onSaved={load} />
      </div>
    </main>
  );
}

/* ------------------------------ Personal details ------------------------------ */

function PersonalDetails({ initial, onSaved }: { initial: Profile; onSaved: () => void }) {
  const [f, setF] = useState<Profile>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const countries = useMemo(() => countryList().getData(), []);
  const set = (k: keyof Profile, v: string | number) => { setF((p) => ({ ...p, [k]: v })); setSaved(false); };

  const incomplete = (['name', 'phone', 'address', 'city', 'country', 'age', 'gender'] as const).filter((k) => !initial[k]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      await api('/api/profile', { method: 'PATCH', body: JSON.stringify(f) });
      setSaved(true);
      onSaved();
    } catch (err) {
      const e2 = err as Error & { errors?: Record<string, string> };
      setErrors(e2.errors ?? { form: e2.message });
    } finally {
      setSaving(false);
    }
  };

  const field = (k: keyof Profile, text: string, el: React.ReactNode) => (
    <div>
      <label className={label} htmlFor={k}>{text} <span className="text-red-600">*</span></label>
      {el}
      {errors[k] && <p className="mt-1 text-xs text-red-600">{errors[k]}</p>}
    </div>
  );

  return (
    <form onSubmit={save} className={card}>
      <h2 className="flex items-center gap-2 font-heading text-xl font-bold">
        <PencilSquareIcon className="h-6 w-6 text-primary" aria-hidden /> Personal details
      </h2>
      {incomplete.length > 0 && (
        <p className="mt-3 rounded-xl bg-yellow-50 p-3 text-sm text-yellow-900">Please complete your profile.</p>
      )}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {field('name', 'Full name', <input id="name" className={input} value={f.name} maxLength={120} onChange={(e) => set('name', e.target.value)} />)}
        {field('phone', 'Phone', <input id="phone" type="tel" className={input} value={f.phone} maxLength={40} onChange={(e) => set('phone', e.target.value)} />)}
        <div className="sm:col-span-2">
          {field('address', 'Street address', <input id="address" className={input} value={f.address} maxLength={300} onChange={(e) => set('address', e.target.value)} />)}
        </div>
        {field('city', 'City', <input id="city" className={input} value={f.city} maxLength={120} onChange={(e) => set('city', e.target.value)} />)}
        {field('country', 'Country',
          <select id="country" className={input} value={f.country} onChange={(e) => set('country', e.target.value)}>
            <option value="">Select country…</option>
            {countries.map((c) => <option key={c.value} value={c.label}>{c.label}</option>)}
          </select>
        )}
        {field('age', 'Age', <input id="age" type="number" min={1} max={120} className={input} value={f.age} onChange={(e) => set('age', e.target.value === '' ? '' : Number(e.target.value))} />)}
        {field('gender', 'Gender',
          <select id="gender" className={input} value={f.gender} onChange={(e) => set('gender', e.target.value)}>
            <option value="">Select…</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        )}
      </div>
      {errors.form && <p className="mt-4 text-sm text-red-600">{errors.form}</p>}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={saving} className="rounded-full bg-primary px-6 py-2.5 font-semibold text-white shadow-sm hover:bg-green-800 disabled:opacity-60">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
            <CheckCircleIcon className="h-5 w-5" aria-hidden /> Saved
          </span>
        )}
        <span className="text-xs text-gray-500">Your phone and gender are also updated on your membership record.</span>
      </div>
    </form>
  );
}

/* --------------------------------- Login email -------------------------------- */

function LoginEmail({ email, pending }: { email: string | null; pending: string | null }) {
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    const v = next.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return setErr('Enter a valid email address.');
    if (v === (email ?? '').toLowerCase()) return setErr('That is already your email.');
    setBusy(true);
    const { error } = await supabase.auth.updateUser(
      { email: v },
      { emailRedirectTo: `${window.location.origin}/my-profile` }
    );
    setBusy(false);
    if (error) return setErr(error.message);
    setMsg(`We sent a confirmation link to ${v}. Your login email changes after you click it (you may also get a link at your current address to approve the change).`);
    setOpen(false);
    setNext('');
  };

  return (
    <div className={card}>
      <h2 className="flex items-center gap-2 font-heading text-xl font-bold">
        <EnvelopeIcon className="h-6 w-6 text-primary" aria-hidden /> Login email
      </h2>
      <p className="mt-3 text-gray-700">
        You sign in with <strong>{email}</strong>.
      </p>
      {pending && !msg && (
        <p className="mt-2 rounded-xl bg-yellow-50 p-3 text-sm text-yellow-900">
          A change to <strong>{pending}</strong> is waiting for you to confirm it from your email.
        </p>
      )}
      {msg && <p className="mt-3 rounded-xl bg-green-50 p-3 text-sm text-green-900">{msg}</p>}

      {open ? (
        <form onSubmit={submit} className="mt-4 max-w-md">
          <label className={label} htmlFor="newEmail">New email</label>
          <input id="newEmail" type="email" className={input} value={next} onChange={(e) => setNext(e.target.value)} autoFocus />
          {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
          <p className="mt-2 text-xs text-gray-500">
            Your membership moves to the new email automatically once you confirm it.
          </p>
          <div className="mt-3 flex gap-2">
            <button type="submit" disabled={busy} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {busy ? 'Sending…' : 'Send confirmation link'}
            </button>
            <button type="button" onClick={() => { setOpen(false); setErr(''); }} className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => { setOpen(true); setMsg(''); }} className="mt-4 rounded-full border border-primary px-5 py-2 text-sm font-semibold text-primary hover:bg-green-50">
          Change login email
        </button>
      )}
    </div>
  );
}

/* -------------------------------- Email alerts -------------------------------- */

type Alert = { key: string; label: string; on: boolean };

function StaffAlerts() {
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    api<{ alerts: Alert[]; email: string }>('/api/profile/alerts')
      .then((j) => { setAlerts(j.alerts); setEmail(j.email); })
      .catch((e) => { setErr((e as Error).message); setAlerts([]); });
  }, []);

  const toggle = async (a: Alert) => {
    setBusy(a.key);
    setErr('');
    try {
      await api('/api/profile/alerts', { method: 'PUT', body: JSON.stringify({ key: a.key, on: !a.on }) });
      setAlerts((p) => p?.map((x) => (x.key === a.key ? { ...x, on: !a.on } : x)) ?? p);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy('');
    }
  };

  if (alerts && !alerts.length && !err) return null;

  return (
    <div className={card}>
      <h2 className="flex items-center gap-2 font-heading text-xl font-bold">
        <BellAlertIcon className="h-6 w-6 text-primary" aria-hidden /> Email alerts
      </h2>
      <p className="mt-3 text-gray-700">
        We email <strong>{email}</strong> when a new request arrives on a dashboard you can see. Turn off any you don’t need.
      </p>
      {alerts === null ? (
        <p className="mt-4 text-sm text-gray-500">Loading…</p>
      ) : (
        <ul className="mt-4 divide-y divide-gray-100">
          {alerts.map((a) => (
            <li key={a.key} className="flex items-center justify-between gap-4 py-3">
              <span className="text-sm font-medium text-gray-800">{a.label}</span>
              <button
                type="button"
                role="switch"
                aria-checked={a.on}
                aria-label={a.label}
                disabled={busy === a.key}
                onClick={() => toggle(a)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-60 ${a.on ? 'bg-primary' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${a.on ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
    </div>
  );
}

/* --------------------------------- Memberships -------------------------------- */

function Memberships({ households, onSaved }: { households: Household[]; onSaved: () => void }) {
  const { memberships, reload } = useMemberships();
  const [notice, setNotice] = useState('');
  const statusOf = (id: string): ManagedMembership | undefined => memberships?.find((m) => m.id === id);

  if (!households.length) {
    return (
      <div className={card}>
        <h2 className="flex items-center gap-2 font-heading text-xl font-bold">
          <UsersIcon className="h-6 w-6 text-primary" aria-hidden /> Membership
        </h2>
        <p className="mt-3 text-gray-700">You don&apos;t have an active ICFC membership linked to this email.</p>
        <Link href="/modules/registration/membership" className="mt-4 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white">
          Become a member
        </Link>
      </div>
    );
  }

  return (
    <>
      {notice && <p className="rounded-2xl bg-white p-4 text-sm font-medium text-primary shadow-sm ring-1 ring-black/5">{notice}</p>}
      <MultipleMembershipsNotice count={households.length} />
      {households.map((h, i) => (
        <div key={h.id} className={card}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-heading text-xl font-bold">
                <UsersIcon className="h-6 w-6 text-primary" aria-hidden /> {households.length > 1 ? `Membership ${i + 1}` : 'My membership'}
              </h2>
              <p className="mt-1 text-sm text-gray-600">Household of {h.primary_name}</p>
            </div>
            <Link href={`/modules/registration/membership/manage#membership-${h.id}`} className="rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-green-50">
              Details
            </Link>
          </div>
          <div className="mt-4">
            {statusOf(h.id) ? (
              <MembershipStatusActions m={statusOf(h.id)!} onChanged={(n) => { setNotice(n); reload(); onSaved(); }} />
            ) : (
              <p className="text-sm text-gray-500">{memberships ? '' : 'Checking membership status…'}</p>
            )}
          </div>
          <ul className="mt-5 divide-y divide-gray-100">
            {h.members.map((m) => <MemberRowView key={m.id} m={m} onSaved={onSaved} />)}
          </ul>
          <p className="mt-4 text-xs text-gray-500">
            {h.isPrimary
              ? 'As the primary contact, you can update everyone in your household.'
              : 'You can update your own details. The primary contact can update the rest of the household.'}{' '}
            To change an age or membership type, please <Link href="/modules/contact" className="underline">contact ICFC</Link>.
          </p>
        </div>
      ))}
    </>
  );
}

function MemberRowView({ m, onSaved }: { m: Member; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({ name: m.name ?? '', phone: m.phone ?? '', email: m.email ?? '', sex: m.sex ?? '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await api(`/api/profile/members/${m.id}`, { method: 'PATCH', body: JSON.stringify(f) });
      setEditing(false);
      onSaved();
    } catch (err) {
      const e2 = err as Error & { errors?: Record<string, string> };
      setErrors(e2.errors ?? { form: e2.message });
    } finally {
      setBusy(false);
    }
  };

  if (!editing) {
    return (
      <li className="flex flex-wrap items-center gap-3 py-4">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {m.name}
            {m.self && <span className="ml-2 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-primary">You</span>}
          </p>
          <p className="text-sm text-gray-600">
            {[m.designation && DESIGNATION[m.designation], m.membership_type && `${m.membership_type} member`, m.age ? `age ${m.age}` : null]
              .filter(Boolean).join(' · ')}
          </p>
          <p className="text-sm text-gray-500">{[m.email, m.phone].filter(Boolean).join(' · ') || 'No contact details'}</p>
        </div>
        {m.member_uid && <span className="rounded-full bg-gray-100 px-3 py-1 font-mono text-sm font-semibold">ID {m.member_uid}</span>}
        {m.canEdit && (
          <button onClick={() => setEditing(true)} className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-semibold hover:bg-gray-50">
            Edit
          </button>
        )}
      </li>
    );
  }

  return (
    <li className="py-4">
      <form onSubmit={save} className="rounded-2xl bg-gray-50 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={label}>Name</label>
            <input className={input} value={f.name} maxLength={120} onChange={(e) => setF({ ...f, name: e.target.value })} />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>
          <div>
            <label className={label}>Phone</label>
            <input className={input} type="tel" value={f.phone} maxLength={40} onChange={(e) => setF({ ...f, phone: e.target.value })} />
            {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
          </div>
          <div>
            <label className={label}>Email</label>
            <input className={`${input} disabled:bg-gray-100 disabled:text-gray-500`} type="email" value={f.email} disabled={!m.canEditEmail}
              onChange={(e) => setF({ ...f, email: e.target.value })} />
            {!m.canEditEmail && <p className="mt-1 text-xs text-gray-500">This is your login email. Use “Change login email” above.</p>}
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
          </div>
          <div>
            <label className={label}>Gender</label>
            <select className={input} value={f.sex} onChange={(e) => setF({ ...f, sex: e.target.value })}>
              <option value="">Not set</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>
        {errors.form && <p className="mt-3 text-sm text-red-600">{errors.form}</p>}
        <div className="mt-4 flex gap-2">
          <button type="submit" disabled={busy} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={() => { setEditing(false); setErrors({}); }} className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold">
            Cancel
          </button>
        </div>
      </form>
    </li>
  );
}
