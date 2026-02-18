"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type Category = "All" | "General" | "Iftar" | "Taraweeh" | "Youth" | "Fundraising";

type Poster = {
  id: string;
  title: string;
  date?: string;
  category: Exclude<Category, "All">;
  image: string; // path from /public
  desc?: string;
};

const POSTERS: Poster[] = [
  // ✅ Update these to match your real files in /public/ramadan/announcements/
  {
    id: "isha-taraweeh",
    title: "Isha & Taraweeh",
    category: "Taraweeh",
    image: "/ramadan/announcements/ishaTiming.jpeg",
    desc: "Ramadan Isha Iqama Times. Details inside.",
  },
  {
    id: "guest-speaker",
    title: "Guest Speaker",
    category: "Iftar",
    date: "March 8, 2026",
    image: "/ramadan/announcements/guestSpeaker.jpeg",
    desc: "Guest speaker schedule for Ramadan. Join us nightly for inspiring talks.",
  },
  {
    id: "sponsor-iftar",
    title: "Sponsor Iftar",
    date: "February 16, 2026",
    category: "Fundraising",
    image: "/ramadan/announcements/sponsorIftar.jpeg",
    desc: "Support our community by sponsoring an iftar meal during Ramadan.",
  },
  {
    id: "masjid-cup",
    title: "Masjid Cup",
    category: "Youth",
    date: "Ramadan 2026",
    image: "/ramadan/announcements/masjidCup.jpeg",
    desc: "Join us for the annual Masjid Cup tournament. Exciting matches and community fun await!",
  },
  {
    id: "ramadan-bazaar",
    title: "Ramadan Bazaar",
    date: "February 15, 2026",
    category: "General",
    image: "/ramadan/announcements/ramadanBazar.jpeg",
    desc: "Community bazaar with vendors and family-friendly activities.",
  },
  {
    id: "childcare-ramadan",
    title: "Childcare During Taraweeh",
    date: "Ramadan 2026",
    category: "Taraweeh",
    image: "/ramadan/announcements/childcare.jpeg",
    desc: "Join us for iftar. Sponsorship available.",
  },
  {
    id: "cleanup-ramadan",
    title: "Cleanup During Ramadan",
    date: "February 16, 2026",
    category: "Taraweeh",
    image: "/ramadan/announcements/cleanup.jpeg",
    desc: "Help keep our center clean during Ramadan. Volunteer for setup and cleanup shifts.",
  },
  {
    id: "reverts-guide",
    title: "Reverts Guide",
    date: "February 14, 2026",
    category: "General",
    image: "/ramadan/announcements/revertsGuide.jpeg",
    desc: "Guide for new reverts during Ramadan. Learn about our programs and activities.",
  },
];

export default function RamadanAnnouncements() {
  const [category, setCategory] = useState<Category>("All");
  const [active, setActive] = useState<Poster | null>(null);

  const categories: Category[] = ["All", "General", "Iftar", "Taraweeh", "Youth", "Fundraising"];

  const filtered = useMemo(() => {
    if (category === "All") return POSTERS;
    return POSTERS.filter((p) => p.category === category);
  }, [category]);

  return (
    <section id="announcements" className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-['Montserrat'] text-3xl font-bold text-[#0b2a17]">
            Posters
          </h2>
          <p className="mt-2 text-gray-600">
            Latest updates for programs, iftars, Taraweeh, youth, sisters, and fundraising.
          </p>
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={[
                "rounded-full px-4 py-2 text-sm font-semibold transition",
                category === c
                  ? "bg-[#0b2a17] text-white"
                  : "border border-gray-200 bg-white text-[#0b2a17] hover:bg-gray-50",
              ].join(" ")}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <button
            key={p.id}
            onClick={() => setActive(p)}
            className="group text-left rounded-2xl border bg-white shadow-sm transition hover:shadow-md"
          >
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-t-2xl bg-gray-100">
              <Image
                src={p.image}
                alt={p.title}
                fill
                className="object-cover transition duration-300 group-hover:scale-[1.02]"
                sizes="(max-width: 1024px) 50vw, 33vw"
              />
            </div>

            <div className="p-4">
              <p className="text-xs font-semibold text-[#006400]">{p.category}</p>
              <h3 className="mt-1 text-lg font-bold text-gray-900">{p.title}</h3>
              {p.date && <p className="mt-1 text-sm text-gray-600">{p.date}</p>}
              {p.desc && <p className="mt-2 line-clamp-2 text-sm text-gray-600">{p.desc}</p>}
            </div>
          </button>
        ))}
      </div>

      {/* Modal preview */}
      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setActive(null)}
        >
          <div
            className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <p className="text-xs font-semibold text-[#006400]">{active.category}</p>
                <p className="text-lg font-bold text-gray-900">{active.title}</p>
                {active.date && <p className="text-sm text-gray-600">{active.date}</p>}
              </div>

              <button
                className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-gray-50"
                onClick={() => setActive(null)}
              >
                Close
              </button>
            </div>

            <div className="relative aspect-[4/5] w-full bg-gray-100">
              <Image src={active.image} alt={active.title} fill className="object-contain" sizes="100vw" />
            </div>

            {active.desc && <div className="p-4 text-sm text-gray-700">{active.desc}</div>}
          </div>
        </div>
      )}
    </section>
  );
}
