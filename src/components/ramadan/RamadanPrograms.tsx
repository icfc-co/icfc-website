"use client";

import { useMemo, useState } from "react";

type ProgramCategory =
  | "All"
  | "Prayer & Quran"
  | "Kids & Family"
  | "Competitions & Games"
  | "Food & Nights"
  | "Community & Social"
  | "Operations";

type Program = {
  id: string;
  title: string;
  category: Exclude<ProgramCategory, "All">;
  short: string;
  details: string[];
  date?: string;
  tags?: string[];
};

const KEY_DATES = [
  { label: "Fundraising Iftar (Community Center)", date: "Mar 1, 2026" },
  { label: "IRUSA Grand Iftar (Denver)", date: "Night before (Feb 28, 2026)" },
  { label: "CSU MSA Iftar", date: "Mar 8, 2026" },
  { label: "Youth Itekaf (Girls)", date: "Mar 13, 2026" },
  { label: "Youth Itekaf (Boys)", date: "Mar 14, 2026" },
  { label: "Khatm Night + Celebration", date: "Sun, Mar 15, 2026" },
  { label: "Deep Cleaning & Decoration", date: "Feb 16, 2026" },
];

const PROGRAMS: Program[] = [
  {
    id: "childcare",
    title: "Childcare (Under 7)",
    category: "Kids & Family",
    short: "Childcare is available for children younger than 7, paid for by the masjid.",
    details: ["Childcare for children younger than 7 is available.", "This is paid for by the masjid."],
    tags: ["Family-friendly", "Masjid-funded"],
  },
  {
    id: "taraweeh-breaks",
    title: "Taraweeh Breaks (Unwind & Hydrate)",
    category: "Prayer & Quran",
    short: "Between each 4 rak’ah, use the time to unwind and hydrate (no khatira).",
    details: [
      "There was an idea about a khatira between each 4 rak’ah.",
      "Instead, people can use that time to unwind and hydrate.",
      "A daily short WhatsApp message will be sent about the 20 pages to be recited that night.",
    ],
    tags: ["Taraweeh", "Daily WhatsApp reminder"],
  },
  {
    id: "water-policy",
    title: "Water Policy (Refillable Cups)",
    category: "Operations",
    short: "Refillable cups will be provided. No water bottles—use fountains or bring your own bottle.",
    details: [
      "The masjid will provide refillable cups but no water bottles.",
      "Please use the fountains or bring your own water container.",
    ],
    tags: ["Eco-friendly"],
  },
  {
    id: "social-after-witr",
    title: "Socializing After Witr (Basement Only)",
    category: "Community & Social",
    short: "Socializing after witr is welcome—basement only, and please clean up afterward.",
    details: [
      "Those who want to socialize after witr are welcome to do so.",
      "Please only use the basement.",
      "Clean after you are done please.",
    ],
    tags: ["Basement only", "Keep it clean"],
  },
  {
    id: "kids-nightly-raffle",
    title: "Nightly Kids Raffle Gift",
    category: "Kids & Family",
    short: "One child will be chosen every night through raffle tickets to receive a gift.",
    details: [
      "One child will be chosen every night through raffle ticket to receive a gift.",
      "That will be announced between each 4 rak’ah.",
    ],
    tags: ["Kids", "Nightly prize"],
  },
  {
    id: "daily-kahoot",
    title: "Daily Kahoot (5 PM)",
    category: "Competitions & Games",
    short: "Daily online Kahoot at 5 PM for all ages about the 20 pages for that night.",
    details: [
      "There is a daily online kahoot at 5pm for all ages about the 20 pages for that night.",
      "The winner will be announced and given their prize between each 4 rak’ah.",
      "The code will be sent 5 minutes before it starts.",
    ],
    tags: ["All ages", "5 PM", "Daily"],
  },
  {
    id: "masjid-cup",
    title: "Masjid Cup (Weekly House Competition)",
    category: "Competitions & Games",
    short: "Weekly house competition for 4 houses. Winning house announced on the 27th night.",
    details: [
      "There will be a weekly house competition for the 4 houses competing in the Masjid Cup.",
      "The winning house is announced on the 27th night.",
    ],
    tags: ["Masjid Cup", "27th night"],
  },
  {
    id: "quran-competition",
    title: "Quran Competition (Last 10 Nights)",
    category: "Prayer & Quran",
    short: "A Quran competition is planned for the last 10 nights—open to all ages.",
    details: ["A Quran competition is planned for the last 10 nights.", "All age groups are welcome."],
    tags: ["Last 10 nights", "All ages"],
  },
  {
    id: "itekaf-youth",
    title: "Youth Itekaf Nights (Ages 13–18)",
    category: "Kids & Family",
    short: "Girls: March 13 • Boys: March 14 (youth ages 13–18).",
    details: [
      "Itekaf night is planned for March 13 for girls.",
      "March 14 for boys.",
      "This is for youth ages 13–18.",
    ],
    date: "Mar 13 (Girls) • Mar 14 (Boys)",
    tags: ["Youth", "Overnight"],
  },
  {
    id: "8-rakah-khatm",
    title: "8 Rak’ah Recitation + Khatm Night",
    category: "Prayer & Quran",
    short: "Recitation is 8 rak’ah. Khatm planned for Sunday March 15, followed by a short celebration.",
    details: ["Recitation is 8 rak’ah.", "Khatm is planned for Sunday March 15.", "Followed by a short celebration."],
    date: "Sun, Mar 15, 2026",
    tags: ["Khatm", "Celebration"],
  },
  {
    id: "daily-iftar",
    title: "Daily Iftar",
    category: "Food & Nights",
    short: "Daily iftar at the masjid throughout Ramadan.",
    details: ["Daily iftar."],
    tags: ["Food", "Community"],
  },
  {
    id: "suhoor-qiyam",
    title: "Suhoor After Qiyam (Last 10 Nights)",
    category: "Food & Nights",
    short: "Suhoor will be provided after qiyam during the last 10 nights.",
    details: ["Suhoor after qiyam last 10 nights."],
    tags: ["Last 10 nights", "Qiyam"],
  },
  {
    id: "deep-cleaning",
    title: "Deep Cleaning & Decoration",
    category: "Operations",
    short: "Deep cleaning & decoration on Feb 16 (one day after bazaar, one day before Ramadan).",
    details: [
      "Deep cleaning and decoration is happening on the 16th of February.",
      "One day after the bazaar and one day before Ramadan.",
    ],
    date: "Feb 16, 2026",
    tags: ["Volunteers welcome"],
  },
  {
    id: "ihsan-tokens",
    title: "Ihsan Tokens (Kids Rewards)",
    category: "Kids & Family",
    short: "Catch kids doing good and reward with Ihsan tokens. End-of-month gifts for all participants.",
    details: [
      "The goal is to catch children doing good and reward them with ihsan tokens.",
      "Children will track fasting, praying, and Quran recitation.",
      "All will be awarded a gift at the end of the month.",
    ],
    tags: ["Motivation", "End-of-month gift"],
  },
  {
    id: "ihsan-feedback",
    title: "Ihsan First — Feedback Welcome",
    category: "Community & Social",
    short: "If we can do anything to improve your experience, please let us know.",
    details: ["Ihsan first, foremost, and always.", "If we can do anything to improve your experience, please let us know."],
    tags: ["Community care"],
  },
];

