// src/app/modules/membership/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Recurrence = 'one_time' | 'yearly';
type Sex = 'male' | 'female' | 'other' | 'prefer_not_to_say';
type MemberType = 'student' | 'senior' | 'regular' | 'youth';

type MemberInput = {
  name: string;
  age: number | '';
  sex: Sex | '';
  email: string;
  phone: string;
  membership_type: MemberType | '';
};

type PriceRow = { amount_cents: number; min_age: number | null; max_age: number | null };
type PriceMap = Partial<Record<MemberType, PriceRow>>;

export default function MembershipStartPage() {
  // Members: first one is the Primary Contact
  const [members, setMembers] = useState<MemberInput[]>([
    { name: '', age: '', sex: '', email: '', phone: '', membership_type: '' },
  ]);
  const [recurrence, setRecurrence] = useState<Recurrence>('one_time');
  const [submitting, setSubmitting] = useState(false);
  const [prices, setPrices] = useState<PriceMap | null>(null);
  const [loadingPrices, setLoadingPrices] = useState(true);

  // Fetch dynamic prices from API (reads membership_pricing table)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/membership/pricing', { cache: 'no-store' });
        const json = await res.json();
        setPrices(json?.prices || null);
      } catch {
        setPrices(null);
      } finally {
        setLoadingPrices(false);
      }
    })();
  }, []);

  const addMember = () =>
    setMembers((m) => [...m, { name: '', age: '', sex: '', email: '', phone: '', membership_type: '' }]);

  const removeMember = (i: number) =>
    setMembers((m) => m.filter((_, idx) => idx !== i));

  // Amount helper (USD) from dynamic prices; sensible fallback if prices missing
  const amountFor = (t: MemberType, ageNum: number) => {
    const fallback: Record<MemberType, number> = { student: 1500, senior: 1500, regular: 2500, youth: 0 };
    const row = prices?.[t];
    const cents = row?.amount_cents ?? fallback[t];

    // Enforce youth age cap if provided (e.g., <= 17)
    if (t === 'youth' && row?.max_age != null && ageNum > row.max_age) {
      const regCents = prices?.regular?.amount_cents ?? fallback.regular;
      return regCents / 100;
    }
    return cents / 100;
  };

  const totals = useMemo(() => {
    const subtotal = members.reduce((sum, m) => {
      const ageNum = Number(m.age || 0);
      const t = (m.membership_type || 'regular') as MemberType;
      return sum + amountFor(t, ageNum);
    }, 0);
    return { subtotal, totalLabel: `$${subtotal}` };
  }, [members, prices]);

  const validateMembers = (): string | null => {
    if (members.length === 0) return 'Please add at least one family member.';
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      const ageNum = Number(m.age || 0);
      if (!m.name || !ageNum || !m.sex || !m.membership_type) {
        return `Please complete all required fields for member #${i + 1}.`;
      }
      // Guard: Youth must be under cap if pricing defines one
      if (m.membership_type === 'youth') {
        const cap = prices?.youth?.max_age ?? 17;
        if (ageNum > cap) return `Member #${i + 1}: Youth must be under ${cap + 1}.`;
      }
    }
    return null;
  };

  const onCheckout = async () => {
    const err = validateMembers();
    if (err) {
      alert(err);
      return;
    }

    // Primary contact = first member
    const primary = {
      name: members[0].name.trim(),
      email: members[0].email.trim(),
      phone: members[0].phone.trim(),
    };

    const cleanMembers = members.map((m) => ({
      name: m.name.trim(),
      age: Number(m.age || 0),
      sex: m.sex as Sex,
      email: m.email.trim(),
      phone: m.phone.trim(),
      membership_type: m.membership_type as MemberType,
    }));

    setSubmitting(true);
    try {
      const res = await fetch('/api/stripe/membership/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primary, recurrence, members: cleanMembers }),
      });
      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await res.json() : { error: await res.text() };
      if (res.ok && (data as any).url) {
        window.location.href = (data as any).url as string;
      } else {
        alert((data as any)?.error || 'Failed to start checkout.');
      }
    } catch (e: any) {
      alert(e?.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  // Display helpers
  const priceDisplay = (cents: number | undefined, fallback: number) =>
    `$${((cents ?? fallback) / 100).toFixed(0)}`;

  return (
    <div className="min-h-screen bg-white">
      {/* ICFC green top bar */}
      <div className="h-1 w-full bg-emerald-700" />

      <div className="mx-auto max-w-7xl px-4 py-10">
        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-r from-emerald-700 to-emerald-600 p-6 text-white shadow-md">
          <h1 className="text-3xl font-semibold">Become a Member</h1>
          <p className="mt-1 text-emerald-100">
            Join the ICFC family—add your household members, pick one-time or recurring yearly support, and checkout
            securely with Stripe.
          </p>
        </div>

        {/* Board note + primary note */}
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <p className="font-medium">Only one form per family is required. Do not fill duplicate forms.</p>
          <p className="text-sm">
            The <strong>first family member</strong> you add is treated as the <strong>Primary Contact</strong> for
            receipts and updates.
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {/* Left column: form */}
          <div className="md:col-span-2 space-y-8">
            {/* Family Members */}
            <section className="rounded-2xl border border-gray-200 p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-baseline gap-2">
      <h2 className="text-lg font-semibold text-gray-900">Family Members</h2>
      <span className="text-xs text-gray-500">(Spouse and other)</span>
    </div>
                <button
                  onClick={addMember}
                  className="rounded-xl border border-emerald-600 px-4 py-2 text-emerald-700 hover:bg-emerald-50"
                >
                  Add member
                </button>
              </div>

              <div className="space-y-3">
                {members.map((m, i) => {
                  const ageNum = Number(m.age || 0);
                  const t = (m.membership_type || 'regular') as MemberType;
                  const per = amountFor(t, ageNum);
                  const isPrimary = i === 0;

                  return (
                    <div key={i} className="grid gap-3 rounded-xl border p-3 md:grid-cols-12">
                      {/* Full name */}
                      <div className="md:col-span-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-gray-700">Full Name</label>
                          {isPrimary && (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                              Primary
                            </span>
                          )}
                        </div>
                        <input
                          className="mt-1 w-full rounded-lg border p-2 outline-none focus:ring-2 focus:ring-emerald-600"
                          placeholder="Full name"
                          value={m.name}
                          onChange={(e) =>
                            setMembers((s) => s.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))
                          }
                        />
                      </div>

                      {/* Age */}
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-700">Age</label>
                        <input
                          className="mt-1 w-full rounded-lg border p-2 outline-none focus:ring-2 focus:ring-emerald-600"
                          placeholder="Age"
                          type="number"
                          min={0}
                          value={m.age}
                          onChange={(e) =>
                            setMembers((s) => s.map((x, idx) => (idx === i ? { ...x, age: e.target.value as any } : x)))
                          }
                        />
                      </div>

                      {/* Sex */}
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-700">Sex</label>
                        <select
                          className="mt-1 w-full rounded-lg border p-2 outline-none focus:ring-2 focus:ring-emerald-600"
                          value={m.sex || ''}
                          onChange={(e) =>
                            setMembers((s) => s.map((x, idx) => (idx === i ? { ...x, sex: e.target.value as any } : x)))
                          }
                        >
                          <option value="">Select…</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>

                      {/* Email */}
                      <div className="md:col-span-3">
                        <label className="text-sm font-medium text-gray-700">Email</label>
                        <input
                          className="mt-1 w-full rounded-lg border p-2 outline-none focus:ring-2 focus:ring-emerald-600"
                          placeholder="Email"
                          value={m.email}
                          onChange={(e) =>
                            setMembers((s) => s.map((x, idx) => (idx === i ? { ...x, email: e.target.value } : x)))
                          }
                        />
                      </div>

                      {/* Phone */}
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-700">Phone</label>
                        <input
                          className="mt-1 w-full rounded-lg border p-2 outline-none focus:ring-2 focus:ring-emerald-600"
                          placeholder="Phone"
                          value={m.phone}
                          onChange={(e) =>
                            setMembers((s) => s.map((x, idx) => (idx === i ? { ...x, phone: e.target.value } : x)))
                          }
                        />
                      </div>

                      {/* Membership Type */}
                      <div className="md:col-span-3">
                        <label className="text-sm font-medium text-gray-700">Type of Membership</label>
                        <select
                          className="mt-1 w-full rounded-lg border p-2 outline-none focus:ring-2 focus:ring-emerald-600"
                          value={m.membership_type || ''}
                          onChange={(e) =>
                            setMembers((s) =>
                              s.map((x, idx) =>
                                idx === i ? { ...x, membership_type: e.target.value as MemberType } : x
                              )
                            )
                          }
                        >
                          <option value="">Select…</option>
                          <option value="student">Student — {priceDisplay(prices?.student?.amount_cents, 1500)}</option>
                          <option value="senior">Senior — {priceDisplay(prices?.senior?.amount_cents, 1500)}</option>
                          <option value="regular">Regular — {priceDisplay(prices?.regular?.amount_cents, 2500)}</option>
                          <option value="youth">
                            Youth (under {((prices?.youth?.max_age ?? 17) + 1)}) — {priceDisplay(prices?.youth?.amount_cents, 0)}
                          </option>
                        </select>
                      </div>

                      {/* Price + Remove (padded cell) */}
                      <div className="md:col-span-1 flex items-end justify-between gap-3 rounded-lg md:bg-gray-50 p-2">
                        <div className="text-s text-gray-600">Amount:</div>
                        <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-s font-semibold text-emerald-700">
                          ${per}
                        </span>
                        <button
                          onClick={() => removeMember(i)}
                          className="rounded-lg border px-3 py-1 bg-red-100 text-gray-700 hover:bg-gray-100"
                          aria-label={`Remove member ${i + 1}`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Payment preference */}
            <section className="rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">Payment Preference</h2>
              <div className="flex flex-wrap gap-4">
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 hover:bg-gray-50">
                  <input
                    type="radio"
                    name="recurrence"
                    checked={recurrence === 'one_time'}
                    onChange={() => setRecurrence('one_time')}
                  />
                  <span>One-time (covers one year, no auto renew)</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 hover:bg-gray-50">
                  <input
                    type="radio"
                    name="recurrence"
                    checked={recurrence === 'yearly'}
                    onChange={() => setRecurrence('yearly')}
                  />
                  <span>Recurring: Yearly (renews every year)</span>
                </label>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Pricing is per member and set by the board. Youth under {((prices?.youth?.max_age ?? 17) + 1)} are free.
              </p>
            </section>

            {/* Submit */}
            <section className="flex items-center justify-between">
              <div className="text-lg font-semibold">
                Total today:{' '}
                <span className="text-emerald-700">
                  {loadingPrices ? '—' : totals.totalLabel}
                </span>
              </div>
              <button
                disabled={submitting || loadingPrices}
                onClick={onCheckout}
                className="rounded-2xl bg-emerald-700 px-6 py-3 font-medium text-white shadow hover:bg-emerald-800 disabled:opacity-60"
              >
                {submitting ? 'Redirecting…' : 'Continue to Secure Checkout'}
              </button>
            </section>
          </div>

          {/* Right column: benefits / info */}
          <aside className="space-y-6">
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm">
              <h3 className="mb-2 text-lg font-semibold text-amber-900">Membership Benefits</h3>
              <ul className="list-disc pl-5 text-sm text-amber-900/90 space-y-1">
                <li>Access to the ICFC Member Portal</li>
                <li>Discounts on community classes and events</li>
                <li>Priority notifications & seating for special programs</li>
                <li>Voting eligibility (where applicable)</li>
              </ul>
            </div>

            <div className="rounded-2xl border p-5 shadow-sm">
              <h3 className="mb-2 text-lg font-semibold text-gray-900">Pricing Overview</h3>
              <p className="text-sm text-gray-600">
                Each household member selects a membership type. Youth under {((prices?.youth?.max_age ?? 17) + 1)} are free.
              </p>

              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-lg border p-3 text-center">
                  <div className="font-semibold text-emerald-700">
                    {priceDisplay(prices?.student?.amount_cents, 1500)}
                  </div>
                  <div className="text-gray-600">Student</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="font-semibold text-emerald-700">
                    {priceDisplay(prices?.senior?.amount_cents, 1500)}
                  </div>
                  <div className="text-gray-600">Senior</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="font-semibold text-emerald-700">
                    {priceDisplay(prices?.regular?.amount_cents, 2500)}
                  </div>
                  <div className="text-gray-600">Regular</div>
                </div>
                <div className="col-span-3 rounded-lg border p-3 text-center">
                  <div className="font-semibold text-emerald-700">
                    {priceDisplay(prices?.youth?.amount_cents, 0)}
                  </div>
                  <div className="text-gray-600">
                    Youth (under {((prices?.youth?.max_age ?? 17) + 1)})
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border p-5 shadow-sm">
              <h3 className="mb-2 text-lg font-semibold text-gray-900">Need help?</h3>
              <p className="text-sm text-gray-600">
                Questions about membership?{' '}
                <Link href="/modules/contact" className="text-emerald-700 underline">
                  Contact us
                </Link>
                .
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
