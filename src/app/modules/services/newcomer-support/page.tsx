// /src/app/community/newcomer-support/page.tsx
"use client";

import Link from "next/link";
import {
  FiBookOpen,
  FiUsers,
  FiMessageCircle,
  FiPhone,
  FiHeart,
  FiCompass,
  FiClock,
  FiCheckCircle,
} from "react-icons/fi";
import { useState } from "react";

const GREEN = "#006400";
const GOLD  = "#FFD700";

export default function NewcomerSupportPage() {
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
            className="inline-block rounded-full px-3 py-1 text-sm font-medium"
            style={{ backgroundColor: GOLD, color: "#0f2027" }}
          >
            Welcome to ICFC
          </span>
          <h1
            className="mt-5 font-[var(--font-bebas,inherit)] text-5xl sm:text-5xl tracking-wide"
            style={{ color: GREEN, lineHeight: 1.08 }}
          >
            Newcomer Support — Learn, Connect, Grow
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-neutral-700">
            Whether you’re new to Islam or reconnecting with your faith, ICFC offers a
            friendly path to start learning, ask questions, and meet a supportive community.
            Our volunteers and Imam are here to help—gently, privately, and at your pace.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/modules/contact"
              className="rounded-full px-5 py-3 text-sm font-semibold shadow-sm"
              style={{ backgroundColor: GREEN, color: "white" }}
            >
              Contact ICFC
            </Link>
            <a
              href="tel:+19702212425"
              className="rounded-full px-5 py-3 text-sm font-semibold border"
              style={{ borderColor: GREEN, color: GREEN }}
            >
              Call: (970) 221-2425
            </a>
          </div>
        </div>
      </section>

      {/* HIGHLIGHTS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <h2 className="text-2xl md:text-3xl font-semibold" style={{ color: GOLD }}>
          How We Support New Muslims
        </h2>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card
            icon={<FiBookOpen size={24} />}
            title="Sunday School for Newcomers"
            points={[
              "Beginner-friendly overview of Islam & daily practice.",
              "Qur’an reading basics, prayer (Salah) step-by-step.",
              "Small group format; welcoming for all ages.",
            ]}
          />
          <Card
            icon={<FiUsers size={24} />}
            title="Mentor & Volunteer Network"
            points={[
              "One-on-one support to answer questions.",
              "Guided tours of the masjid & community spaces.",
              "Help connecting with local Muslim families.",
            ]}
          />
          <Card
            icon={<FiMessageCircle size={24} />}
            title="Ask the Imam"
            points={[
              "Private, judgment-free conversations.",
              "Faith guidance and next steps at your pace.",
              "Book a time via our contact page anytime.",
            ]}
          />
          <Card
            icon={<FiCompass size={24} />}
            title="Next-Step Guidance"
            points={[
              "How to pray, fast, and build daily habits.",
              "Finding halal resources & authentic learning.",
              "Recommended apps, books, and courses.",
            ]}
          />
          <Card
            icon={<FiHeart size={24} />}
            title="Community Care"
            points={[
              "Regular events & circles for learning and friendship.",
              "Family-friendly environment with kids programming.",
              "Welcoming converts & reverts equally.",
            ]}
          />
          <Card
            icon={<FiPhone size={24} />}
            title="Always Reachable"
            points={[
              "Message us anytime—real people will respond.",
              "Visit during open hours or book a meet-up.",
              "Call ICFC office for quick questions.",
            ]}
          />
        </div>
      </section>

      {/* SUNDAY SCHOOL DETAILS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 rounded-2xl border border-neutral-200 bg-white shadow-sm p-6">
            <Header
              icon={<FiBookOpen size={22} />}
              title="Sunday School for Newcomers"
              subtitle="A gentle, structured start to learning Islam"
            />
            <ul className="mt-4 space-y-2 text-neutral-700">
              <li className="flex items-start gap-2">
                <FiCheckCircle className="mt-1 shrink-0" color={GREEN} />
                <span>
                  <strong>Curriculum:</strong> Beliefs (ʿAqidah), prayer, wudu,
                  reading Arabic letters, short surahs, and daily dua.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <FiCheckCircle className="mt-1 shrink-0" color={GREEN} />
                <span>
                  <strong>Format:</strong> Small classes + optional 1-on-1 mentoring.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <FiCheckCircle className="mt-1 shrink-0" color={GREEN} />
                <span>
                  <strong>Who can join:</strong> New Muslims, reverts, and anyone curious.
                </span>
              </li>
            </ul>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/modules/contact"
                className="rounded-full px-5 py-3 text-sm font-semibold shadow-sm"
                style={{ backgroundColor: GREEN, color: "white" }}
              >
                Ask about Sunday School
              </Link>
              <a
                href="mailto:info@icfc.org"
                className="rounded-full px-5 py-3 text-sm font-semibold border"
                style={{ borderColor: GREEN, color: GREEN }}
              >
                Email: info@icfc.org
              </a>
            </div>
          </div>

          {/* QUICK INFO CARD */}
          <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm p-6">
            <Header icon={<FiClock size={20} />} title="Scheduling" />
            <p className="mt-2 text-neutral-700">
              Sessions run on Sundays. Times may vary by semester and enrollment. Reach out and we’ll plug you into the next cohort.
            </p>
            <div className="mt-4">
              <Link
                href="/modules/contact"
                className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold"
                style={{ backgroundColor: GOLD, color: "#0f2027" }}
              >
                Contact Page
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SIMPLE FAQ */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
        <h2 className="text-2xl md:text-3xl font-semibold" style={{ color: GOLD }}>
          Frequently Asked Questions
        </h2>
        <div className="mt-6 space-y-3">
          <Faq q="Do I need to know Arabic before joining?" a="No. We start from basics and build gradually. You’ll learn letters, sounds, and short surahs in a supportive environment." />
          <Faq q="Is there any cost to attend?" a="Most newcomer support is free. If there’s a small fee for materials, we’ll inform you in advance and provide assistance if needed." />
          <Faq q="Can I speak to someone privately?" a="Absolutely. You can request a private chat with our Imam or a trained volunteer via the contact page." />
          <Faq q="I’m not sure where to start—what should I do?" a="Just reach out. We’ll help map a simple plan—attend a class, meet a mentor, and start with daily essentials." />
        </div>
      </section>
    </main>
  );
}

/* ========== small components ========== */

function Card({
  icon,
  title,
  points,
}: {
  icon: React.ReactNode;
  title: string;
  points: string[];
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
        {points.map((p, i) => (
          <li key={i} className="pl-1 leading-relaxed">{p}</li>
        ))}
      </ul>
    </div>
  );
}

function Header({
  icon,
  title,
  subtitle,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      {icon ? (
        <span
          className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: "#F7F8F5", color: GREEN }}
        >
          {icon}
        </span>
      ) : null}
      <div>
        <h3 className="text-xl font-semibold text-neutral-900">{title}</h3>
        {subtitle && <p className="text-neutral-600">{subtitle}</p>}
      </div>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
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
