// /src/app/modules/community/events/page.tsx
import GalleryCarousel from "@/components/gallery/GalleryCarousel";

export default function EventsPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 pb-8">
  <h1
    className="font-[var(--font-bebas,inherit)] text-5xl sm:text-6xl tracking-wide text-center"
    style={{ color: "#FFD700" }}
  >
    Upcoming Events
  </h1>
</section>

<section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16 flex justify-center">
  <GalleryCarousel album="Events" />
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
