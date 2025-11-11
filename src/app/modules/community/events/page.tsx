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
