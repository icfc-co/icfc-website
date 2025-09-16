"use client";

import Link from "next/link";
import {
  FiMessageCircle,
  FiBookOpen,
  FiPhone,
  FiClock,
  FiArrowRight,
  FiHelpCircle,
  FiHeart,
} from "react-icons/fi";
import { useState } from "react";

const GREEN = "#006400";
const GOLD = "#FFD700";

export default function AskImamPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            background:
              "radial-gradient(circle at 20% 20%, #FFD700 0%, transparent 35%), radial-gradient(circle at 80% 10%, #006400 0%, transparent 30%)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
          <span
            className="inline-block rounded-full px-3 py-1 text-sm font-semibold"
            style={{ backgroundColor: GOLD, color: "#0f2027" }}
          >
            ICFC Community Care
          </span>
          <h1
            className="mt-5 font-[var(--font-bebas,inherit)] text-5xl sm:text-6xl tracking-wide"
            style={{ color: GREEN, lineHeight: 1.08 }}
          >
            Ask the Imam
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-neutral-700">
            Have a question about Islam—simple or complex? Need personal guidance,
            spiritual support, or clarity on daily practice? Our Imam is here to help,
            privately and compassionately. Reach out anytime and we’ll respond as soon
            as we can.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {/* Ask Imam (Contact Page) */}
            <Link
              href="/modules/contact" // ← change if your contact route differs
              className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-sm"
              style={{ backgroundColor: GREEN, color: "white" }}
            >
              <FiMessageCircle />
              Ask Imam
              <FiArrowRight className="opacity-90" />
            </Link>

            {/* Prayer Timings Button */}
            <Link
              href="/modules/prayer-times" // ← change if your timings route differs
              className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold border"
              style={{ borderColor: GREEN, color: GREEN }}
            >
              <FiClock />
              Prayer Timings
            </Link>

            {/* Optional: call shortcut */}
            <a
              href="tel:+19702212425"
              className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold border"
              style={{ borderColor: "#e5e7eb", color: "#374151" }}
              title="ICFC Office"
            >
              <FiPhone />
              (970) 221-2425
            </a>
          </div>
        </div>
      </section>

      {/* WAYS WE HELP */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <h2 className="text-2xl md:text-3xl font-semibold" style={{ color: GOLD }}>
          How the Imam & Team Can Help
        </h2>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <HelpCard
            icon={<FiBookOpen size={22} />}
            title="Learning & Practice"
            bullets={[
              "How to pray (Salah), make wudu, and read short surahs.",
              "Understanding beliefs (ʿAqidah) & building daily routines.",
            ]}
          />
          <HelpCard
            icon={<FiHelpCircle size={22} />}
            title="Questions & Clarifications"
            bullets={[
              "Everyday matters: halal/haram, family, work, finance.",
              "Finding reliable sources & avoiding misinformation.",
            ]}
          />
          <HelpCard
            icon={<FiHeart size={22} />}
            title="Personal Support"
            bullets={[
              "Private, judgment-free conversations.",
              "Gentle guidance at your pace—new Muslims welcome.",
            ]}
          />
        </div>
      </section>

      {/* QUICK CONTACT ROW */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-10">
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm p-6 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
          <div className="flex items-center gap-3">
            <span
              className="inline-flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: "#F7F8F5", color: GREEN }}
            >
              <FiMessageCircle size={20} />
            </span>
            <div>
              <p className="text-base font-semibold text-neutral-900">Ready to Ask?</p>
              <p className="text-sm text-neutral-600">
                Use our contact page to message the Imam. We’ll get back to you as soon as possible.
              </p>
            </div>
          </div>

          <div className="md:ml-auto flex flex-wrap gap-3">
            <Link
              href="/modules/contact"
              className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-sm"
              style={{ backgroundColor: GREEN, color: "white" }}
            >
              Ask Imam
              <FiArrowRight className="opacity-90" />
            </Link>
            <Link
              href="/modules/prayer-times"
              className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold border"
              style={{ borderColor: GREEN, color: GREEN }}
            >
              <FiClock />
              Prayer Timings
            </Link>
          </div>
        </div>
      </section>

      {/* QUICK Q&A */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
        <h2 className="text-2xl md:text-3xl font-semibold" style={{ color: GOLD }}>
          Quick Questions & Answers
        </h2>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <QA
            q="I’m new to Islam—where should I start?"
            a="Begin with the basics: belief in Allah and His Messenger ﷺ, learning wudu and Salah, and reading a few short surahs (e.g., Al-Fatiha, Al-Ikhlas). Join our newcomer sessions and ask the Imam anytime."
          />
          <QA
            q="Do I need to know Arabic first?"
            a="No. We teach step-by-step. You can start praying in English transliteration while learning Arabic gradually."
          />
          <QA
            q="Is it okay if I have many questions?"
            a="Absolutely. Asking is encouraged. The Imam and volunteers are here for sincere, respectful dialogue and guidance."
          />
          <QA
            q="Can I speak privately?"
            a="Yes. Use the Ask Imam link to request a private conversation. We maintain confidentiality and a compassionate tone."
          />
        </div>
      </section>
    </main>
  );
}

/* ========== Small Components ========== */

function HelpCard({
  icon,
  title,
  bullets,
}: {
  icon: React.ReactNode;
  title: string;
  bullets: string[];
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm p-6 hover:shadow-md transition">
      <div className="flex items-center gap-3">
        <span
          className="inline-flex h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: "#F7F8F5", color: GREEN }}
        >
          {icon}
        </span>
        <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
      </div>
      <ul className="mt-4 space-y-2 text-neutral-700">
        {bullets.map((b, i) => (
          <li key={i} className="pl-1 leading-relaxed">
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}

function QA({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-base font-medium text-neutral-900">{q}</span>
        <span
          className={`ml-4 inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold transition ${
            open ? "rotate-45" : ""
          }`}
          style={{ backgroundColor: "#F7F8F5", color: GREEN }}
          aria-hidden
        >
          +
        </span>
      </button>
      {open && <p className="mt-3 text-neutral-700">{a}</p>}
    </div>
  );
}
