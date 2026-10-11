"use server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getPersonForViewer, isFamilyMember } from "@/lib/kinlist";
import { revalidatePath } from "next/cache";
import type { GiftSource, PurchaseStatus } from "@prisma/client";

async function authorizeGift(personId: string, userId: string) {
  const got = await getPersonForViewer(personId, userId);
  if (!got || !got.isMember) return null;
  return got;
}

export async function addGift(formData: FormData): Promise<any> {
  const { user } = await requireUser();
  const personId = String(formData.get("personId") ?? "");
  const occasionId = String(formData.get("occasionId") ?? "") || null;
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const url = String(formData.get("url") ?? "").trim() || null;
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;
  const priceRaw = String(formData.get("price") ?? "").trim();
  const currency = String(formData.get("currency") ?? "USD").trim() || "USD";
  const source = (String(formData.get("source") ?? "MANUAL") as GiftSource) || "MANUAL";

  const got = await authorizeGift(personId, user.id);
  if (!got) return { error: "Not allowed" };
  if (!title) return { error: "Gift title is required" };

  const price = priceRaw ? Number(priceRaw) : null;
  if (priceRaw && (Number.isNaN(price) || (price ?? 0) < 0)) return { error: "Price must be a positive number" };

  const gift = await prisma.gift.create({
    data: { personId, occasionId, title, description, url, imageUrl, price, currency, source },
  });
  revalidatePath(`/person/${personId}`);
  return { ok: true, giftId: gift.id };
}

export async function updateGiftStatus(formData: FormData): Promise<any> {
  const { user } = await requireUser();
  const giftId = String(formData.get("giftId") ?? "");
  const status = String(formData.get("status") ?? "") as PurchaseStatus;

  const gift = await prisma.gift.findUnique({
    where: { id: giftId },
    include: { person: { include: { family: { include: { members: { select: { userId: true } } } } } } },
  });
  if (!gift) return { error: "Gift not found" };
  const isMember = gift.person.family.members.some((m) => m.userId === user.id);
  if (!isMember) return { error: "Not allowed" };
  // The recipient must NOT be able to claim/purchase their own gift.
  if (gift.person.linkedUserId === user.id) return { error: "You can\'t manage gifts for yourself" };

  const data: Record<string, unknown> = {};
  if (status === "IDEA") {
    data.status = "IDEA";
    data.purchaserId = null;
    data.purchasedAt = null;
  } else if (status === "CLAIMED") {
    data.status = "CLAIMED";
    data.purchaserId = user.id;
    data.purchasedAt = null;
  } else if (status === "PURCHASED") {
    data.status = "PURCHASED";
    data.purchaserId = user.id;
    data.purchasedAt = new Date();
  } else {
    return { error: "Invalid status" };
  }

  await prisma.gift.update({ where: { id: giftId }, data });
  revalidatePath(`/person/${gift.personId}`);
  return { ok: true };
}

export async function deleteGift(formData: FormData): Promise<any> {
  const { user } = await requireUser();
  const giftId = String(formData.get("giftId") ?? "");
  const gift = await prisma.gift.findUnique({
    where: { id: giftId },
    include: { person: { include: { family: { include: { members: { select: { userId: true } } } } } } },
  });
  if (!gift) return { error: "Gift not found" };
  const isMember = gift.person.family.members.some((m) => m.userId === user.id);
  if (!isMember) return { error: "Not allowed" };
  await prisma.gift.delete({ where: { id: giftId } });
  revalidatePath(`/person/${gift.personId}`);
  return { ok: true };
}
