// /src/components/gallery/GalleryCarousel.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon } from "@heroicons/react/24/solid";
import { fetchAlbumPhotos, ResolvedPhoto } from "@/lib/fetchAlbumPhotos";

const AUTOPLAY_MS = 5000;
const MAX_DOTS = 12; // beyond this, show a counter instead of dots

// Show only real captions (a phrase), not titles like "4", "Logo" or "DSC_0248.JPG"
const caption = (t: string | null) => {
  const v = t?.trim() ?? "";
  return /[a-z]/i.test(v) && /\s/.test(v) && !/\.(jpe?g|png|webp|heic|gif)$/i.test(v) ? v : null;
};

/**
 * Photo carousel for an album. Every slide uses the same frame; photos are shown
 * whole (no cropping) over a blurred copy of themselves, so portrait and
 * landscape shots look consistent. Slides cross-fade and auto-advance.
 */
export default function GalleryCarousel({ album = "About" }: { album?: string }) {
  const [photos, setPhotos] = useState<ResolvedPhoto[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  // Only mount images that have been (or are about to be) shown
  const [seen, setSeen] = useState<Set<number>>(new Set([0, 1]));
  const startX = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const rows = await fetchAlbumPhotos(album);
      if (cancelled) return;
      setPhotos(rows);
      setIdx(0);
      setSeen(new Set([0, 1, rows.length - 1]));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [album]);

  // Respect "reduce motion"
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) setPaused(true);
  }, []);

  const go = useCallback(
    (n: number) => {
      if (!photos.length) return;
      const next = (n + photos.length) % photos.length;
      setIdx(next);
      setSeen((s) => new Set(s).add(next).add((next + 1) % photos.length).add((next - 1 + photos.length) % photos.length));
    },
    [photos.length]
  );

  // Auto-advance (paused on hover, when stopped, or with a single photo)
  useEffect(() => {
    if (paused || hovering || photos.length < 2) return;
    const t = setTimeout(() => go(idx + 1), AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [idx, paused, hovering, photos.length, go]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") go(idx + 1);
    if (e.key === "ArrowLeft") go(idx - 1);
  };

  const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current == null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (Math.abs(dx) > 50) go(dx > 0 ? idx - 1 : idx + 1);
    startX.current = null;
  };

  const frame = "relative mx-auto aspect-[4/3] w-full max-w-6xl overflow-hidden rounded-3xl bg-gray-900 shadow-xl sm:aspect-[16/9]";

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className={`${frame} animate-pulse bg-gray-200`} aria-label="Loading photos" />
      </div>
    );
  }
  if (!photos.length) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-3xl border border-gray-200 bg-gray-50 p-10 text-center text-gray-600">
          Photos coming soon.
        </div>
      </div>
    );
  }

  const arrow =
    "absolute top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/85 p-2 text-gray-900 shadow-lg backdrop-blur transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary sm:p-3";

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div
        className={frame}
        role="region"
        aria-roledescription="carousel"
        aria-label="Photos from ICFC"
        tabIndex={0}
        onKeyDown={onKey}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {photos.map((p, i) => {
          const active = i === idx;
          return (
            <div
              key={p.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${active ? "opacity-100" : "pointer-events-none opacity-0"}`}
              aria-hidden={!active}
            >
              {seen.has(i) && (
                <>
                  {/* blurred fill so any photo shape looks intentional */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt={caption(p.title) || `Photo ${i + 1} from ICFC`}
                    className="relative h-full w-full object-contain"
                    loading={i === 0 ? "eager" : "lazy"}
                  />
                </>
              )}
            </div>
          );
        })}

        {/* soft bottom shade for controls and caption */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />

        {caption(photos[idx]?.title) && (
          <p className="absolute bottom-12 left-0 right-0 px-6 text-center text-sm font-medium text-white drop-shadow sm:text-base">
            {caption(photos[idx].title)}
          </p>
        )}

        {photos.length > 1 && (
          <>
            <button onClick={() => go(idx - 1)} aria-label="Previous photo" className={`${arrow} left-3 sm:left-4`}>
              <ChevronLeftIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            <button onClick={() => go(idx + 1)} aria-label="Next photo" className={`${arrow} right-3 sm:right-4`}>
              <ChevronRightIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>

            <div className="absolute bottom-4 left-0 right-0 z-10 flex items-center justify-center gap-3">
              {photos.length <= MAX_DOTS ? (
                <div className="flex items-center gap-2">
                  {photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => go(i)}
                      aria-label={`Go to photo ${i + 1}`}
                      aria-current={i === idx}
                      className={`h-2 rounded-full transition-all ${i === idx ? "w-6 bg-secondary" : "w-2 bg-white/70 hover:bg-white"}`}
                    />
                  ))}
                </div>
              ) : (
                <span className="rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-white">
                  {idx + 1} / {photos.length}
                </span>
              )}
              <button
                onClick={() => setPaused((p) => !p)}
                aria-label={paused ? "Play slideshow" : "Pause slideshow"}
                className="rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60"
              >
                {paused ? <PlayIcon className="h-3.5 w-3.5" /> : <PauseIcon className="h-3.5 w-3.5" />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
