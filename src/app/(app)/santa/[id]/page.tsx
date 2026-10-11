import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Card, PageTitle, Badge, Empty, SubmitButton } from "@/components/ui";
import { joinSantaEvent, drawSanta, setSantaWishlist } from "@/actions/santa";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SantaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireUser();

  const event = await prisma.santaEvent.findUnique({
    where: { id },
    include: {
      family: { include: { members: { select: { userId: true, user: { select: { name: true } } } } } },
      participants: { include: { } },
      assignments: {
        include: {
          giver: { select: { id: true, name: true } },
          receiver: { select: { id: true, name: true, myPerson: { select: { id: true, likes: true, dislikes: true, notes: true } } } },
        },
      },
      _count: { select: { participants: true } },
    },
  });
  if (!event) notFound();
  if (!event.family.members.some((m) => m.userId === user.id)) notFound();

  // We need participant user names — fetch them
  const participantUsers = await prisma.user.findMany({
    where: { id: { in: event.participants.map((p) => p.userId) } },
    select: { id: true, name: true, myPerson: { select: { id: true, likes: true, dislikes: true, notes: true } } },
  });
  const userById = new Map(participantUsers.map((u) => [u.id, u]));

  const isParticipant = event.participants.some((p) => p.userId === user.id);
  const myAssignment = event.assignments.find((a) => a.giverId === user.id);
  const drawn = !!event.drawnAt;

  return (
    <>
      <PageTitle sub={`🎅 Secret Santa`}>
        <div className="flex items-center gap-3">
          {event.name}
          {drawn ? <Badge tone="green">drawn</Badge> : <Badge tone="amber">not drawn yet</Badge>}
          {event.budget ? <Badge>budget {money(Number(event.budget))}</Badge> : null}
        </div>
      </PageTitle>

      {/* Participants */}
      <Card className="mb-6">
        <h3 className="font-semibold">Participants ({event._count.participants})</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {event.participants.map((p) => {
            const u = userById.get(p.userId);
            return (
              <Badge key={p.userId} tone={p.userId === user.id ? "rose" : "stone"}>
                {u?.name ?? "?"}{p.userId === user.id ? " (you)" : ""}
              </Badge>
            );
          })}
        </div>
        {!isParticipant ? (
          <form action={joinSantaEvent} className="mt-4">
            <input type="hidden" name="eventId" value={id} />
            <SubmitButton>Join this draw</SubmitButton>
          </form>
        ) : (
          <p className="mt-3 text-sm text-emerald-600">✓ You're in this draw.</p>
        )}
      </Card>

      {/* Draw */}
      {isParticipant && !drawn ? (
        <Card className="mb-6">
          <h3 className="font-semibold">Ready to draw?</h3>
          <p className="mt-1 text-sm text-stone-500">Needs at least 3 participants. Nobody will draw themselves.</p>
          <form action={drawSanta} className="mt-3">
            <input type="hidden" name="eventId" value={id} />
            <SubmitButton>🎲 Draw names</SubmitButton>
          </form>
        </Card>
      ) : null}

      {/* My assignment (only visible to the giver) */}
      {drawn && myAssignment ? (
        <Card className="mb-6 border-rose-200 bg-rose-50">
          <h3 className="font-semibold">🤫 Your Secret Santa assignment</h3>
          <p className="mt-2 text-lg">
            You are giving to <strong className="text-rose-700">{myAssignment.receiver.name}</strong> 🎁
          </p>
          {myAssignment.receiver.myPerson ? (
            <div className="mt-3 rounded-lg bg-white p-3 text-sm">
              <p className="font-medium">Their preferences</p>
              {myAssignment.receiver.myPerson.likes.length ? <p className="mt-1 text-stone-600">👍 Likes: {myAssignment.receiver.myPerson.likes.join(", ")}</p> : null}
              {myAssignment.receiver.myPerson.dislikes.length ? <p className="mt-1 text-stone-600">👎 Dislikes: {myAssignment.receiver.myPerson.dislikes.join(", ")}</p> : null}
              {myAssignment.receiver.myPerson.notes ? <p className="mt-1 text-stone-600">📝 {myAssignment.receiver.myPerson.notes}</p> : null}
              <Link href={`/person/${myAssignment.receiver.myPerson.id}`} className="mt-2 inline-block text-rose-600 hover:underline">View their gift list →</Link>
            </div>
          ) : null}
          <Link href={`/person/${myAssignment.receiver.myPerson?.id ?? ""}`} className="mt-2 hidden">x</Link>
        </Card>
      ) : null}

      {/* Wishlist (receiver sets it; only their giver sees it) */}
      {drawn ? (
        <Card className="mb-6">
          <h3 className="font-semibold">Your wishlist</h3>
          <p className="mt-1 text-sm text-stone-500">Only the person giving to you can see this.</p>
          <form action={setSantaWishlist} className="mt-3 space-y-3">
            <input type="hidden" name="eventId" value={id} />
            <textarea name="wishlist" rows={3} defaultValue={myAssignment?.wishlist ?? ""} placeholder="3 ideas you'd love…" className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200" />
            <SubmitButton>Save wishlist</SubmitButton>
          </form>
        </Card>
      ) : null}

      {/* Who's giving to whom — PARTIAL view (you only see your own row) */}
      {drawn ? (
        <Card>
          <h3 className="font-semibold">The draw</h3>
          <p className="mt-1 text-sm text-stone-500">For privacy, you only see your own assignment. Others see theirs.</p>
          <ul className="mt-3 space-y-1 text-sm">
            <li className="rounded-lg bg-stone-50 px-3 py-2">
              <strong>You</strong> → {myAssignment?.receiver.name ?? "—"}
            </li>
          </ul>
        </Card>
      ) : <Empty>Nothing drawn yet.</Empty>}

      <p className="mt-8"><Link href={`/family/${event.familyId}`} className="text-sm text-stone-500 hover:text-stone-900">← Back to family</Link></p>
    </>
  );
}
