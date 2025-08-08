// PhotosRepo.ts
import { supabase } from "@/lib/supabaseClient";

type PhotoUpdate = Partial<{
  title: string;
  album: string;
  s3_key: string | null;
  url: string | null;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
  updated_by: string | null;          // <- add
  updated_by_name: string | null;     // <- add
  created_at: string;
  updated_at: string | null;          // <- add
}>;

export const PhotosRepo = {
  async list() {
    const { data, error } = await supabase
      .from("photos")
      .select(`
        id, title, album, url, s3_key,
        uploaded_by, uploaded_by_name, created_at,
        updated_by, updated_by_name, updated_at
      `)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async update(id: number, data: PhotoUpdate) {
    const { data: row, error } = await supabase
      .from("photos")
      .update(data)
      .eq("id", id)
      .select(`
        id, title, album, url, s3_key,
        uploaded_by, uploaded_by_name, created_at,
        updated_by, updated_by_name, updated_at
      `)
      .maybeSingle();
    return { data: row, error };
  },

  async insert(data: PhotoUpdate) {
    const { data: row, error } = await supabase
      .from("photos")
      .insert(data)
      .select(`
        id, title, album, url, s3_key,
        uploaded_by, uploaded_by_name, created_at,
        updated_by, updated_by_name, updated_at
      `)
      .maybeSingle();
    if (error) throw error;
    return row;
  },

  async remove(id: number) {
    const { error } = await supabase.from("photos").delete().eq("id", id);
    if (error) throw error;
  },
};
