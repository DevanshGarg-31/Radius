"use client";

import { useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { ApiError, api } from "@/services/api";

const TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024;

interface AvatarUploadProps {
  name: string;
  value: string;
  onChange: (url: string) => void;
}

/**
 * Profile photo: the browser uploads straight to a private S3 bucket with a
 * short-lived signed URL, then the profile stores a stable /assets/... link.
 */
export function AvatarUpload({ name, value, onChange }: AvatarUploadProps) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function upload(file: File) {
    setError(undefined);
    if (!TYPES.includes(file.type)) return setError("Use a PNG, JPG, WebP or GIF image.");
    if (file.size > MAX_BYTES) return setError("That image is over 5 MB. Try a smaller one.");
    setBusy(true);
    try {
      const { uploadUrl, assetPath, headers } = await api.presignUpload("avatar", file.type);
      const put = await fetch(uploadUrl, { method: "PUT", headers, body: file });
      if (!put.ok) throw new Error(`Upload failed (${put.status})`);
      onChange(api.assetUrl(assetPath));
    } catch (err) {
      setError(err instanceof ApiError && err.status === 503 ? "Photo uploads aren't switched on yet. You can add one later from your profile." : "We couldn't upload that photo. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-5">
      <Avatar name={name || "You"} seed={name || "you"} src={value || undefined} size={80} />
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className="h-9 rounded-btn border-2 border-ink bg-surface px-3 text-sm font-semibold shadow-brutal-sm hover:bg-lilac active:translate-y-0.5 active:shadow-none disabled:opacity-60"
          >
            {busy ? "Uploading…" : value ? "Change photo" : "Upload a photo"}
          </button>
          {value && !busy && (
            <button type="button" onClick={() => onChange("")} className="h-9 rounded-btn px-3 text-sm text-muted hover:bg-sunken hover:text-ink">
              Remove
            </button>
          )}
        </div>
        <p className="text-[13px] text-muted">Optional. PNG, JPG, WebP or GIF, up to 5 MB.</p>
        {error && (
          <p role="alert" className="text-[13px] text-danger">
            {error}
          </p>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept={TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void upload(file);
        }}
      />
    </div>
  );
}
