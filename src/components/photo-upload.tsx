"use client";
import { useRef, useState } from "react";

/** Uploads an image to /api/upload, calls onUploaded(url). */
export function PhotoUpload({ onUploaded, label = "Upload photo" }: { onUploaded: (url: string) => void; label?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();
  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setErr(undefined);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      onUploaded(data.url);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Upload failed");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }
  return (
    <div>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={busy}
        className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
      >
        {busy ? "Uploading…" : label}
      </button>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handle} />
      {err ? <p className="mt-1 text-xs text-rose-600">{err}</p> : null}
    </div>
  );
}
