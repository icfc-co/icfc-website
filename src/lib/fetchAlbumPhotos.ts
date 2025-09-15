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
};

const norm = (s?: string | null) => (s ?? "").trim().toLowerCase();

export async function fetchAlbumPhotos(album: string): Promise<ResolvedPhoto[]> {
  const { data, error } = await supabase
    .from("photos")
    .select("id,title,url,s3_key,album,created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[fetchAlbumPhotos] select error:", error);
    return [];
  }

  const wanted = (data || []).filter((p) => norm(p.album) === norm(album));
  const out: ResolvedPhoto[] = [];

  for (const p of wanted as PhotoRow[]) {
    let finalUrl = p.url || "";
    if (!finalUrl && p.s3_key) {
      try {
        const signed = await s3ImageService.getImage(p.s3_key); // ← your service
        if (signed) finalUrl = signed;
      } catch (e) {
        console.warn("[fetchAlbumPhotos] getImage failed:", p.id, p.s3_key, e);
      }
    }
    if (finalUrl) out.push({ id: p.id, title: p.title, url: finalUrl });
  }

  return out;
}
