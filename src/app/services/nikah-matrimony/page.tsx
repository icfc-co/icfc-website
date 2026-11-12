'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FiCheckCircle, FiClock, FiExternalLink, FiFileText, FiHeart, FiPhone, FiUsers } from 'react-icons/fi';
import { supabase } from '@/lib/supabaseClient';
import { SITE } from '@/lib/site';
import {
  COUNTY_LINKS, IMPEDIMENT_OPTS, KAFAAH_OPTS, LICENSE_OPTS, MAHR_OPTS, REQUIREMENTS, RESOURCES, WALI_OPTS,
  WITNESS_OPTS, RequirementKey, todayInFortCollins,
} from '@/lib/nikah';

const GREEN = '#006400';
const GOLD = '#FFD700';

type Form = {
  contact_email: string;
  groom_name: string; groom_phone: string; groom_email: string; groom_address: string;
  bride_name: string; bride_phone: string; bride_email: string;
  nikah_date: string; nikah_time: string;
  at_icfc: boolean; location: string; location_address: string;
  requirements: Partial<Record<RequirementKey, 'available' | 'not_available'>>;
  requirements_notes: string;
  vows_acknowledged: '' | 'true' | 'false';
  witnesses: string; mahr: string; wali: string; wali_details: string;
  kafaah: string; impediments: string; license: string;
  declaration_groom: boolean; declaration_bride: boolean;
  resources_checked: boolean; resources_note: string;
  wants_to_donate: '' | 'yes' | 'no'; donation_amount: string;
  website: string; // honeypot
};

const empty: Form = {
  contact_email: '', groom_name: '', groom_phone: '', groom_email: '', groom_address: '',
  bride_name: '', bride_phone: '', bride_email: '', nikah_date: '', nikah_time: '',
  at_icfc: true, location: '', location_address: '', requirements: {}, requirements_notes: '',
  vows_acknowledged: '', witnesses: '', mahr: '', wali: '', wali_details: '', kafaah: '', impediments: '', license: '',
  declaration_groom: false, declaration_bride: false, resources_checked: false, resources_note: '',
  wants_to_donate: '', donation_amount: '', website: '',
};

const input = 'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#006400] focus:outline-none focus:ring-1 focus:ring-[#006400]';
const label = 'block text-sm font-medium text-gray-800';

function Section({ n, title, children, intro }: { n: number; title: string; intro?: React.ReactNode; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <legend className="sr-only">{title}</legend>
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: GREEN }}>{n}</span>
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      </div>
      {intro && <div className="mt-3 text-sm leading-relaxed text-gray-600">{intro}</div>}
      <div className="mt-5 space-y-6">{children}</div>
    </fieldset>
  );
}

