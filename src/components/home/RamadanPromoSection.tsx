"use client";

import Link from "next/link";
import { modules } from "@/config/modules";

export default function RamadanPromoSection() {
  if (!modules.ramadan.enabled) return null;

  return (
    <section className="relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0b2a17] via-[#071a10] to-black" />
      <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_20%_20%,#FFD700_0,transparent_40%),radial-gradient(circle_at_80%_30%,#FFD700_0,transparent_35%),radial-gradient(circle_at_60%_80%,#006400_0,transparent_45%)]" />

      {/* Decorative crescent */}
      <div className="pointer-events-none absolute -right-24 top-1/2 h-[420px] w-[420px] -translate-y-1/2 rounded-full border border-[#FFD700]/20 bg-white/5 blur-[1px]" />
      <div className="pointer-events-none absolute -right-10 top-1/2 h-[360px] w-[360px] -translate-y-1/2 rounded-full bg-gradient-to-br from-white/10 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          {/* Copy */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD700]/30 bg-black/20 px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-[#FFD700]" />
              <p className="text-sm tracking-wide text-white/90">
                {modules.ramadan.yearLabel} • Programs • Schedule • Giving
              </p>
            </div>

            <h2 className="mt-5 font-['Bebas_Neue'] text-4xl tracking-wide text-white sm:text-5xl">
              A month of worship, community, and giving
            </h2>

            <p className="mt-4 max-w-xl text-base text-white/80 sm:text-lg">
              Explore ICFC’s Ramadan calendar, Taraweeh details, community iftars,
              volunteer opportunities, and donation campaigns — all in one place.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={modules.ramadan.slug}
                className="rounded-xl bg-[#FFD700] px-5 py-3 font-semibold text-black shadow-sm transition hover:brightness-95"
              >
                Open Ramadan Page
              </Link>

              <Link
                href={`${modules.ramadan.slug}#schedule`}
                className="rounded-xl border border-[#FFD700]/60 bg-transparent px-5 py-3 font-semibold text-[#FFD700] transition hover:bg-[#FFD700]/10"
              >
                View Schedule
              </Link>

              <Link
                href={`${modules.ramadan.slug}#give`}
                className="rounded-xl border border-white/20 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Donate for Iftar
              </Link>
            </div>

            <div className="mt-6 flex items-center gap-4 text-sm text-white/70">
              <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                Weekly announcements & posters
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                Gallery + updates
              </div>
            </div>
          </div>

          {/* Right card */}
          <div className="relative">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur">
              <p className="text-sm font-semibold text-[#FFD700]">Quick Links</p>

              <div className="mt-4 grid gap-3">
                <Link
                  href={`${modules.ramadan.slug}#programs`}
                  className="group rounded-xl border border-white/10 bg-black/20 p-4 transition hover:bg-black/30"
                >
                  <p className="font-semibold text-white">Programs & Taraweeh</p>
                  <p className="mt-1 text-sm text-white/70">
                    Guest speakers, nightly details, Qiyam nights
                  </p>
                </Link>

                <Link
                  href={`${modules.ramadan.slug}#announcements`}
                  className="group rounded-xl border border-white/10 bg-black/20 p-4 transition hover:bg-black/30"
                >
                  <p className="font-semibold text-white">Announcements</p>
                  <p className="mt-1 text-sm text-white/70">
                    Posters, updates, and weekly highlights
                  </p>
                </Link>

                <Link
                  href={`${modules.ramadan.slug}#volunteer`}
                  className="group rounded-xl border border-white/10 bg-black/20 p-4 transition hover:bg-black/30"
                >
                  <p className="font-semibold text-white">Volunteer</p>
                  <p className="mt-1 text-sm text-white/70">
                    Serve iftar, setup/cleanup, parking support
                  </p>
                </Link>
              </div>
            </div>

            <div className="pointer-events-none absolute -bottom-6 -left-6 h-28 w-28 rounded-full bg-[#FFD700]/10 blur-2xl" />
            <div className="pointer-events-none absolute -top-6 -right-6 h-28 w-28 rounded-full bg-[#006400]/20 blur-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
}
