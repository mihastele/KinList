"use client";
import { useState } from "react";
import { Field, inputCls, SubmitButton } from "@/components/ui";
import { PhotoUpload } from "@/components/photo-upload";

export function PersonEditor({ person, action }: { person: any; action: any }) {
  const [photoUrl, setPhotoUrl] = useState<string>(person.photoUrl ?? "");
  return (
    <form action={action} className="mt-3 space-y-3">
      <input type="hidden" name="personId" value={person.id} />
      <input type="hidden" name="photoUrl" value={photoUrl} />
      <Field label="Name"><input name="name" required defaultValue={person.name} className={inputCls} /></Field>
      <Field label="Relation"><input name="relation" defaultValue={person.relation ?? ""} className={inputCls} /></Field>
      <Field label="Birthday"><input name="birthday" type="date" defaultValue={person.birthday ? new Date(person.birthday).toISOString().slice(0,10) : ""} className={inputCls} /></Field>
      <Field label="Likes" hint="comma separated"><input name="likes" defaultValue={(person.likes ?? []).join(", ")} className={inputCls} /></Field>
      <Field label="Dislikes" hint="comma separated"><input name="dislikes" defaultValue={(person.dislikes ?? []).join(", ")} className={inputCls} /></Field>
      <Field label="Notes"><textarea name="notes" rows={2} defaultValue={person.notes ?? ""} className={inputCls} /></Field>
      <div className="flex items-center gap-3">
        <PhotoUpload label="Change photo" onUploaded={setPhotoUrl} />
        {photoUrl ? <img src={photoUrl} alt="" className="h-10 w-10 rounded-full object-cover" /> : null}
      </div>
      <SubmitButton>Save profile</SubmitButton>
    </form>
  );
}
