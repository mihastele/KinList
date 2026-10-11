/**
 * KinList domain helpers — pure functions + surprise-safety rules.
 *
 * THE SURPRISE RULE:
 * A gift that is CLAIMED or PURCHASED must be hidden from the gift's RECIPIENT,
 * but visible to everyone else in the family (so nobody double-buys).
 * Ideas (status=IDEA) are visible to everyone EXCEPT when the viewer is the
 * person the gift is for — even ideas can spoil a surprise ("why is everyone
 * suddenly listing drones?").
 */
import { prisma } from "@/lib/prisma";
import type { Gift, Person, Occasion, PurchaseStatus } from "@prisma/client";

export type GiftWithPurchaser = Gift & {
  purchaser?: { id: string; name: string } | null;
};

/** Can `viewerId` see the purchase/claim state of this gift? */
export function canSeePurchaseState(gift: Gift, person: Person, viewerId: string): boolean {
  // The recipient never sees who claimed/purchased their gift.
  if (person.linkedUserId === viewerId) return false;
  return true;
}

/**
 * Shape a gift list for a given viewer.
 * - Recipient (linked user) sees only sanitized IDEA gifts (no purchaser info, no claimed/purchased gifts).
 * - Everyone else sees everything.
 */
export function visibleGiftsForViewer<T extends GiftWithPurchaser>(
  gifts: T[],
  person: Person,
  viewerId: string,
  viewerIsFamilyMember: boolean,
): T[] {
  const isRecipient = person.linkedUserId === viewerId;
  if (!isRecipient) return gifts;

  // Recipient view: hide claimed/purchased gifts entirely, strip purchaser from ideas.
  return gifts
    .filter((g) => g.status === "IDEA")
    .map((g) => ({ ...g, purchaser: null, purchaserId: null }));
}

export function isSpent(g: Gift): boolean {
  return g.status === "CLAIMED" || g.status === "PURCHASED";
}

export function sumSpent(gifts: Gift[]): number {
  return gifts
    .filter((g) => g.status === "PURCHASED" && g.price != null)
    .reduce((acc, g) => acc + Number(g.price), 0);
}

export function sumPlanned(gifts: Gift[]): number {
  return gifts
    .filter((g) => g.status !== "IDEA" || g.price != null)
    .reduce((acc, g) => acc + Number(g.price ?? 0), 0);
}

/** Membership check: is userId a member of familyId? */
export async function isFamilyMember(familyId: string, userId: string): Promise<boolean> {
  const m = await prisma.familyMember.findUnique({
    where: { familyId_userId: { familyId, userId } },
    select: { id: true },
  });
  return !!m;
}

/** Fetch a family with members (for authorization checks in pages/actions). */
export async function getFamilyWithMembers(familyId: string) {
  return prisma.family.findUnique({
    where: { id: familyId },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, image: true } } } },
    },
  });
}

export async function getPersonForViewer(personId: string, viewerId: string) {
  const person = await prisma.person.findUnique({
    where: { id: personId },
    include: {
      family: { include: { members: { select: { userId: true } } } },
      gifts: {
        orderBy: { createdAt: "desc" },
        include: { purchaser: { select: { id: true, name: true } }, occasion: { select: { id: true, name: true, date: true } } },
      },
      occasionLinks: { include: { occasion: true } },
      linkedUser: { select: { id: true, name: true } },
    },
  });
  if (!person) return null;
  const isMember = person.family.members.some((m) => m.userId === viewerId);
  return { person, isMember };
}
