"use server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isFamilyMember, getPersonForViewer } from "@/lib/kinlist";
import { revalidatePath } from "next/cache";

export async function createPerson(formData: FormData): Promise<any> {
  const { user } = await requireUser();
  const familyId = String(formData.get("familyId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const relation = String(formData.get("relation") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const birthdayRaw = String(formData.get("birthday") ?? "").trim();
  const likesRaw = String(formData.get("likes") ?? "");
  const dislikesRaw = String(formData.get("dislikes") ?? "");

  if (!(await isFamilyMember(familyId, user.id))) return { error: "Not a member of this family" };
  if (!name) return { error: "Name is required" };

  const birthday = birthdayRaw ? new Date(birthdayRaw) : null;
  const likes = likesRaw.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
  const dislikes = dislikesRaw.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);

  const person = await prisma.person.create({
    data: { familyId, name, relation, notes, birthday, likes, dislikes },
  });
  revalidatePath(`/family/${familyId}`);
  return { ok: true, personId: person.id };
}

export async function updatePerson(formData: FormData): Promise<any> {
  const { user } = await requireUser();
  const personId = String(formData.get("personId") ?? "");
  const got = await getPersonForViewer(personId, user.id);
  if (!got || !got.isMember) return { error: "Not allowed" };

  const name = String(formData.get("name") ?? "").trim();
  const relation = String(formData.get("relation") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const birthdayRaw = String(formData.get("birthday") ?? "").trim();
  const likesRaw = String(formData.get("likes") ?? "");
  const dislikesRaw = String(formData.get("dislikes") ?? "");
  const photoUrl = String(formData.get("photoUrl") ?? "").trim() || null;

  await prisma.person.update({
    where: { id: personId },
    data: {
      name,
      relation,
      notes,
      birthday: birthdayRaw ? new Date(birthdayRaw) : null,
      likes: likesRaw.split(/[,\n]/).map((s) => s.trim()).filter(Boolean),
      dislikes: dislikesRaw.split(/[,\n]/).map((s) => s.trim()).filter(Boolean),
      photoUrl,
    },
  });
  revalidatePath(`/person/${personId}`);
  return { ok: true };
}

/** Link this person to the signed-in user ("this is me") — enables recipient-safe surprises. */
export async function claimPersonAsMe(formData: FormData): Promise<any> {
  const { user } = await requireUser();
  const personId = String(formData.get("personId") ?? "");
  const got = await getPersonForViewer(personId, user.id);
  if (!got || !got.isMember) return { error: "Not allowed" };
  if (got.person.linkedUserId && got.person.linkedUserId !== user.id) {
    return { error: "This profile is already linked to another user" };
  }
  await prisma.person.update({ where: { id: personId }, data: { linkedUserId: user.id } });
  revalidatePath(`/person/${personId}`);
  return { ok: true };
}

export async function deletePerson(formData: FormData): Promise<any> {
  const { user } = await requireUser();
  const personId = String(formData.get("personId") ?? "");
  const got = await getPersonForViewer(personId, user.id);
  if (!got || !got.isMember) return { error: "Not allowed" };
  await prisma.person.delete({ where: { id: personId } });
  revalidatePath(`/family/${got.person.familyId}`);
  return { ok: true };
}
