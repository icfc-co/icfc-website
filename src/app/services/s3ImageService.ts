const SUPABASE_EDGE_URL = 'https://iutrkewvhchqskjbuzqc.functions.supabase.co/functions/v1/manage-s3-images';

function getAuthHeader() {
  return {
    Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };
}

export const s3ImageService = {
  async uploadImage(fileName: string, fileType: string) {
    const res = await fetch(SUPABASE_EDGE_URL, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ operation: 'upload', fileName, fileType }),
    });
    if (!res.ok) throw new Error("Failed to get upload URL");
    const data = await res.json();
    return data.url;
  },

  async listImages(): Promise<string[]> {
    const res = await fetch(SUPABASE_EDGE_URL, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ operation: 'list' }),
    });
    if (!res.ok) throw new Error("Failed to list images");
    const data = await res.json();
    return data.files;
  },

  async getImage(fileName: string): Promise<string | null> {
    const res = await fetch(SUPABASE_EDGE_URL, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ operation: 'fetch', fileName }),
    });
    if (!res.ok) throw new Error("Failed to fetch image");
    const data = await res.json();
    return data.url;
  },

  async deleteImage(fileName: string): Promise<void> {
    const res = await fetch(SUPABASE_EDGE_URL, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ operation: 'delete', fileName }),
    });
    if (!res.ok) throw new Error("Failed to delete image");
  },
};
