"use server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isFamilyMember } from "@/lib/kinlist";
import { revalidatePath } from "next/cache";

export async function createOccasion(formData: FormData): Promise<any> {
  const { user } = await requireUser();
  const familyId = String(formData.get("familyId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const dateRaw = String(formData.get("date") ?? "").trim();
  const budgetRaw = String(formData.get("budget") ?? "").trim();
  const personIds = formData.getAll("personIds").map(String).filter(Boolean);

  if (!(await isFamilyMember(familyId, user.id))) return { error: "Not a member" };
  if (!name) return { error: "Occasion name is required" };
  const budget = budgetRaw ? Number(budgetRaw) : null;
  if (budgetRaw && (Number.isNaN(budget) || (budget ?? 0) <= 0)) return { error: "Budget must be positive" };

  const occasion = await prisma.occasion.create({
    data: {
      familyId,
      name,
      date: dateRaw ? new Date(dateRaw) : null,
      budget,
      createdById: user.id,
      people: personIds.length
        ? { create: personIds.map((personId) => ({ personId })) }
        : undefined,
    },
  });
  revalidatePath(`/family/${familyId}`);
  return { ok: true, occasionId: occasion.id };
}

export async function addPersonToOccasion(formData: FormData): Promise<any> {
  const { user } = await requireUser();
  const occasionId = String(formData.get("occasionId") ?? "");
  const personId = String(formData.get("personId") ?? "");
  const budgetRaw = String(formData.get("budget") ?? "").trim();

  const occasion = await prisma.occasion.findUnique({
    where: { id: occasionId },
    include: { family: { include: { members: { select: { userId: true } } } } },
  });
  if (!occasion || !occasion.family.members.some((m) => m.userId === user.id)) {
    return { error: "Not allowed" };
  }
  const budget = budgetRaw ? Number(budgetRaw) : null;
  await prisma.personOccasion.upsert({
    where: { occasionId_personId: { occasionId, personId } },
    create: { occasionId, personId, budget },
    update: { budget },
  });
  revalidatePath(`/occasion/${occasionId}`);
  return { ok: true };
}
