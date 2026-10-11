import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { put } from "@vercel/blob";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

/**
 * POST /api/upload  (multipart: file)
 * Uploads a gift/person photo. Uses Vercel Blob if BLOB_READ_WRITE_TOKEN is set,
 * otherwise falls back to writing into /public/uploads (dev only).
 */
export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only images are allowed" }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Max 5MB" }, { status: 400 });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
    const filename = `kinlist/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    if (token) {
      const blob = await put(filename, file, { access: "public", token });
      return NextResponse.json({ url: blob.url });
    }

    // Dev fallback: write to public/uploads
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    const buf = Buffer.from(await file.arrayBuffer());
    const fsName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    await writeFile(path.join(dir, fsName), buf);
    return NextResponse.json({ url: `/uploads/${fsName}` });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
