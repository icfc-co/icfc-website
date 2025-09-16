"use client";

import Link from "next/link";
import {
  FiCoffee,
  FiUsers,
  FiHeart,
  FiShoppingBag,
  FiHome,
  FiArrowRight,
} from "react-icons/fi";

const GREEN = "#006400";
const GOLD = "#FFD700";

export default function HalalKitchenPage() {
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
            ICFC Community Project
          </span>
          <h1
            className="mt-5 font-[var(--font-bebas,inherit)] text-5xl sm:text-6xl tracking-wide"
            style={{ color: GREEN }}
          >
            Halal Kitchen Initiative
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-neutral-700">
            Every Friday after Jummah prayer, ICFC serves fresh halal meals for our
            community. It’s more than just food—it’s an opportunity to gather,
            connect, and support one another. Our vision is to expand this service
            into a permanent **Halal Kitchen** that nourishes our community while
            helping sustain masjid expenses.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/donate"
              className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-sm"
              style={{ backgroundColor: GREEN, color: "white" }}
            >
              <FiHeart />
              Donate to Halal Kitchen
              <FiArrowRight className="opacity-90" />
            </Link>
            <Link
              href="/modules/contact"
              className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold border"
              style={{ borderColor: GREEN, color: GREEN }}
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* WHY IT MATTERS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl md:text-3xl font-semibold" style={{ color: GOLD }}>
          Why a Halal Kitchen Matters
        </h2>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card
            icon={<FiCoffee size={22} />}
            title="Weekly Jummah Meals"
            text="Currently, we serve food every Friday after Jummah prayer, welcoming everyone with hospitality and care."
          />
          <Card
            icon={<FiUsers size={22} />}
            title="Support for Students & Families"
            text="Affordable halal food helps international students, busy families, and newcomers who struggle to find meals they trust."
          />
          <Card
            icon={<FiShoppingBag size={22} />}
            title="Halal Food Access"
            text="A reliable source for halal meals in Fort Collins, reducing the stress of searching for authentic, permissible food."
          />
          <Card
            icon={<FiHome size={22} />}
            title="Caring for the Needy"
            text="Provides meals for those in need and creates a culture of compassion where no one is left hungry."
          />
          <Card
            icon={<FiHeart size={22} />}
            title="Sustaining the Masjid"
            text="Proceeds from the Halal Kitchen will support ICFC’s operations and future projects, ensuring long-term sustainability."
          />
        </div>
      </section>

      {/* DONATION CTA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-neutral-900">
              Help Launch the Halal Kitchen
            </h3>
            <p className="mt-2 text-neutral-700">
              Your donation will help transform our Friday meals into a
              permanent Halal Kitchen—serving the community, supporting students,
              feeding the needy, and sustaining ICFC’s mission.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/donate"
              className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-sm"
              style={{ backgroundColor: GREEN, color: "white" }}
            >
              <FiHeart />
              Donate Now
            </Link>
            <Link
              href="/modules/contact"
              className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold border"
              style={{ borderColor: GREEN, color: GREEN }}
            >
              Contact ICFC
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ========== Reusable Card ========== */
function Card({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
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
      <p className="mt-3 text-neutral-700 leading-relaxed">{text}</p>
    </div>
  );
}
