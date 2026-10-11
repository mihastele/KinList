import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@prisma/client";

/** Minimal session shape we rely on. */
export type SessionUser = Pick<User, "id" | "name" | "email" | "image">;

export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

export async function requireUser(): Promise<{
  user: SessionUser;
  session: { id: string; token: string; userId: string };
}> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image ?? null,
    },
    session: {
      id: session.session.id,
      token: session.session.token,
      userId: session.session.userId,
    },
  };
}
