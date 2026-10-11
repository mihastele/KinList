"use client";
import { PhotoUpload } from "@/components/photo-upload";

export function PhotoUploadField({ personId }: { personId: string }) {
  return (
    <div className="space-y-1">
      <span className="text-sm font-medium text-stone-700">Photo</span>
      {/* This hidden input lives inside the Add-gift form (parent). PhotoUpload sets it via DOM. */}
      <input type="hidden" name="imageUrl" id={`gift-photo-${personId}`} />
      <PhotoUpload
        label="Upload gift photo"
        onUploaded={(url) => {
          const el = document.getElementById(`gift-photo-${personId}`) as HTMLInputElement | null;
          if (el) el.value = url;
        }}
      />
    </div>
  );
}