// 🎨 Category styling (soft tint + border color + little icon)
const STYLE: Record<
  Exclude<ProgramCategory, "All">,
  //{ icon: string; badgeBg: string; badgeText: string; cardBg: string; borderTop: string }
  {badgeBg: string; badgeText: string; cardBg: string; borderTop: string }
> = {
  "Prayer & Quran": {
    //icon: "📖",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-900",
    cardBg: "bg-emerald-50/40",
    borderTop: "border-t-4 border-emerald-500/70",
  },
  "Kids & Family": {
    //icon: "🧒",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-900",
    cardBg: "bg-amber-50/40",
    borderTop: "border-t-4 border-amber-500/70",
  },
  "Competitions & Games": {
    //icon: "🏆",
    badgeBg: "bg-purple-50",
    badgeText: "text-purple-900",
    cardBg: "bg-purple-50/40",
    borderTop: "border-t-4 border-purple-500/70",
  },
  "Food & Nights": {
    //icon: "🌙",
    badgeBg: "bg-indigo-50",
    badgeText: "text-indigo-900",
    cardBg: "bg-indigo-50/40",
    borderTop: "border-t-4 border-indigo-500/70",
  },
  "Community & Social": {
    //icon: "🤝",
    badgeBg: "bg-sky-50",
    badgeText: "text-sky-900",
    cardBg: "bg-sky-50/40",
    borderTop: "border-t-4 border-sky-500/70",
  },
  Operations: {
    //icon: "🧹",
    badgeBg: "bg-rose-50",
    badgeText: "text-rose-900",
    cardBg: "bg-rose-50/40",
    borderTop: "border-t-4 border-rose-500/70",
  },
};

