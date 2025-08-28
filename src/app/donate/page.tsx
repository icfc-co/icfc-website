'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Method = 'stripe' | 'zelle' | 'bank';
type Recurrence = 'one_time' | 'monthly';

const PRESETS = [50, 100, 250, 500, 1000];
const FUNDS = [
  { key: 'general',      label: 'Masjid Expenses (General)' },
  { key: 'zakat',        label: 'Zakat' },
  { key: 'cemetery',     label: 'Cemetery' },
  { key: 'imam_salary',  label: 'Imam/Alim Salary' },
  { key: 'membership',         label: 'Membership' },
  { key: 'other',         label: 'Other' },
];

// Map fund → Zelle recipient email (with NEXT_PUBLIC fallbacks)
function zelleEmailForFund(fund: string) {
  switch (fund) {
    case 'zakat':        return process.env.NEXT_PUBLIC_ZELLE_EMAIL_ZAKAT       || 'zakat@icfc.org';
    case 'cemetery':     return process.env.NEXT_PUBLIC_ZELLE_EMAIL_CEMETERY    || 'cemetery@icfc.org';
    case 'imam_salary':  return process.env.NEXT_PUBLIC_ZELLE_EMAIL_IMAM_SALARY || 'imamsalary@icfc.org';
    case 'dues':         return process.env.NEXT_PUBLIC_ZELLE_EMAIL_DUES        || process.env.NEXT_PUBLIC_ZELLE_EMAIL_GENERAL || 'info@icfc.org';
    case 'general':
    default:             return process.env.NEXT_PUBLIC_ZELLE_EMAIL_GENERAL     || 'info@icfc.org';
  }
}

// Safe JSON parse for fetch responses (avoids “Unexpected end of JSON input”)
async function safeJson(res: Response) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : null; }
  catch { return null; }
}

