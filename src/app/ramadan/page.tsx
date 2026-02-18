'use client';

import Link from "next/link";
import RamadanSchedulePdf from "@/components/ramadan/RamadanSchedulePdf";
import RamadanPrograms from "@/components/ramadan/RamadanPrograms";
import RamadanAnnouncements from "@/components/ramadan/RamadanAnnouncements";
import { useState } from "react";

export default function RamadanPage() {
  return (
    <main className="min-h-screen w-full bg-white overflow-x-hidden">
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0b2a17] via-[#071a10] to-black">
        <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_30%_20%,#FFD700_0,transparent_40%),radial-gradient(circle_at_80%_40%,#FFD700_0,transparent_35%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold text-[#FFD700]">ICFC • Ramadan 2026</p>
          <h1 className="mt-3 font-['Bebas_Neue'] text-5xl tracking-wide text-white sm:text-6xl">
            Ramadan at ICFC
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/80">
            Your hub for schedule, Taraweeh, programs, announcements, giving campaigns, and volunteering.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="#schedule"
              className="rounded-xl bg-[#FFD700] px-5 py-3 font-semibold text-black transition hover:brightness-95"
            >
              View Schedule
            </Link>
            <Link
              href="#announcements"
              className="rounded-xl border border-[#FFD700]/60 px-5 py-3 font-semibold text-[#FFD700] transition hover:bg-[#FFD700]/10"
            >
              Announcements & Posters
            </Link>
            <Link
              href="#give"
              className="rounded-xl border border-white/20 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              Donate
            </Link>
          </div>
        </div>
      </section>

      {/* Sticky section nav */}
      <div className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl gap-5 overflow-x-auto px-4 py-3 text-sm sm:px-6 lg:px-8">
          {[
            ["Schedule", "#schedule"],
            ["Programs", "#programs"],
            ["Announcements", "#announcements"],
            ["Give", "#give"],
            ["Volunteer", "#volunteer"],
          ].map(([label, href]) => (
            <a key={href} href={href} className="whitespace-nowrap font-semibold text-[#0b2a17] hover:underline">
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* SCHEDULE */}
      <section id="schedule" className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <h2 className="font-['Montserrat'] text-3xl font-bold text-[#0b2a17]">
          Prayer & Iftar Schedule
        </h2>
        <p className="mt-2 text-gray-600">
          View the full Ramadan schedule below, or open/download the PDF.
        </p>

        <RamadanSchedulePdf pdfPath="/ramadan/The Islamic Center of Fort Collins Monthly Prayer Timings.pdf" />
      </section>

          
      {/* ANNOUNCEMENTS / POSTERS (UPDATED) */}
      <RamadanAnnouncements />

      {/* PROGRAMS */}
      <RamadanPrograms />



      {/* GIVING */}
      <section id="give" className="bg-[#0b2a17]">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="font-['Montserrat'] text-3xl font-bold text-white">Ramadan Giving</h2>
          <p className="mt-2 max-w-2xl text-white/80">
            Support ICFC’s Ramadan efforts: Iftar sponsorship, Zakat, Sadaqah, and special campaigns.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "Iftar - One Share", amount: "$500", link: "https://bit.ly/ICFC_1_share" },
              { title: "Iftar - Weekday", amount: "$1,000", link: "https://bit.ly/ICFCweekDay" },
              { title: "Iftar - Friday", amount: "$2,000", link: "https://bit.ly/ICFCFriday" },
              { title: "Zakat & Sadaqah", amount: "Give Now", link: "/donate" },
            ].map((c) => (
              <div key={c.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <p className="text-sm font-semibold text-[#FFD700]">Donate</p>
                <h3 className="mt-2 text-xl font-bold text-white">{c.title}</h3>
                <p className="mt-2 text-white/80">{c.amount}</p>
                <Link href={c.link} target={c.link.startsWith('http') ? '_blank' : undefined} rel={c.link.startsWith('http') ? 'noopener noreferrer' : undefined} className="mt-4 w-full rounded-xl bg-[#FFD700] px-4 py-2 font-semibold text-black hover:brightness-95 block text-center">
                  Donate
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VOLUNTEER */}
      <section id="volunteer" className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <h2 className="font-['Montserrat'] text-3xl font-bold text-[#0b2a17]">Volunteer</h2>
        <p className="mt-2 text-gray-600">
          Sign up to volunteer for Ramadan activities. We need help with Iftar service, setup, cleanup, parking, and youth support.
        </p>

        <VolunteerForm />
      </section>
    </main>
  );
}

function VolunteerForm() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredTeam, setPreferredTeam] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const res = await fetch('/api/ramadan/volunteers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, preferred_team: preferredTeam }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit');
      }

      setSuccess(true);
      setName('');
      setPhone('');
      setPreferredTeam('');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
      {success && (
        <div className="mb-4 rounded-xl bg-green-50 border border-green-200 p-4 text-green-800">
          Thank you for signing up! We&apos;ll be in touch soon.
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-4 text-red-800">
          {error}
        </div>
      )}
      
      <div className="grid gap-4 sm:grid-cols-2">
        <input 
          className="rounded-xl border px-4 py-3" 
          placeholder="Full name*" 
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input 
          className="rounded-xl border px-4 py-3" 
          placeholder="Phone number*" 
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        <select 
          className="rounded-xl border px-4 py-3 sm:col-span-2"
          value={preferredTeam}
          onChange={(e) => setPreferredTeam(e.target.value)}
          required
        >
          <option value="">Select preferred team*</option>
          <option value="Iftar Service">Iftar Service</option>
          <option value="Setup / Cleanup">Setup / Cleanup</option>
          <option value="Parking">Parking</option>
          <option value="Kids / Youth Support">Kids / Youth Support</option>
        </select>
      </div>
      <button 
        type="submit"
        disabled={loading}
        className="mt-5 rounded-xl bg-[#0b2a17] px-5 py-3 font-semibold text-white hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
