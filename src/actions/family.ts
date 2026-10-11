"use server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isFamilyMember } from "@/lib/kinlist";
import { customAlphabet } from "nanoid";
import { revalidatePath } from "next/cache";

const slugGen = customAlphabet("abcdefghijkmnpqrstuvwxyz23456789", 8);

async function uniqueSlug(base: string): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const slug = `${base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "family"}-${slugGen()}`;
    const exists = await prisma.family.findUnique({ where: { slug }, select: { id: true } });
    if (!exists) return slug;
  }
  throw new Error("Could not generate a unique family slug");
}

export async function createFamily(formData: FormData): Promise<any> {
  const { user } = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Family name is required" };

  const slug = await uniqueSlug(name);
  const family = await prisma.family.create({
    data: {
      name,
      slug,
      members: { create: { userId: user.id, role: "OWNER" } },
    },
  });
  revalidatePath("/dashboard");
  return { ok: true, familyId: family.id, slug: family.slug };
}

export async function inviteMember(formData: FormData): Promise<any> {
  const { user } = await requireUser();
  const familyId = String(formData.get("familyId") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!(await isFamilyMember(familyId, user.id))) return { error: "Not a member of this family" };
  if (!email.includes("@")) return { error: "Enter a valid email" };

  const token = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789", 32)();
  const invite = await prisma.familyInvite.create({
    data: {
      familyId,
      email,
      senderId: user.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14), // 14 days
      token,
    },
  });

  // TODO(email): if RESEND_API_KEY set, send invite email via Resend.
  // For now, return the accept link so it can be shared any way.
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return { ok: true, inviteLink: `${base}/invite/${invite.token}` };
}

export async function acceptInvite(token: string): Promise<any> {
  const { user } = await requireUser();
  const invite = await prisma.familyInvite.findUnique({ where: { token }, include: { family: true } });
  if (!invite) return { error: "Invite not found" };
  if (invite.expiresAt < new Date()) return { error: "This invite has expired" };
  if (invite.acceptedBy) return { error: "This invite was already used" };
  if (invite.email !== user.email.toLowerCase()) {
    return { error: `This invite was sent to ${invite.email}. Sign in with that email to accept.` };
  }
  await prisma.$transaction([
    prisma.familyMember.create({ data: { familyId: invite.familyId, userId: user.id, role: "MEMBER" } }),
    prisma.familyInvite.update({ where: { id: invite.id }, data: { acceptedBy: user.id } }),
  ]);
  revalidatePath("/dashboard");
  return { ok: true, familyId: invite.familyId, slug: invite.family.slug };
}

/** Join by invite token even if not signed in — used by the /invite/[token] page after login. */
export async function pendingInviteToken(): Promise<any> {
  return null; // token lives in the URL; page passes it to acceptInvite post-auth
}