export default function RamadanPrograms() {
  const [category, setCategory] = useState<ProgramCategory>("All");
  const [active, setActive] = useState<Program | null>(null);

  const categories: ProgramCategory[] = [
    "All",
    "Prayer & Quran",
    "Kids & Family",
    "Food & Nights",
    "Competitions & Games",
    "Community & Social",
    "Operations",
  ];

  const filtered = useMemo(() => {
    if (category === "All") return PROGRAMS;
    return PROGRAMS.filter((p) => p.category === category);
  }, [category]);

  return (
    <section id="programs" className="relative bg-gray-50">
      {/* subtle background flair */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.25] bg-[radial-gradient(circle_at_20%_10%,#FFD700_0,transparent_40%),radial-gradient(circle_at_90%_30%,#006400_0,transparent_45%)]" />

      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-['Montserrat'] text-3xl font-bold text-[#0b2a17]">Programs & Announcements</h2>
            <p className="mt-2 text-gray-600">
              Prayer, Quran, youth initiatives, competitions, community nights, and key dates.
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
                    : "border border-gray-200 bg-white text-[#0b2a17] hover:bg-gray-100",
                ].join(" ")}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Key dates */}
        <div className="mt-7 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-semibold text-[#006400]">Key Dates</p>
            <p className="text-xs font-semibold text-gray-500">Save the nights • Plan ahead</p>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {KEY_DATES.map((d) => (
              <div key={d.label} className="rounded-xl border bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-900">{d.label}</p>
                <p className="mt-1 text-sm text-gray-600">{d.date}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Programs grid */}
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const s = STYLE[p.category];

            return (
              <button
                key={p.id}
                onClick={() => setActive(p)}
                className={[
                  "text-left rounded-2xl border shadow-sm transition hover:shadow-md",
                  "bg-white",
                  s.borderTop,
                ].join(" ")}
              >
                <div className={`rounded-t-2xl ${s.cardBg} p-4`}>
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                        {/* <span className="text-lg" aria-hidden>
                            {s.icon}
                        </span> */}

                        <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${s.badgeBg} ${s.badgeText}`}
                        >
                            {p.category}
                        </span>
                        </div>

                        <h3 className="mt-2 break-words text-lg font-bold text-gray-900">
                        {p.title}
                        </h3>

                        {p.date && <p className="mt-1 text-sm font-semibold text-[#0b2a17]">{p.date}</p>}
                    </div>

                    <span className="shrink-0 rounded-full border bg-white/70 px-3 py-1 text-xs font-semibold text-gray-700">
                        Details
                    </span>
                    </div>


                  <p className="mt-3 text-sm text-gray-700">{p.short}</p>

                  {p.tags?.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {p.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full border bg-white/70 px-3 py-1 text-xs font-semibold text-gray-700"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#0b2a17]">
                    Learn more <span aria-hidden>→</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setActive(null)}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b p-5">
              <div>
                <p className="text-xs font-semibold text-[#006400]">{active.category}</p>
                <h3 className="mt-1 text-2xl font-bold text-gray-900">{active.title}</h3>
                {active.date && <p className="mt-1 text-sm font-semibold text-[#0b2a17]">{active.date}</p>}
              </div>

              <button
                className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-gray-50"
                onClick={() => setActive(null)}
              >
                Close
              </button>
            </div>

            <div className="p-5">
              <p className="text-sm text-gray-600">{active.short}</p>

              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-gray-800">
                {active.details.map((line, idx) => (
                  <li key={idx}>{line}</li>
                ))}
              </ul>

              {active.tags?.length ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {active.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
