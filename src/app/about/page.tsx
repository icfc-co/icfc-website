// /src/app/about/page.tsx
import GalleryCarousel from "@/components/gallery/GalleryCarousel";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        <h1
          className="font-[var(--font-bebas,inherit)] text-5xl sm:text-6xl tracking-wide"
          style={{ color: "#FFD700" }} // ICFC Gold
        >
          About ICFC
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-7 text-neutral-700">
          ICFC is a non-profit, tax-exempt organization (Tax-ID: 74-222324) registered under IRS code 501(c)(3) for
          educational, religious, and social purposes. Its activities align with Quranic teachings and the
          traditions of Prophet Mohammed (Peace Be upon Him).
        </p>
      </section>

      {/* Two-column: text + slider */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Left: cards */}
        <div className="space-y-6">
          <InfoCard
            title="About Us"
            bullets={[
              "ICFC is a non-profit, tax-exempt organization (Tax-ID: 74-222324) registered under IRS code 501(c)(3) for educational, religious, and social purposes.",
              "Its activities align with Quranic teachings and the traditions of Prophet Mohammed (Peace Be upon Him).",
            ]}
          />
          <InfoCard
            title="Objectives"
            bullets={[
              "ICFC is a diverse, inclusive community that encourages equal participation and engagement from all members of Ahle Sunnah Wal Jam ‘at.",
              "Committed to civic involvement and collaboration with other faith communities.",
            ]}
          />
          <InfoCard
            title="Vision"
            bullets={[
              "To transform the Islamic Center of Fort Collins (ICFC) into a comprehensive community hub that provides a one-window operation for the Muslim community, while planning for future growth and expansion.",
            ]}
          />
          <InfoCard
            title="Mission"
            bullets={[
              "Establish a food pantry for those in need.",
              "Develop revenue-generating initiatives such as a fitness center or halal kitchen.",
              "Aspire to launch a full-time Islamic school.",
              "Provide social services for retirement, matrimonial needs, and funerals.",
            ]}
          />
        </div>

        {/* Right: carousel */}
        <div>
          <h2
            className="mb-3 text-2xl md:text-3xl font-semibold"
            style={{ color: "#006400" }} // ICFC Green
          >
            Life at ICFC
          </h2>
          <GalleryCarousel album="About" />
        </div>
      </section>
    </main>
  );
}

function InfoCard({ title, bullets }: { title: string; bullets: string[] }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm p-6">
      <div className="flex items-center gap-3">
        <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: "#006400" }} />
        <h3 className="text-xl font-semibold text-neutral-900">{title}</h3>
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
