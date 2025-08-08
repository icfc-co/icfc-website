"use client";

import { useState, ChangeEvent } from "react";
import { s3ImageService } from "@/app/services/s3ImageService";

export default function TestUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [fileList, setFileList] = useState<string[]>([]);
  const [fetchedImage, setFetchedImage] = useState<string | null>(null);

  const uploadFileToS3 = async () => {
    if (!file) return;
    setUploading(true);
    setMessage(null);

    try {
      const fileName = file.name;
      const fileType = file.type;

      const presignedUrl = await s3ImageService.uploadImage(fileName, fileType);

      const uploadRes = await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": fileType },
        body: file,
      });

      if (!uploadRes.ok) throw new Error(await uploadRes.text());

      setUploadedUrl(presignedUrl);
      setMessage("✅ Upload successful!");
    } catch (err: any) {
      setMessage("❌ Upload failed. " + (err.message || ""));
    } finally {
      setUploading(false);
    }
  };

  const listImages = async () => {
    try {
      const files = await s3ImageService.listImages();
      setFileList(files);
      setMessage("✅ Files listed.");
    } catch (err: any) {
      setMessage("❌ Failed to list files. " + (err.message || ""));
    }
  };

  const fetchOneImage = async (fileName: string) => {
    try {
      const url = await s3ImageService.getImage(fileName);
      if (!url) throw new Error("URL not returned");
      setFetchedImage(url);
      setMessage("✅ Image URL fetched.");
    } catch (err: any) {
      setMessage("❌ Failed to fetch image. " + (err.message || ""));
    }
  };

  const deleteImage = async (fileName: string) => {
    try {
      await s3ImageService.deleteImage(fileName);
      setMessage(`✅ Deleted ${fileName}`);
      listImages(); // refresh
    } catch (err: any) {
      setMessage("❌ Delete failed. " + (err.message || ""));
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-12 px-4">
      <h1 className="text-2xl font-bold mb-4">Test S3 Upload</h1>

      <input
        type="file"
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          setFile(e.target.files?.[0] || null)
        }
        className="mb-4"
      />

      <div className="flex gap-4 flex-wrap justify-center mb-4">
        <button
          onClick={uploadFileToS3}
          disabled={!file || uploading}
          className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Upload to S3"}
        </button>

        <button
          onClick={listImages}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          List Images
        </button>
      </div>

      {message && (
        <p className="text-sm mb-4 text-center text-red-500">{message}</p>
      )}

      {uploadedUrl && (
        <div className="mt-4 text-center">
          <p className="font-semibold text-green-600">Uploaded!</p>
          <a
            href={uploadedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-600"
          >
            View Uploaded File
          </a>
          <img src={uploadedUrl} className="mt-2 max-w-xs" alt="Uploaded" />
        </div>
      )}

      {fileList.length > 0 && (
        <div className="mt-8 w-full max-w-md">
          <h2 className="text-xl font-semibold mb-2">Files:</h2>
          <ul className="space-y-2">
            {fileList.map((file) => (
              <li key={file} className="flex items-center justify-between">
                <span>{file}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchOneImage(file)}
                    className="text-blue-600 underline"
                  >
                    Fetch
                  </button>
                  <button
                    onClick={() => deleteImage(file)}
                    className="text-red-600 underline"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {fetchedImage && (
        <div className="mt-6 text-center">
          <p className="font-semibold">Fetched Image:</p>
          <img src={fetchedImage} className="mt-2 max-w-xs" alt="Fetched" />
        </div>
      )}
    </div>
  );
}
