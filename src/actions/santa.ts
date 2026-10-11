"use server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isFamilyMember } from "@/lib/kinlist";
import { revalidatePath } from "next/cache";

/** Fisher-Yates shuffle with a seeded PRNG so draws are reproducible-ish but fair. */
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeDerangement(ids: string[]): Map<string, string> | null {
  // Try up to 50 times to find a derangement (no self-gifts).
  for (let attempt = 0; attempt < 50; attempt++) {
    const sh = shuffled(ids);
    let ok = true;
    const map = new Map<string, string>();
    for (let i = 0; i < ids.length; i++) {
      if (sh[i] === ids[i]) { ok = false; break; }
      map.set(ids[i], sh[i]);
    }
    if (ok) return map;
  }
  return null;
}

export async function createSantaEvent(formData: FormData): Promise<any> {
  const { user } = await requireUser();
  const familyId = String(formData.get("familyId") ?? "");
  const name = String(formData.get("name") ?? "Secret Santa").trim() || "Secret Santa";
  const budgetRaw = String(formData.get("budget") ?? "").trim();
  if (!(await isFamilyMember(familyId, user.id))) return { error: "Not a member" };
  const budget = budgetRaw ? Number(budgetRaw) : null;

  const event = await prisma.santaEvent.create({
    data: { familyId, name, budget, createdById: user.id },
  });
  revalidatePath(`/family/${familyId}`);
  return { ok: true, eventId: event.id };
}

export async function joinSantaEvent(formData: FormData): Promise<any> {
  const { user } = await requireUser();
  const eventId = String(formData.get("eventId") ?? "");
  const event = await prisma.santaEvent.findUnique({
    where: { id: eventId },
    include: { family: { include: { members: { select: { userId: true } } } } },
  });
  if (!event || !event.family.members.some((m) => m.userId === user.id)) return { error: "Not allowed" };
  await prisma.santaParticipant.upsert({
    where: { eventId_userId: { eventId, userId: user.id } },
    create: { eventId, userId: user.id },
    update: {},
  });
  revalidatePath(`/santa/${eventId}`);
  return { ok: true };
}

/** Draw assignments. Only the owner-ish (any member) can trigger; requires >=3 participants. */
export async function drawSanta(formData: FormData): Promise<any> {
  const { user } = await requireUser();
  const eventId = String(formData.get("eventId") ?? "");
  const event = await prisma.santaEvent.findUnique({
    where: { id: eventId },
    include: {
      family: { include: { members: { select: { userId: true } } } },
      participants: true,
      assignments: true,
    },
  });
  if (!event || !event.family.members.some((m) => m.userId === user.id)) return { error: "Not allowed" };
  if (event.drawnAt) return { error: "Already drawn" };
  if (event.participants.length < 3) return { error: "Need at least 3 participants" };

  const ids = event.participants.map((p) => p.userId);
  const mapping = makeDerangement(ids);
  if (!mapping) return { error: "Could not generate a valid draw, try again" };

  await prisma.$transaction([
    ...ids.map((giverId) =>
      prisma.santaAssignment.create({
        data: { eventId, giverId, receiverId: mapping.get(giverId)! },
      }),
    ),
    prisma.santaEvent.update({ where: { id: eventId }, data: { drawnAt: new Date() } }),
  ]);
  revalidatePath(`/santa/${eventId}`);
  return { ok: true };
}

/** A giver updates their own receiver's wishlist note (giver-side). Actually the RECEIVER sets wishlist. */
export async function setSantaWishlist(formData: FormData): Promise<any> {
  const { user } = await requireUser();
  const eventId = String(formData.get("eventId") ?? "");
  const wishlist = String(formData.get("wishlist") ?? "").trim();
  // The receiver sets their wishlist on the assignment where they are the receiver.
  const assignment = await prisma.santaAssignment.findFirst({
    where: { eventId, receiverId: user.id },
    include: { event: { include: { family: { include: { members: { select: { userId: true } } } } } } },
  });
  if (!assignment) return { error: "You are not part of this draw" };
  await prisma.santaAssignment.update({ where: { id: assignment.id }, data: { wishlist } });
  revalidatePath(`/santa/${eventId}`);
  return { ok: true };
}