function Choice({ name, title, help, opts, value, onChange }: {
  name: string; title: string; help?: React.ReactNode; opts: { value: string; label: string }[];
  value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="font-medium text-gray-900">{title} <span className="text-red-600">*</span></p>
      {help && <p className="mt-1 text-sm leading-relaxed text-gray-600">{help}</p>}
      <div className="mt-3 space-y-2">
        {opts.map((o) => (
          <label key={o.value} className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${value === o.value ? 'border-[#006400] bg-green-50' : 'border-gray-200 hover:bg-gray-50'}`}>
            <input type="radio" name={name} required value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="mt-0.5 accent-[#006400]" />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function NikahPage() {
  const [f, setF] = useState<Form>(empty);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const today = useMemo(() => todayInFortCollins(), []);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));

  // Signed-in visitors: prefill the contact email
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email;
      if (email) setF((p) => (p.contact_email ? p : { ...p, contact_email: email }));
    });
  }, []);

  const daysAway = f.nikah_date
    ? Math.round((Date.parse(f.nikah_date) - Date.parse(today)) / 86_400_000)
    : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const missingReq = REQUIREMENTS.find((q) => !f.requirements[q.key]);
    if (missingReq) return setError(`Please mark "${missingReq.label}" as available or not available.`);
    if (!f.declaration_groom || !f.declaration_bride) return setError('Both the groom and the bride must agree to the declaration.');
    if (!f.resources_checked && !f.resources_note.trim()) return setError('Please confirm you have checked the resources, or add a note.');

    setSubmitting(true);
    try {
      const res = await fetch('/api/nikah', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...f,
          location: f.at_icfc ? 'ICFC' : f.location,
          location_address: f.at_icfc ? '' : f.location_address,
          vows_acknowledged: f.vows_acknowledged === 'true',
          wants_to_donate: f.wants_to_donate === 'yes',
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Submission failed. Please try again.');
      setDone(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* HERO */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(circle at 20% 20%, ${GOLD} 0%, transparent 35%), radial-gradient(circle at 80% 10%, ${GREEN} 0%, transparent 30%)` }} />
        <div className="relative mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-14">
          <span className="inline-block rounded-full px-3 py-1 text-sm font-semibold" style={{ backgroundColor: GOLD, color: '#0f2027' }}>ICFC Services</span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl" style={{ color: GREEN }}>Nikah (Marriage) Services</h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-gray-700">
            It is our honor and pleasure to offer Islamic marriage (nikah) services in accordance with the Book of Allah
            (the Qur’an) and the life example of the Prophet Muhammad ﷺ, for couples in the Northern Colorado area.
            Please complete the registration form below so we can arrange pre-marital guidance and confirm the details of
            your ceremony.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#request" className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-sm" style={{ backgroundColor: GREEN }}>
              <FiFileText /> Request a Nikah
            </a>
            <a href={SITE.phoneHref} className="inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold" style={{ borderColor: GREEN, color: GREEN }}>
              <FiPhone /> {SITE.phone}
            </a>
          </div>
        </div>
      </section>

      {/* POLICY */}
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 text-sm leading-relaxed text-gray-800">
          <strong>Policy.</strong> The ICFC marriage policy consists of religious guidelines that must be fulfilled, as well
          as filing the marriage with the local County Courthouse. ICFC management wants to ensure that all parties are
          serious-minded and protected as they embark on this important step in their lives. ICFC reserves the right to
          refuse service with or without reason.
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-lg font-semibold" style={{ color: GREEN }}><FiHeart /> Religious guidelines</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-700">
              <li>Only the appointed religious leaders of the ICFC can perform nikah in the name of the ICFC or on its premises.</li>
              <li>The ICFC performs nikah for a Muslim man marrying a Muslim woman, or a Christian or Jewish (ahl al-kitāb) woman.</li>
              <li>A Muslim woman wishing to marry must have the support of her father, family, and/or the next male family figure.</li>
              <li>The bride and groom must be free from compulsion and marrying of their own free will.</li>
              <li>A mahr (bridal gift) must be given, or agreed to be given later, from the groom to the bride.</li>
              <li>We encourage as many family members as possible to take part as participants and witnesses. Video calls are welcome for those who cannot attend.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-lg font-semibold" style={{ color: GREEN }}><FiUsers /> At the ICFC</h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-700">
              Modest attire is required for all guests and participants: legs, back, chest and necklines covered for men
              and women. Those dressed improperly will be asked to leave the premises.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-700">
              Picture taking is permitted on the ICFC premises. All picture content must be in line with the modesty
              requirements of a house of worship.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-lg font-semibold" style={{ color: GREEN }}><FiFileText /> County filing</h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-700">
              Make an appointment with the Larimer County Recording Department to obtain a marriage license. Bring it to the
              nikah ceremony for the couple, the officiant and the witnesses to sign, then return it to the Recording
              Department for filing.
            </p>
            <p className="mt-3 text-sm text-gray-700">
              <a href="https://larimer-recording.bookafy.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium underline" style={{ color: GREEN }}>
                Book a Larimer County appointment <FiExternalLink />
              </a>{' '}
              or call <a href="tel:+19704987860" className="underline">(970) 498-7860</a>.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-lg font-semibold" style={{ color: GREEN }}><FiClock /> The ceremony</h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-700">
              The nikah ceremony takes less than 15 minutes. The officiant recites verses from the Qur’an, gives advice to
              the couple and those in attendance, leads the offer and acceptance of marriage, and the Masjid and Courthouse
              documents are signed.
            </p>
            <p className="mt-3 text-sm text-gray-700">
              We highly encourage a donation to the ICFC (not mandatory).{' '}
              <Link href="/donate" className="font-medium underline" style={{ color: GREEN }}>Donate</Link>
            </p>
          </div>
        </div>
      </section>

      {/* FORM */}
      <section id="request" className="mx-auto max-w-3xl scroll-mt-24 px-4 pb-16 sm:px-6">
        {done ? (
          <div className="rounded-2xl border border-green-200 bg-white p-8 text-center shadow-sm">
            <FiCheckCircle className="mx-auto h-12 w-12" style={{ color: GREEN }} />
            <h2 className="mt-4 text-2xl font-semibold text-gray-900">JazakAllahu khairan — your request was received</h2>
            <p className="mt-3 text-gray-700">
              Our team will review your Nikah request and contact you at <strong>{f.contact_email}</strong> to confirm the
              date, time and next steps, in shā’ Allāh.
            </p>
            <p className="mt-2 text-sm text-gray-600">Questions in the meantime? Call {SITE.phone} or email {SITE.email}.</p>
            <button onClick={() => { setF({ ...empty, contact_email: f.contact_email }); setDone(false); }} className="mt-6 rounded-full border px-5 py-2 text-sm font-medium" style={{ borderColor: GREEN, color: GREEN }}>
              Submit another request
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-3xl font-bold text-gray-900">Nikah request form</h2>
            <p className="mt-2 text-gray-600">Fields marked <span className="text-red-600">*</span> are required. It takes about 10 minutes.</p>

            <form onSubmit={submit} className="mt-6 space-y-6">
              {/* honeypot */}
              <input type="text" name="website" value={f.website} onChange={(e) => set('website', e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

              <Section n={1} title="Contact & ceremony details">
                <div>
                  <label className={label} htmlFor="contact_email">Contact email <span className="text-red-600">*</span></label>
                  <input id="contact_email" type="email" required className={input} value={f.contact_email} onChange={(e) => set('contact_email', e.target.value)} />
                  <p className="mt-1 text-xs text-gray-500">We’ll use this to follow up about your request.</p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <h3 className="font-semibold text-gray-900">Groom</h3>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className={label} htmlFor="groom_name">Full name as it appears on ID <span className="text-red-600">*</span></label>
                      <input id="groom_name" required maxLength={150} className={input} value={f.groom_name} onChange={(e) => set('groom_name', e.target.value)} />
                    </div>
                    <div>
                      <label className={label} htmlFor="groom_phone">Phone number <span className="text-red-600">*</span></label>
                      <input id="groom_phone" type="tel" required maxLength={40} className={input} value={f.groom_phone} onChange={(e) => set('groom_phone', e.target.value)} />
                    </div>
                    <div>
                      <label className={label} htmlFor="groom_email">Email</label>
                      <input id="groom_email" type="email" maxLength={200} className={input} value={f.groom_email} onChange={(e) => set('groom_email', e.target.value)} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={label} htmlFor="groom_address">Current mailing address</label>
                      <input id="groom_address" maxLength={300} className={input} value={f.groom_address} onChange={(e) => set('groom_address', e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <h3 className="font-semibold text-gray-900">Bride</h3>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className={label} htmlFor="bride_name">Full name as it appears on ID <span className="text-red-600">*</span></label>
                      <input id="bride_name" required maxLength={150} className={input} value={f.bride_name} onChange={(e) => set('bride_name', e.target.value)} />
                    </div>
                    <div>
                      <label className={label} htmlFor="bride_phone">Phone number <span className="text-red-600">*</span></label>
                      <input id="bride_phone" type="tel" required maxLength={40} className={input} value={f.bride_phone} onChange={(e) => set('bride_phone', e.target.value)} />
                    </div>
                    <div>
                      <label className={label} htmlFor="bride_email">Email <span className="font-normal text-gray-500">(if different from above)</span></label>
                      <input id="bride_email" type="email" maxLength={200} className={input} value={f.bride_email} onChange={(e) => set('bride_email', e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={label} htmlFor="nikah_date">Requested Nikah date <span className="text-red-600">*</span></label>
                    <input id="nikah_date" type="date" required min={today} className={input} value={f.nikah_date} onChange={(e) => set('nikah_date', e.target.value)} />
                  </div>
                  <div>
                    <label className={label} htmlFor="nikah_time">Requested Nikah time <span className="text-red-600">*</span></label>
                    <input id="nikah_time" type="time" required className={input} value={f.nikah_time} onChange={(e) => set('nikah_time', e.target.value)} />
                  </div>
                </div>
                <p className={`-mt-3 text-xs ${daysAway !== null && daysAway < 7 ? 'font-medium text-amber-700' : 'text-gray-500'}`}>
                  {daysAway !== null && daysAway < 7
                    ? 'This date is less than a week away. We will do our best, but please allow 1–2 weeks to ensure availability and to obtain your marriage license.'
                    : 'Please allow 1–2 weeks in advance to ensure availability and to obtain your State marriage license.'}
                </p>

                <div>
                  <p className={label}>Requested Nikah location <span className="text-red-600">*</span></p>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {[true, false].map((v) => (
                      <label key={String(v)} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${f.at_icfc === v ? 'border-[#006400] bg-green-50' : 'border-gray-200'}`}>
                        <input type="radio" name="at_icfc" checked={f.at_icfc === v} onChange={() => set('at_icfc', v)} className="accent-[#006400]" />
                        {v ? 'At the Islamic Center of Fort Collins' : 'Another location (additional fees apply)'}
                      </label>
                    ))}
                  </div>
                  {!f.at_icfc && (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className={label} htmlFor="location">Location name <span className="text-red-600">*</span></label>
                        <input id="location" required maxLength={200} className={input} value={f.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. family home, banquet hall" />
                      </div>
                      <div>
                        <label className={label} htmlFor="location_address">Full address <span className="text-red-600">*</span></label>
                        <input id="location_address" required maxLength={300} className={input} value={f.location_address} onChange={(e) => set('location_address', e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>
              </Section>

              <Section n={2} title="Islamic marriage requirements" intro={
                <>The following conditions must be met to conduct the Islamic marriage ceremony and contract. All of them are required. If any condition cannot be fulfilled, please explain below.</>
              }>
                <div className="overflow-hidden rounded-xl border border-gray-200">
                  {REQUIREMENTS.map((q, i) => (
                    <div key={q.key} className={`flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between ${i ? 'border-t border-gray-200' : ''}`}>
                      <span className="text-sm text-gray-800">{q.label}</span>
                      <div className="flex shrink-0 gap-2">
                        {(['available', 'not_available'] as const).map((v) => {
                          const on = f.requirements[q.key] === v;
                          return (
                            <label key={v} className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium ${on ? (v === 'available' ? 'border-[#006400] bg-[#006400] text-white' : 'border-red-600 bg-red-600 text-white') : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                              <input type="radio" className="sr-only" name={`req_${q.key}`} checked={on}
                                onChange={() => setF((p) => ({ ...p, requirements: { ...p.requirements, [q.key]: v } }))} />
                              {v === 'available' ? 'Available' : 'Not available'}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <label className={label} htmlFor="requirements_notes">
                    Explanation{' '}
                    <span className="font-normal text-gray-500">
                      {Object.values(f.requirements).includes('not_available') ? '(please explain what is not available)' : '(optional)'}
                    </span>
                  </label>
                  <textarea id="requirements_notes" rows={3} maxLength={2000} className={input} value={f.requirements_notes}
                    required={Object.values(f.requirements).includes('not_available')}
                    onChange={(e) => set('requirements_notes', e.target.value)} />
                </div>

                <Choice name="vows" title="Vows (Ijāb and Qubūl)" value={f.vows_acknowledged} onChange={(v) => set('vows_acknowledged', v as Form['vows_acknowledged'])}
                  help="The formal offer and acceptance of marriage must be declared during the ceremony between the bride’s guardian (wali) and the groom, in the presence of the bride and two witnesses."
                  opts={[{ value: 'true', label: 'True — we understand and agree' }, { value: 'false', label: 'False' }]} />

                <Choice name="witnesses" title="Two male Muslim witnesses" value={f.witnesses} onChange={(v) => set('witnesses', v)} opts={WITNESS_OPTS}
                  help="The Nikah requires at least two adult Muslim male witnesses. They attest that the bride and groom enter the marriage with free will, without force from family or others, and confirm the Ijāb and Qubūl and the conditions stated in the marriage contract." />

                <Choice name="mahr" title="Mahr (dowry)" value={f.mahr} onChange={(v) => set('mahr', v)} opts={MAHR_OPTS}
                  help="The Mahr is an obligatory gift from the groom (or his family) to the bride. It must be something of value, such as money, gold, jewelry, or any item the bride requests, and symbolizes the groom’s responsibility to provide for and care for his wife." />

                <div>
                  <Choice name="wali" title="Who will serve as the Wali (guardian) for the bride?" value={f.wali} onChange={(v) => set('wali', v)} opts={WALI_OPTS}
                    help="The Wali is the father or guardian of the bride who formally represents her in the marriage contract. He must obtain the bride’s direct consent and cannot give it on her behalf without asking her. If the father is deceased or unable, another male guardian or close relative may serve. If the bride has no eligible Muslim guardian, the Imam or an Islamic judge may act as her Wali." />
                  {f.wali === 'relative' && (
                    <div className="mt-3">
                      <label className={label} htmlFor="wali_details">Wali’s name and relation to the bride <span className="text-red-600">*</span></label>
                      <input id="wali_details" required maxLength={200} className={input} value={f.wali_details} onChange={(e) => set('wali_details', e.target.value)} placeholder="e.g. Ahmed Ali — paternal uncle" />
                    </div>
                  )}
                </div>

                <Choice name="kafaah" title="Does the marriage fulfill the requirement of Kafā’ah (religious compatibility)?" value={f.kafaah} onChange={(v) => set('kafaah', v)} opts={KAFAAH_OPTS}
                  help="The bride and groom must be compatible in faith. A Muslim man may marry a chaste and practicing Jewish or Christian woman. A Muslim woman must marry a Muslim man." />

                <Choice name="impediments" title="Are both the bride and groom free from any impediments to Nikah?" value={f.impediments} onChange={(v) => set('impediments', v)} opts={IMPEDIMENT_OPTS}
                  help="According to Islamic law, both must be free from impediments that would invalidate the Nikah, such as being currently married (without divorce), certain serious health conditions, or other barriers that prevent fulfilling the rights of marriage." />

                <div>
                  <Choice name="license" title="Have you obtained (or will you obtain) a valid Colorado marriage license before the Nikah?" value={f.license} onChange={(v) => set('license', v)} opts={LICENSE_OPTS}
                    help="Couples are required to obtain a valid State of Colorado marriage license from their County Clerk & Recorder before the Nikah." />
                  <details className="mt-3 rounded-lg bg-gray-50 p-3 text-sm">
                    <summary className="cursor-pointer font-medium" style={{ color: GREEN }}>County marriage license offices</summary>
                    <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                      {COUNTY_LINKS.map(([name, href]) => (
                        <li key={name}><a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">{name} <FiExternalLink className="h-3 w-3" /></a></li>
                      ))}
                    </ul>
                  </details>
                </div>
              </Section>

              <Section n={3} title="Islamic marriage declaration">
                <blockquote className="rounded-xl border-l-4 bg-gray-50 p-4 text-sm leading-relaxed text-gray-800" style={{ borderColor: GREEN }}>
                  We declare that our marriage (Nikah) is being conducted according to the Book of Allah (the Holy Qur’an) and the
                  Sunnah of His Messenger Muhammad ﷺ, and in full compliance with Islamic Shari‘ah and the laws of the State of
                  Colorado. We affirm that we both enter into this marriage with free will and consent, that the conditions of
                  Nikah — including the wali, the mahr, and two Muslim male witnesses — are fulfilled, and that we are free from
                  any Islamic or legal impediments. We further declare that we are free from serious infectious diseases that
                  would prevent a valid marriage, and we pledge that our children shall be raised as Muslims. With this, we
                  affirm before Allah, the witnesses, and the community our commitment to uphold the rights and
                  responsibilities of this sacred covenant.
                </blockquote>
                <div className="flex flex-wrap gap-3">
                  {([['declaration_groom', 'Declared by the groom'], ['declaration_bride', 'Declared by the bride']] as const).map(([k, l]) => (
                    <label key={k} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${f[k] ? 'border-[#006400] bg-green-50' : 'border-gray-200'}`}>
                      <input type="checkbox" checked={f[k]} onChange={(e) => set(k, e.target.checked)} className="accent-[#006400]" />
                      {l} <span className="text-red-600">*</span>
                    </label>
                  ))}
                </div>
              </Section>

              <Section n={4} title="Essential resources for couples" intro="Couples are encouraged to read and discuss the following before the Nikah.">
                <div className="grid gap-4 sm:grid-cols-2">
                  {RESOURCES.map((g) => (
                    <div key={g.group}>
                      <h3 className="text-sm font-semibold text-gray-900">{g.group}</h3>
                      <ul className="mt-1 space-y-1 text-sm">
                        {g.links.map(([t, href]) => (
                          <li key={href}><a href={href} target="_blank" rel="noopener noreferrer" className="underline decoration-gray-300 hover:decoration-current" style={{ color: GREEN }}>{t}</a></li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <label className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${f.resources_checked ? 'border-[#006400] bg-green-50' : 'border-gray-200'}`}>
                  <input type="checkbox" checked={f.resources_checked} onChange={(e) => set('resources_checked', e.target.checked)} className="accent-[#006400]" />
                  I have checked the resources <span className="text-red-600">*</span>
                </label>
                {!f.resources_checked && (
                  <div>
                    <label className={label} htmlFor="resources_note">Other <span className="font-normal text-gray-500">(if you haven’t checked them yet, tell us why)</span></label>
                    <input id="resources_note" maxLength={500} className={input} value={f.resources_note} onChange={(e) => set('resources_note', e.target.value)} />
                  </div>
                )}
              </Section>

              <Section n={5} title="Donation" intro={<>We highly encourage a donation to the ICFC. It is not mandatory. <Link href="/donate" target="_blank" className="font-medium underline" style={{ color: GREEN }}>Donate online</Link></>}>
                <Choice name="donate" title="Would you like to donate?" value={f.wants_to_donate} onChange={(v) => set('wants_to_donate', v as Form['wants_to_donate'])}
                  opts={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} />
                {f.wants_to_donate === 'yes' && (
                  <div className="max-w-xs">
                    <label className={label} htmlFor="donation_amount">Amount donated <span className="font-normal text-gray-500">(optional)</span></label>
                    <input id="donation_amount" maxLength={40} className={input} value={f.donation_amount} onChange={(e) => set('donation_amount', e.target.value)} placeholder="e.g. $150" />
                  </div>
                )}
              </Section>

              {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

              <button type="submit" disabled={submitting} className="w-full rounded-full px-6 py-3.5 text-base font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60 sm:w-auto" style={{ backgroundColor: GREEN }}>
                {submitting ? 'Submitting…' : 'Submit Nikah request'}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
