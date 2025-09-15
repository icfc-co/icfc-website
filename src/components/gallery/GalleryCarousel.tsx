// /src/components/gallery/GalleryCarousel.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { fetchAlbumPhotos, ResolvedPhoto } from "@/lib/fetchAlbumPhotos";

export default function GalleryCarousel({ album = "About" }: { album?: string }) {
  const [photos, setPhotos] = useState<ResolvedPhoto[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const trackRef = useRef<HTMLDivElement | null>(null);

  // touch swipe
  const startX = useRef(0);
  const deltaX = useRef(0);
  const dragging = useRef(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const rows = await fetchAlbumPhotos(album);
      setPhotos(rows);
      setIdx(0);
      setLoading(false);
    })();
  }, [album]);

  const go = (n: number) => {
    if (!photos.length) return;
    setIdx((prev) => (n + photos.length) % photos.length);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") go(idx + 1);
    if (e.key === "ArrowLeft") go(idx - 1);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    dragging.current = true;
    startX.current = e.touches[0].clientX;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current) return;
    deltaX.current = e.touches[0].clientX - startX.current;
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(calc(${-idx * 100}% + ${-deltaX.current}px))`;
    }
  };
  const onTouchEnd = () => {
    dragging.current = false;
    if (Math.abs(deltaX.current) > 60) {
      if (deltaX.current > 0) go(idx - 1);
      else go(idx + 1);
    } else {
      // snap back
      if (trackRef.current) {
        trackRef.current.style.transform = `translateX(${-idx * 100}%)`;
      }
    }
    deltaX.current = 0;
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-8 text-center text-neutral-600">
        Loading photos…
      </div>
    );
  }
  if (!photos.length) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-8 text-center text-neutral-600">
        Photos coming soon.
      </div>
    );
  }

  return (
    <div
      className="relative rounded-2xl border border-neutral-200 bg-white shadow-sm"
      tabIndex={0}
      onKeyDown={onKey}
    >
      {/* track */}
      <div
        className="overflow-hidden rounded-2xl"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          ref={trackRef}
          className="flex transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(${-idx * 100}%)` }}
        >
          {photos.map((p) => (
            <div key={p.id} className="w-full shrink-0">
              <img
                src={p.url}
                alt="ICFC photo"
                className="block w-full h-[420px] md:h-[520px] object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>

      {/* arrows */}
      <button
        onClick={() => go(idx - 1)}
        aria-label="Previous photo"
        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 text-white px-3 py-2 hover:bg-black/60"
      >
        ‹
      </button>
      <button
        onClick={() => go(idx + 1)}
        aria-label="Next photo"
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 text-white px-3 py-2 hover:bg-black/60"
      >
        ›
      </button>

      {/* dots */}
      <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2">
        {photos.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-2.5 w-2.5 rounded-full border border-white/70 ${i === idx ? "bg-white" : "bg-white/40"}`}
          />
        ))}
      </div>
    </div>
  );
}