export default function DonatePage() {
  const router = useRouter();

  const [method, setMethod] = useState<Method>('stripe');
  const [amount, setAmount] = useState<number | ''>('');
  const [fund, setFund] = useState(FUNDS[0].key);
  const [recurrence, setRecurrence] = useState<Recurrence>('one_time');

  const [donorName, setDonorName]   = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [note, setNote]             = useState('');

  // Zelle fields
  const [transferDateZ, setTransferDateZ] = useState(''); // YYYY-MM-DD
  const [proofUrlZ, setProofUrlZ]         = useState('');
  const [last4, setLast4]                 = useState('');  // REQUIRED

  // Bank fields
  const [transferDateB, setTransferDateB] = useState(''); // YYYY-MM-DD
  const [proofUrlB, setProofUrlB]         = useState('');
  const [transactionId, setTransactionId] = useState(''); // REQUIRED

  const [submitting, setSubmitting] = useState(false);

  const amountCents = typeof amount === 'number' ? Math.round(amount * 100) : 0;
  const zelleEmail = useMemo(() => zelleEmailForFund(fund), [fund]);

  const bankRouting = process.env.NEXT_PUBLIC_BANK_ROUTING;
  const bankAccount = process.env.NEXT_PUBLIC_BANK_ACCOUNT;

  const primaryDisabled =
    submitting ||
    amountCents < 100 ||
    (method === 'zelle' && last4.trim().length < 4) ||
    (method === 'bank'  && transactionId.trim().length < 4);

  /** Stripe */
  async function startStripe() {
    if (amountCents < 100) return alert('Minimum is $1.00');
    setSubmitting(true);
    try {
      const res  = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents, fund, recurrence, donorEmail, donorName, note }),
      });
      const json = await safeJson(res);
      if (res.ok && json?.url) {
        window.location.href = json.url as string;
      } else {
        alert(json?.error || 'Failed to start Stripe checkout.');
      }
    } catch (e: any) {
      alert(e?.message || 'Network error.');
    } finally {
      setSubmitting(false);
    }
  }

  /** Zelle */
  async function submitZelle() {
    if (amountCents < 100) return alert('Please enter a valid amount.');
    if (last4.trim().length < 4) return alert('Please enter Zelle Ref Last 4.');

    setSubmitting(true);
    try {
      const res  = await fetch('/api/zelle/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donorName,
          donorEmail,
          amountCents,
          fund,
          note,
          transferDate: transferDateZ || null,
          proofUrl: proofUrlZ || null,
          last4: last4 || null,
        }),
      });
      const json = await safeJson(res);
      if (!res.ok) return alert(json?.error || 'Error submitting confirmation.');

      // Redirect to thank-you page (no alerts)
      router.replace(`/donate/thanks?m=zelle&a=${amountCents}&f=${encodeURIComponent(fund)}`);
    } catch (e: any) {
      alert(e?.message || 'Network error.');
    } finally {
      setSubmitting(false);
    }
  }

  /** Bank (ACH) */
  async function submitBank() {
    if (amountCents < 100) return alert('Please enter a valid amount.');
    if (!transactionId.trim()) return alert('Please enter the bank transaction ID.');

    setSubmitting(true);
    try {
      const res  = await fetch('/api/bank/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donorName,
          donorEmail,
          amountCents,
          fund,
          note,
          transferDate: transferDateB || null,
          proofUrl: proofUrlB || null,
          transactionId,
        }),
      });
      const json = await safeJson(res);
      if (!res.ok) return alert(json?.error || 'Error submitting confirmation.');

      router.replace(`/donate/thanks?m=bank&a=${amountCents}&f=${encodeURIComponent(fund)}`);
    } catch (e: any) {
      alert(e?.message || 'Network error.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0f2027] to-[#203a43] text-white">
      <section className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="font-[Montserrat] text-4xl font-bold mb-2">Support ICFC</h1>
        <p className="text-white/80 mb-8">Choose Stripe, Zelle, or Bank (ACH). JazakAllahu khairan.</p>

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {(['stripe','zelle','bank'] as Method[]).map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`rounded-2xl py-2 font-medium shadow transition
                ${method===m? 'bg-[#006400]' : 'bg-white/10 hover:bg-white/20'}`}
              aria-pressed={method===m}
            >
              {m.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Amount */}
        <div className="mb-6">
          <label className="block mb-2">Amount (USD)</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {PRESETS.map(v => (
              <button key={v} type="button"
                className={`px-4 py-2 rounded-xl transition
                  ${amount===v ? 'bg-[#FFD700] text-black' : 'bg-white/10 hover:bg-white/20'}`}
                onClick={() => setAmount(v)}>${v}</button>
            ))}
          </div>
          <input
            type="number" min={1} step={1}
            value={amount as number | ''} onChange={e => setAmount(e.target.value? Number(e.target.value): '')}
            className="w-full rounded-xl px-4 py-3 text-black" placeholder="Custom amount"
          />
        </div>

        {/* Funds */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {FUNDS.map(f => (
            <button key={f.key} onClick={() => setFund(f.key)}
              className={`rounded-2xl py-2 transition ${fund===f.key? 'bg-[#006400]' : 'bg-white/10 hover:bg-white/20'}`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Recurrence (Stripe only) */}
        {method==='stripe' && (
          <div className="mb-6 flex gap-2">
            {(['one_time','monthly'] as Recurrence[]).map(r => (
              <button key={r} onClick={()=> setRecurrence(r)}
                className={`rounded-2xl px-4 py-2 transition
                  ${recurrence===r? 'bg-[#FFD700] text-black' : 'bg-white/10 hover:bg-white/20'}`}>
                {r==='one_time' ? 'One-time' : 'Monthly'}
              </button>
            ))}
          </div>
        )}

        {/* Donor info */}
        <div className="mb-6 grid md:grid-cols-2 gap-3">
          <input className="rounded-xl px-4 py-3 text-black" placeholder="Your name (optional)" value={donorName} onChange={e=>setDonorName(e.target.value)} />
          <input className="rounded-xl px-4 py-3 text-black" placeholder="Email for receipt (optional)" value={donorEmail} onChange={e=>setDonorEmail(e.target.value)} />
          <textarea className="md:col-span-2 rounded-xl px-4 py-3 text-black" placeholder="Note (optional)" value={note} onChange={e=>setNote(e.target.value)} />
        </div>

        {/* ZELLE */}
        {method==='zelle' && (
          <div className="mb-6 space-y-4">
            <div className="bg-white/10 rounded-2xl p-4">
              <p className="mb-1">Send via Zelle to:</p>
              <p className="text-lg font-semibold">{zelleEmail}</p>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <input type="date" className="rounded-xl px-4 py-3 text-black" value={transferDateZ} onChange={e=>setTransferDateZ(e.target.value)} />
              <input className="rounded-xl px-4 py-3 text-black" placeholder="Proof URL (optional)" value={proofUrlZ} onChange={e=>setProofUrlZ(e.target.value)} />
              <input className="rounded-xl px-4 py-3 text-black" placeholder="Zelle Ref Last 4 *" value={last4} onChange={e=>setLast4(e.target.value)} maxLength={8} />
            </div>
            <p className="text-xs text-white/70">* Required for verification.</p>
          </div>
        )}

        {/* BANK (ACH) */}
        {method==='bank' && (
          <div className="mb-6 space-y-4">
            <div className="bg-white/10 rounded-2xl p-4">
              <p className="font-semibold mb-1">Bank Direct Deposit (ACH)</p>
              {bankRouting && <p>Routing #: {bankRouting}</p>}
              {bankAccount && <p>Account #: {bankAccount}</p>}
              <p className="text-white/70 text-sm mt-2">
                Checks should be payable to Islamic Center of Fort Collins.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <input type="date" className="rounded-xl px-4 py-3 text-black" value={transferDateB} onChange={e=>setTransferDateB(e.target.value)} />
              <input className="rounded-xl px-4 py-3 text-black" placeholder="Proof URL (optional)" value={proofUrlB} onChange={e=>setProofUrlB(e.target.value)} />
              <input className="rounded-xl px-4 py-3 text-black" placeholder="Transaction ID *" value={transactionId} onChange={e=>setTransactionId(e.target.value)} />
            </div>
            <p className="text-xs text-white/70">* Required for verification.</p>
          </div>
        )}

        {/* Submit */}
        <button
          disabled={primaryDisabled}
          onClick={() => method==='stripe' ? startStripe() : method==='zelle' ? submitZelle() : submitBank()}
          className="w-full rounded-2xl py-3 font-semibold shadow bg-[#FFD700] text-black hover:opacity-90 disabled:opacity-40 transition"
        >
          {submitting ? 'Processing...' :
            method==='stripe' ? 'Donate with Stripe' :
            method==='zelle'  ? 'Submit Zelle Confirmation' :
                                'Submit Bank Confirmation'}
        </button>

        <p className="mt-4 text-xs text-white/70">
          ICFC is a 501(c)(3). Donations may be tax-deductible. Please consult your tax advisor.
        </p>
      </section>
    </main>
  );
}
