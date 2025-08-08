"use client";

import { useEffect, useMemo, useState } from "react";
import { s3ImageService } from "@/app/services/s3ImageService";
import { supabase } from "@/lib/supabaseClient";
import { PhotosRepo } from "@/app/services/photosRepo";

type PhotoRow = {
  id: number;
  title: string;
  url: string | null;
  s3_key: string | null;
  album: string;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
  created_at: string;
  updated_by: string | null;
  updated_by_name: string | null;
  updated_at: string | null;
};

export default function PhotoManagerPage() {
  // data
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<PhotoRow | null>(null);

  // messages
  const [msg, setMsg] = useState<string | null>(null);

  // preview
  const [signedPreview, setSignedPreview] = useState<string | null>(null);

  // upload form
  const [newAlbum, setNewAlbum] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [formBusy, setFormBusy] = useState(false);

  // edit form
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editAlbum, setEditAlbum] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editBusy, setEditBusy] = useState(false);

  // load on mount
  useEffect(() => {
    void loadPhotos();
  }, []);

  // signed preview when selection changes
  useEffect(() => {
    let active = true;
    (async () => {
      if (!selected) { setSignedPreview(null); return; }
      if (selected.s3_key) {
        setSignedPreview(null); // avoid <img src="">
        try {
          const url = await s3ImageService.getImage(selected.s3_key);
          if (active) setSignedPreview(url);
        } catch {
          if (active) setSignedPreview(null);
        }
      } else {
        setSignedPreview(selected.url ?? null);
      }
    })();
    return () => { active = false; };
  }, [selected]);

  async function loadPhotos() {
    setLoading(true);
    setMsg(null);
    try {
      const rows = await PhotosRepo.list();
      setPhotos(rows);
      if (rows.length > 0) {
        const first = rows[0].album || "Other";
        setExpanded((e) => ({ ...e, [first]: true }));
      }
    } catch (e: any) {
      setMsg(e?.message || "Failed to load photos");
    } finally {
      setLoading(false);
    }
  }

  // group by album
  const albums = useMemo(() => {
    const map: Record<string, PhotoRow[]> = {};
    for (const p of photos) {
      const key = p.album || "Other";
      (map[key] ||= []).push(p);
    }
    Object.keys(map).forEach((k) =>
      map[k].sort((a, b) => b.created_at.localeCompare(a.created_at))
    );
    return map;
  }, [photos]);

  function toggleAlbum(album: string) {
    setExpanded((e) => ({ ...e, [album]: !e[album] }));
  }

  async function handleDelete(row: PhotoRow) {
    setMsg(null);
    if (!confirm(`Delete "${row.title}"?`)) return;
    try {
      await PhotosRepo.remove(row.id);
      if (row.s3_key) {
        await s3ImageService.deleteImage(row.s3_key);
      }
      setMsg("✅ Deleted");
      await loadPhotos();
      if (selected?.id === row.id) setSelected(null);
    } catch (e: any) {
      setMsg("❌ Delete failed: " + (e.message || ""));
    }
  }

  function handleView(row: PhotoRow) {
    setSelected(row);
  }

  function handleUpdate(row: PhotoRow) {
    setSelected(row);
    setEditTitle(row.title ?? "");
    setEditAlbum(row.album ?? "");
    setEditFile(null);
    setEditOpen(true);
  }

  // ===== CREATE =====
  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!newFile || !newTitle.trim() || !newAlbum.trim()) {
      setMsg("Please provide album, title, and file.");
      return;
    }
    setFormBusy(true);
    setMsg(null);
    try {
      // 1) PUT to S3 (key is usually generated in edge fn; here we just use filename)
      const presigned = await s3ImageService.uploadImage(newFile.name, newFile.type);
      const putRes = await fetch(presigned, {
        method: "PUT",
        headers: { "Content-Type": newFile.type },
        body: newFile,
      });
      if (!putRes.ok) throw new Error(await putRes.text());
      const key = new URL(presigned).pathname.replace(/^\/+/, "");

      // 2) who’s uploading?
      const user = (await supabase.auth.getUser()).data.user;
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user?.id)
        .single();

      // 3) insert row
      await PhotosRepo.insert({
        title: newTitle.trim(),
        album: newAlbum.trim(),
        s3_key: key,
        url: null, // keep bucket private
        uploaded_by: user?.id ?? null,
        uploaded_by_name: profile?.name ?? "Unknown",
        created_at: new Date().toISOString(),
      });

      setMsg("✅ Uploaded!");
      setNewTitle("");
      setNewAlbum("");
      setNewFile(null);
      await loadPhotos();
    } catch (e: any) {
      setMsg("❌ Upload failed: " + (e.message || ""));
    } finally {
      setFormBusy(false);
    }
  }

  // ===== UPDATE =====
  async function handleEditSave() {
    if (!selected) { setMsg("❌ No photo selected"); return; }
    const id = Number(selected.id);
    if (!Number.isFinite(id)) { setMsg("❌ Invalid photo id"); return; }

    setEditBusy(true);
    setMsg(null);

    try {
      let newKey: string | null = null;

      // If replacing the image: overwrite the SAME key in S3
      if (editFile) {
        const keyToUse = selected.s3_key ?? editFile.name;
        const presigned = await s3ImageService.uploadImage(keyToUse, editFile.type);
        const putRes = await fetch(presigned, {
          method: "PUT",
          headers: { "Content-Type": editFile.type },
          body: editFile,
        });
        if (!putRes.ok) throw new Error(await putRes.text());
        newKey = keyToUse; // we overwrote existing key
      }

      // who’s editing?
      const user = (await supabase.auth.getUser()).data.user;
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user?.id)
        .single();

      const payload: any = {
        title: editTitle.trim(),
        album: editAlbum.trim(),
        updated_by: user?.id ?? null,
        updated_by_name: profile?.name ?? "Unknown",
        updated_at: new Date().toISOString(),
      };
      if (newKey) {
        payload.s3_key = newKey;
        payload.url = null; // keep using signed GETs
      }

      const { error } = await PhotosRepo.update(id, payload);
      if (error) throw error;

      setMsg("✅ Updated");
      setEditOpen(false);
      setEditFile(null);
      await loadPhotos();
    } catch (e: any) {
      setMsg("❌ Update failed: " + (e.message || ""));
    } finally {
      setEditBusy(false);
    }
  }

  function handleEditCancel() {
    setEditOpen(false);
  }

  return (
    <div className="min-h-screen w-full px-6 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8 max-w-6xl mx-auto">
        {/* LEFT: Albums & tables */}
        <div>
          <h1 className="text-2xl font-bold mb-4 text-center">Photo Library</h1>

          {msg && <p className="text-sm mb-4 text-center text-red-500">{msg}</p>}

          {loading ? (
            <p className="text-center">Loading…</p>
          ) : (
            <div className="space-y-3 max-w-3xl mx-auto">
              {Object.keys(albums).length === 0 && (
                <div className="text-center text-gray-500">No photos yet.</div>
              )}

              {Object.entries(albums).map(([album, rows]) => (
                <div key={album} className="border rounded-md shadow-sm bg-white overflow-hidden">
                  {/* Panel header */}
                  <button
                    onClick={() => toggleAlbum(album)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100"
                  >
                    <span className="font-semibold">{album}</span>
                    <span className="text-sm text-gray-500">
                      {expanded[album] ? "▲" : "▼"}
                    </span>
                  </button>

                  {/* Body */}
                  {expanded[album] && (
                    <div className="p-0 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-100 text-left">
                            <th className="px-3 py-2">Title</th>
                            <th className="px-3 py-2">Album</th>
                            <th className="px-3 py-2">Added by</th>
                            <th className="px-3 py-2">Created</th>
                            <th className="px-3 py-2">Updated by</th>
                            <th className="px-3 py-2">Updated</th>
                            <th className="px-3 py-2 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row) => (
                            <tr key={row.id} className="border-t">
                              <td className="px-3 py-2">{row.title}</td>
                              <td className="px-3 py-2">{row.album}</td>
                              <td className="px-3 py-2">{row.uploaded_by_name || "—"}</td>
                              <td className="px-3 py-2">
                                {new Date(row.created_at).toLocaleString()}
                              </td>
                              <td className="px-3 py-2">{row.updated_by_name || "—"}</td>
                              <td className="px-3 py-2">
                                {row.updated_at ? new Date(row.updated_at).toLocaleString() : "—"}
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2 justify-end">
                                  <button
                                    className="text-blue-600 hover:underline"
                                    onClick={() => handleView(row)}
                                  >
                                    View
                                  </button>
                                  <button
                                    className="text-amber-600 hover:underline"
                                    onClick={() => handleUpdate(row)}
                                  >
                                    Update
                                  </button>
                                  <button
                                    className="text-red-600 hover:underline"
                                    onClick={() => handleDelete(row)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Preview + Edit + Upload */}
        <div className="space-y-6">
          {/* Preview */}
          <div className="border rounded-md p-4 bg-white shadow-sm">
            <h2 className="font-semibold mb-3">Preview</h2>
            {!selected ? (
              <p className="text-sm text-gray-500">Select an image to preview</p>
            ) : (
              <div className="space-y-3">
                <div className="text-sm">
                  <div className="font-semibold">{selected.title}</div>
                  <div className="text-gray-500">{selected.album}</div>
                </div>
                {signedPreview ? (
                  <img
                    src={signedPreview}
                    alt={selected.title}
                    className="max-w-full rounded border"
                  />
                ) : (
                  <div className="text-xs text-gray-500">
                    {selected ? "Loading preview…" : "No preview selected."}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Edit form */}
          {editOpen && selected && (
            <div className="border rounded-md p-4 bg-white shadow-sm">
              <h2 className="font-semibold mb-3">Edit Photo</h2>
              <form
                className="space-y-3"
                onSubmit={(e) => { e.preventDefault(); void handleEditSave(); }}
              >
                <div>
                  <label className="block text-sm font-medium">Album</label>
                  <input
                    className="mt-1 w-full border rounded px-3 py-2"
                    value={editAlbum}
                    onChange={(e) => setEditAlbum(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Title</label>
                  <input
                    className="mt-1 w-full border rounded px-3 py-2"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Replace Image (optional)</label>
                  <input
                    type="file"
                    className="mt-1 w-full"
                    onChange={(e) => setEditFile(e.target.files?.[0] || null)}
                    accept="image/*"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to keep current image.
                  </p>
                </div>
                <div className="pt-2 flex gap-2">
                  <button
                    type="submit"
                    disabled={editBusy}
                    className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                  >
                    {editBusy ? "Saving…" : "Save changes"}
                  </button>
                  <button
                    type="button"
                    onClick={handleEditCancel}
                    className="px-4 py-2 bg-gray-100 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Upload form */}
          <div className="border rounded-md p-4 bg-white shadow-sm">
            <h2 className="font-semibold mb-3">Upload New Image</h2>
            <form className="space-y-3" onSubmit={handleUpload}>
              <div>
                <label className="block text-sm font-medium">Album</label>
                <input
                  className="mt-1 w-full border rounded px-3 py-2"
                  placeholder="e.g. Home, NavBar, Ramadan2025"
                  value={newAlbum}
                  onChange={(e) => setNewAlbum(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Title</label>
                <input
                  className="mt-1 w-full border rounded px-3 py-2"
                  placeholder="e.g. Logo"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">File</label>
                <input
                  type="file"
                  className="mt-1 w-full"
                  onChange={(e) => setNewFile(e.target.files?.[0] || null)}
                  accept="image/*"
                />
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={formBusy}
                  className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
                >
                  {formBusy ? "Uploading..." : "Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
