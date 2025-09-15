// /src/components/gallery/AboutGallery.tsx
"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@headlessui/react";
import { fetchAlbumPhotos, ResolvedPhoto } from "@/lib/fetchAlbumPhotos";

export default function AboutGallery({ album = "About" }: { album?: string }) {
  const [photos, setPhotos] = useState<ResolvedPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      const items = await fetchAlbumPhotos(album);
      console.log(`[AboutGallery] album=${album} rows=${items.length}`, items.slice(0, 3));
      if (!items.length) setErr("No photos found for this album.");
      setPhotos(items);
      setLoading(false);
    })();
  }, [album]);

  if (loading) {
    return <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">Loading photos…</div>;
  }
  if (err) {
    return <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">{err}</div>;
  }

  const onOpen = (i: number) => { setActiveIdx(i); setOpen(true); };
  const onNext = () => setActiveIdx((i) => (i + 1) % photos.length);
  const onPrev = () => setActiveIdx((i) => (i - 1 + photos.length) % photos.length);

  return (
    <>
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl md:text-3xl font-semibold" style={{ color: "#FFD700" }}>Life at ICFC</h2>
        <span className="text-xs uppercase tracking-wider rounded-full px-3 py-1" style={{ backgroundColor: "#006400" }}>
          Album: {album}
        </span>
      </header>

      {/* Use <img> first to eliminate next/image domain blocking */}
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 [column-fill:_balance]">
        {photos.map((p, idx) => (
          <figure key={p.id} className="mb-4 break-inside-avoid rounded-2xl overflow-hidden shadow-lg ring-1 ring-white/10 hover:-translate-y-0.5 hover:shadow-xl transition">
            <button className="relative block w-full focus:outline-none" onClick={() => onOpen(idx)} aria-label={p.title || "Open image"}>
              <img
                src={p.url}
                alt={p.title || "ICFC photo"}
                className="w-full h-auto object-cover"
                loading={idx < 3 ? "eager" : "lazy"}
              />
            </button>
            {p.title && <figcaption className="px-4 py-3 text-sm text-white/90 bg-black/30 backdrop-blur">{p.title}</figcaption>}
          </figure>
        ))}
      </div>

      {/* Lightbox */}
      <Dialog open={open} onClose={setOpen} className="relative z-50">
        <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="relative w-full max-w-5xl rounded-2xl overflow-hidden bg-black">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-3 z-10 rounded-full bg-white/10 px-3 py-1 text-sm text-white hover:bg-white/20" aria-label="Close">✕</button>

            <div className="relative">
              <img src={photos[activeIdx]?.url} alt={photos[activeIdx]?.title || "ICFC photo"} className="w-full h-auto object-contain bg-black" />
              {photos.length > 1 && (
                <>
                  <button onClick={onPrev} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-white hover:bg-white/20" aria-label="Previous">‹</button>
                  <button onClick={onNext} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-white hover:bg-white/20" aria-label="Next">›</button>
                </>
              )}
              {photos[activeIdx]?.title && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
                  <Dialog.Title className="text-base font-medium">{photos[activeIdx]?.title}</Dialog.Title>
                </div>
              )}
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  );
}
