import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { suggestGifts } from "@/lib/suggest";
import { isFamilyMember } from "@/lib/kinlist";

/**
 * POST /api/suggest
 * body: { personId, occasionId?, count? }
 * Returns gift ideas for a person. Auth + family membership required.
 */
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser();
    const body = await req.json();
    const personId = String(body.personId ?? "");
    const occasionId = body.occasionId ? String(body.occasionId) : undefined;
    const count = Math.min(Math.max(Number(body.count ?? 5), 1), 10);

    const person = await prisma.person.findUnique({ where: { id: personId } });
    if (!person) return NextResponse.json({ error: "Person not found" }, { status: 404 });
    if (!(await isFamilyMember(person.familyId, user.id))) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    const occasion = occasionId ? await prisma.occasion.findUnique({ where: { id: occasionId } }) : null;

    const { ideas, source } = await suggestGifts({
      person,
      occasionName: occasion?.name,
      budget: occasion?.budget ? Number(occasion.budget) : null,
      count,
    });

    return NextResponse.json({ ideas, source, person: { id: person.id, name: person.name } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const status = msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
