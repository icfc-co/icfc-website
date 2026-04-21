// /src/lib/fetchAlbumPhotos.ts
import { supabase } from "@/lib/supabaseClient";
import { s3ImageService } from "@/app/services/s3ImageService";

export type PhotoRow = {
  id: string;
  title: string | null;
  url: string | null;
  s3_key: string | null;
  album: string | null;
  created_at: string | null;
};

export type ResolvedPhoto = {
  id: string | number;
  title: string | null;
  url: string; // guaranteed
  created_at: string | null;
};

export async function fetchAlbumPhotos(album: string): Promise<ResolvedPhoto[]> {
  // Filter by album at the DB level so the LIMIT and ORDER BY apply per-album,
  // not globally across all albums (which could cut off older album photos).
  const { data, error } = await supabase
    .from("photos")
    .select("id,title,url,s3_key,album,created_at")
    .ilike("album", album.trim())
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[fetchAlbumPhotos] select error:", error);
    return [];
  }

  const out: ResolvedPhoto[] = [];

  for (const p of (data || []) as PhotoRow[]) {
    let finalUrl = p.url || "";
    if (!finalUrl && p.s3_key) {
      try {
        const signed = await s3ImageService.getImage(p.s3_key);
        if (signed) finalUrl = signed;
      } catch (e) {
        console.warn("[fetchAlbumPhotos] getImage failed:", p.id, p.s3_key, e);
      }
    }
    if (finalUrl) out.push({ id: p.id, title: p.title, url: finalUrl, created_at: p.created_at });
  }

  // Safety: re-sort client-side in case created_at values differ after S3 resolution
  out.sort((a, b) => {
    if (!a.created_at && !b.created_at) return 0;
    if (!a.created_at) return 1;
    if (!b.created_at) return -1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return out;
}
