// src/app/modules/membership/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Recurrence = 'one_time' | 'yearly';
type Sex = 'male' | 'female';
type MemberType = 'student' | 'senior' | 'regular' | 'youth';

// Single dropdown values that match your requested labels
type Designation =
  | 'head_of_household'
  | 'spouse'
  | 'father_or_father_in_law'
  | 'mother_or_mother_in_law'
  | 'son_or_son_in_law'
  | 'daughter_or_daughter_in_law'
  | 'other';

type MemberInput = {
  name: string;
  age: number | '';
  sex: Sex | '';
  email: string;
  phone: string;
  membership_type: MemberType | '';
  designation: Designation | ''; // NEW
};

type PriceRow = { amount_cents: number; min_age: number | null; max_age: number | null };
type PriceMap = Partial<Record<MemberType, PriceRow>>;

export default function MembershipStartPage() {
  // Members: first one is the Primary Contact
  const [members, setMembers] = useState<MemberInput[]>([
    {
      name: '',
      age: '',
      sex: '',
      email: '',
      phone: '',
      membership_type: '',
      designation: 'head_of_household', // first member auto HoH
    },
  ]);
  const [recurrence, setRecurrence] = useState<Recurrence>('one_time');
  const [submitting, setSubmitting] = useState(false);
  const [prices, setPrices] = useState<PriceMap | null>(null);
  const [loadingPrices, setLoadingPrices] = useState(true);

  // Ensure index 0 is always Head of Household
  useEffect(() => {
    setMembers((prev) => {
      if (prev.length === 0) {
        return [
          {
            name: '',
            age: '',
            sex: '',
            email: '',
            phone: '',
            membership_type: '',
            designation: 'head_of_household',
          },
        ];
      }
      if (prev[0].designation !== 'head_of_household') {
        const copy = [...prev];
        copy[0] = { ...copy[0], designation: 'head_of_household' };
        return copy;
      }
      return prev;
    });
  }, []);

  // Fetch dynamic prices
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
    setMembers((m) => [
      ...m,
      {
        name: '',
        age: '',
        sex: '',
        email: '',
        phone: '',
        membership_type: '',
        designation: '', // let user choose for non-primary
      },
    ]);

  const removeMember = (i: number) =>
    setMembers((m) => {
      const next = m.filter((_, idx) => idx !== i);
      // If we removed the first, make new first HoH
      if (next.length > 0) next[0] = { ...next[0], designation: 'head_of_household' };
      return next;
    });

  // Amount helper (USD)
  const amountFor = (t: MemberType, ageNum: number) => {
    const fallback: Record<MemberType, number> = { student: 1500, senior: 1500, regular: 2500, youth: 0 };
    const row = prices?.[t];
    const cents = row?.amount_cents ?? fallback[t];
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

  // ── Validation helpers ────────────────────────────────────────────────────────
  const validateMembers = (): string | null => {
    if (members.length === 0) return 'Please add at least one member.';

    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      const idx = i + 1;
      const ageNum = Number(m.age);

      if (!m.name.trim()) return `Member #${idx}: Full name is required.`;
      //if (!ageNum || ageNum < 0) return `Member #${idx}: Please enter a valid age.`;
      if (!m.sex) return `Member #${idx}: Please select sex.`;
      if (!m.email.trim()) return `Member #${idx}: Email is required.`;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email.trim()))
        return `Member #${idx}: Please enter a valid email address.`;
      if (!m.phone.trim()) return `Member #${idx}: Phone is required.`;
      if (!m.membership_type) return `Member #${idx}: Please select a membership type.`;
      if (i === 0 && m.designation !== 'head_of_household')
        return `Member #${idx}: Primary must be Head of Household.`;
      if (i > 0 && !m.designation) return `Member #${idx}: Please choose a designation.`;

      if (m.membership_type === 'youth') {
        const cap = prices?.youth?.max_age ?? 17;
        if (ageNum > cap) return `Member #${idx}: Youth must be under ${cap + 1}.`;
      }
    }

    // Uniqueness across NON-youth only
    const seenNonYouth = new Map<string, number>();
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      if (m.membership_type === 'youth') continue;
      const emailKey = m.email.trim().toLowerCase();
      const firstIdx = seenNonYouth.get(emailKey);
      if (firstIdx !== undefined) {
        return `Duplicate email among non-youth members: "${m.email}" is used for members #${firstIdx} and #${i + 1}. Each Regular/Student/Senior must use a unique email.`;
      }
      seenNonYouth.set(emailKey, i + 1);
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
      designation: (m.designation || (m === members[0] ? 'head_of_household' : 'other')) as Designation, // include in payload
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

  const priceDisplay = (cents: number | undefined, fallback: number) =>
    `$${((cents ?? fallback) / 100).toFixed(0)}`;

  const Req = () => <span className="text-red-600">*</span>;

  const designationLabel = (d: Designation | ''): string => {
    switch (d) {
      case 'head_of_household':
        return 'Head of Household';
      case 'spouse':
        return 'Spouse';
      case 'father_or_father_in_law':
        return 'Father / Father-in-Law';
      case 'mother_or_mother_in_law':
        return 'Mother / Mother-in-Law';
      case 'son_or_son_in_law':
        return 'Son / Son-in-Law';
      case 'daughter_or_daughter_in_law':
        return 'Daughter / Daughter-in-Law';
      case 'other':
        return 'Other';
      default:
        return 'Select…';
    }
  };

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
            The <strong>first member</strong> you add is treated as the <strong>Primary Contact</strong> and is
            automatically set as <strong>Head of Household</strong>.
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {/* Left column: form */}
          <div className="md:col-span-2 space-y-8">
            {/* Members being registered */}
            <section className="rounded-2xl border border-gray-200 p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-lg font-semibold text-gray-900">Members being registered</h2>
                </div>
              </div>

              <div className="space-y-3">
                {members.map((m, i) => {
                  const ageNum = Number(m.age || 0);
                  const t = (m.membership_type || 'regular') as MemberType;
                  const per = amountFor(t, ageNum);
                  const isPrimary = i === 0;

                  return (
                    <div key={i} className="grid gap-3 rounded-xl border p-3 md:grid-cols-12">
                      {/* Row title */}
                      <div className="md:col-span-12 -mb-1 flex items-center justify-between">
                        <div className="text-sm font-semibold text-gray-800">
                          Family Member #{i + 1}
                        </div>
                        {isPrimary && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            Primary (Head of Household)
                          </span>
                        )}
                      </div>

                      {/* Full name */}
                      <div className="md:col-span-3">
                        <label className="text-sm font-medium text-gray-700">
                          Full Name <Req />
                        </label>
                        <input
                          className="mt-1 w-full rounded-lg border p-2 outline-none focus:ring-2 focus:ring-emerald-600"
                          placeholder="Full name"
                          value={m.name}
                          required
                          onChange={(e) =>
                            setMembers((s) => s.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))
                          }
                        />
                      </div>

                      {/* Age */}
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-700">
                          Age
                        </label>
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

                      {/* Gender */}
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-700">
                          Sex <Req />
                        </label>
                        <select
                          className="mt-1 w-full rounded-lg border p-2 outline-none focus:ring-2 focus:ring-emerald-600"
                          value={m.sex || ''}
                          required
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
                        <label className="text-sm font-medium text-gray-700">
                          Email <Req />
                        </label>
                        <input
                          className="mt-1 w-full rounded-lg border p-2 outline-none focus:ring-2 focus:ring-emerald-600"
                          placeholder="Email"
                          type="email"
                          value={m.email}
                          required
                          onChange={(e) =>
                            setMembers((s) => s.map((x, idx) => (idx === i ? { ...x, email: e.target.value } : x)))
                          }
                        />
                      </div>

                      {/* Phone */}
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-700">
                          Phone <Req />
                        </label>
                        <input
                          className="mt-1 w-full rounded-lg border p-2 outline-none focus:ring-2 focus:ring-emerald-600"
                          placeholder="Phone"
                          value={m.phone}
                          required
                          onChange={(e) =>
                            setMembers((s) => s.map((x, idx) => (idx === i ? { ...x, phone: e.target.value } : x)))
                          }
                        />
                      </div>

                      {/* Designation */}
                      <div className="md:col-span-3">
                        <label className="text-sm font-medium text-gray-700">
                          Designation <Req />
                        </label>
                        <select
                          className="mt-1 w-full rounded-lg border p-2 outline-none focus:ring-2 focus:ring-emerald-600 disabled:bg-gray-100"
                          value={m.designation || (isPrimary ? 'head_of_household' : '')}
                          disabled={isPrimary}
                          required
                          onChange={(e) =>
                            setMembers((s) =>
                              s.map((x, idx) =>
                                idx === i ? { ...x, designation: e.target.value as Designation } : x
                              )
                            )
                          }
                        >
                          {isPrimary ? (
                            <option value="head_of_household">Head of Household</option>
                          ) : (
                            <>
                              <option value="">Select…</option>
                              <option value="spouse">Spouse</option>
                              <option value="father_or_father_in_law">Father / Father-in-Law</option>
                              <option value="mother_or_mother_in_law">Mother / Mother-in-Law</option>
                              <option value="son_or_son_in_law">Son / Son-in-Law</option>
                              <option value="daughter_or_daughter_in_law">Daughter / Daughter-in-Law</option>
                              <option value="other">Other</option>
                            </>
                          )}
                        </select>
                      </div>

                      {/* Membership Type + Amount + Remove */}
                      <div className="md:col-span-7 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end md:gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Type of Membership <Req />
                          </label>
                          <select
                            className="mt-1 w-full rounded-lg border p-2 outline-none focus:ring-2 focus:ring-emerald-600"
                            value={m.membership_type || ''}
                            required
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

                        <div className="mt-2 md:mt-0 flex items-center gap-2 md:pl-4 md:border-l md:border-gray-200">
                          <span className="hidden md:inline text-sm text-gray-600">Amount:</span>
                          <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                            ${per}
                          </span>
                        </div>

                        <div className="mt-2 md:mt-0">
                          {members.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeMember(i)}
                              className="h-[42px] rounded-lg border px-3 bg-red-100 text-gray-700 hover:bg-gray-100"
                              aria-label={`Remove member ${i + 1}`}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Add member at the bottom */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={addMember}
                    className="rounded-xl border border-emerald-600 px-4 py-2 text-emerald-700 hover:bg-emerald-50"
                  >
                    + Add member
                  </button>
                </div>
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
            <section className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-lg font-semibold">
                Total today:{' '}
                <span className="text-emerald-700">
                  {loadingPrices ? '—' : totals.totalLabel}
                </span>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={addMember}
                  className="rounded-xl border border-emerald-600 px-4 py-2 text-emerald-700 hover:bg-emerald-50"
                >
                  + Add member
                </button>

                <button
                  disabled={submitting || loadingPrices}
                  onClick={onCheckout}
                  className="rounded-2xl bg-emerald-700 px-6 py-3 font-medium text-white shadow hover:bg-emerald-800 disabled:opacity-60"
                >
                  {submitting ? 'Redirecting…' : 'Continue to Secure Checkout'}
                </button>
              </div>
            </section>
          </div>

          {/* Right column */}
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
