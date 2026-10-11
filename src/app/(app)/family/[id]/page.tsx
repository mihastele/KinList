import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isFamilyMember } from "@/lib/kinlist";
import { Card, PageTitle, Empty, Badge, SubmitButton, Field, inputCls } from "@/components/ui";
import { createPerson } from "@/actions/person";
import { createOccasion } from "@/actions/occasion";
import { inviteMember } from "@/actions/family";
import { createSantaEvent } from "@/actions/santa";
import { initials, fmtDate, money } from "@/lib/format";
import { InviteLink } from "./invite-link";

export const dynamic = "force-dynamic";

export default async function FamilyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireUser();
  if (!(await isFamilyMember(id, user.id))) notFound();

  const family = await prisma.family.findUnique({
    where: { id },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, image: true } } }, orderBy: { joinedAt: "asc" } },
      people: {
        orderBy: { createdAt: "desc" },
        include: {
          gifts: true,
          occasionLinks: { include: { occasion: true } },
          linkedUser: { select: { id: true, name: true } },
        },
      },
      occasions: { orderBy: { date: "asc" }, include: { createdBy: { select: { name: true } }, people: { include: { person: true } }, _count: { select: { gifts: true } } } },
      santaEvents: { orderBy: { createdAt: "desc" }, include: { _count: { select: { participants: true } } } },
    },
  });
  if (!family) notFound();

  const upcoming = family.occasions.filter((o) => !o.date || new Date(o.date) >= new Date());

  return (
    <>
      <PageTitle sub={`${family.members.length} members`}>{family.name}</PageTitle>

      {/* MEMBERS */}
      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">Members</h2>
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            {family.members.map((m) => (
              <div key={m.user.id} className="flex items-center gap-2 rounded-full bg-stone-100 py-1 pl-1 pr-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-200 text-xs font-bold text-rose-700">{initials(m.user.name)}</div>
                <span className="text-sm font-medium">{m.user.name}{m.user.id === user.id ? " (you)" : ""}</span>
                {m.role === "OWNER" ? <Badge tone="amber">owner</Badge> : null}
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-stone-100 pt-4">
            <InviteLink familyId={id} inviteAction={inviteMember} />
          </div>
        </Card>
      </div>

      {/* OCCASIONS */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Occasions</h2>
        </div>
        {family.occasions.length === 0 ? (
          <Empty>No occasions yet. Add one below.</Empty>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {family.occasions.map((o) => (
              <Link key={o.id} href={`/occasion/${o.id}`} className="group">
                <Card className="h-full transition hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold group-hover:text-rose-600">{o.name}</h3>
                    {o.date ? <Badge tone="blue">{fmtDate(o.date)}</Badge> : <Badge>no date</Badge>}
                  </div>
                  <p className="mt-2 text-sm text-stone-500">
                    {o.people.length} people · {o._count.gifts} gift ideas
                    {o.budget ? ` · budget ${money(Number(o.budget))}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-stone-400">by {o.createdBy.name}</p>
                </Card>
              </Link>
            ))}
          </div>
        )}
        <Card className="mt-4">
          <h3 className="font-semibold">Add an occasion</h3>
          <form action={createOccasion} className="mt-3 grid gap-4 sm:grid-cols-4">
            <input type="hidden" name="familyId" value={id} />
            <Field label="Name"><input name="name" required placeholder="Christmas 2026" className={inputCls} /></Field>
            <Field label="Date"><input name="date" type="date" className={inputCls} /></Field>
            <Field label="Budget (optional)"><input name="budget" type="number" min="0" step="0.01" placeholder="500" className={inputCls} /></Field>
            <div className="sm:col-span-4">
              <Field label="Who is this for? (optional)">
                <div className="flex flex-wrap gap-3 pt-1">
                  {family.people.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="personIds" value={p.id} className="rounded border-stone-300" />
                      {p.name}
                    </label>
                  ))}
                </div>
              </Field>
            </div>
            <div><SubmitButton>Add occasion</SubmitButton></div>
          </form>
        </Card>
      </div>

      {/* SECRET SANTA */}
      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">Secret Santa</h2>
        {family.santaEvents.length === 0 ? <Empty>No Secret Santa events yet.</Empty> : (
          <div className="grid gap-4 md:grid-cols-3">
            {family.santaEvents.map((e) => (
              <Link key={e.id} href={`/santa/${e.id}`} className="group">
                <Card className="transition hover:shadow-md">
                  <h3 className="font-semibold group-hover:text-rose-600">🎅 {e.name}</h3>
                  <p className="mt-1 text-sm text-stone-500">{e._count.participants} participants{e.budget ? ` · ${money(Number(e.budget))}` : ""}</p>
                </Card>
              </Link>
            ))}
          </div>
        )}
        <Card className="mt-4">
          <h3 className="font-semibold">Start a Secret Santa</h3>
          <form action={createSantaEvent} className="mt-3 grid gap-4 sm:grid-cols-3">
            <input type="hidden" name="familyId" value={id} />
            <Field label="Name"><input name="name" placeholder="Secret Santa 2026" className={inputCls} /></Field>
            <Field label="Budget"><input name="budget" type="number" min="0" step="0.01" placeholder="30" className={inputCls} /></Field>
            <div className="flex items-end"><SubmitButton>Create</SubmitButton></div>
          </form>
        </Card>
      </div>

      {/* PEOPLE */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">People</h2>
        {family.people.length === 0 ? (
          <Empty>No people yet — add someone you buy gifts for.</Empty>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {family.people.map((p) => {
              const claimed = p.gifts.filter((g) => g.status !== "IDEA").length;
              return (
                <Link key={p.id} href={`/person/${p.id}`} className="group">
                  <Card className="h-full transition hover:shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-rose-100 text-lg font-bold text-rose-700">
                        {p.photoUrl ? <img src={p.photoUrl} alt={p.name} className="h-full w-full object-cover" /> : initials(p.name)}
                      </div>
                      <div>
                        <h3 className="font-semibold group-hover:text-rose-600">{p.name}</h3>
                        <p className="text-xs text-stone-500">{p.relation ?? "—"}{p.birthday ? ` · 🎂 ${fmtDate(p.birthday)}` : ""}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {p.linkedUser ? <Badge tone="green">linked to {p.linkedUser.id === user.id ? "you" : p.linkedUser.name}</Badge> : null}
                      <Badge>{p.gifts.length} ideas</Badge>
                      {claimed ? <Badge tone="blue">{claimed} claimed/bought</Badge> : null}
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        <Card className="mt-4">
          <h3 className="font-semibold">Add a person</h3>
          <form action={createPerson} className="mt-3 grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="familyId" value={id} />
            <Field label="Name"><input name="name" required placeholder="Mom" className={inputCls} /></Field>
            <Field label="Relation"><input name="relation" placeholder="Mom, Uncle, Teammate…" className={inputCls} /></Field>
            <Field label="Birthday"><input name="birthday" type="date" className={inputCls} /></Field>
            <Field label="Likes (comma separated)" hint="coffee, books, gardening… — used for gift ideas"><input name="likes" placeholder="coffee, hiking, puzzles" className={inputCls} /></Field>
            <Field label="Dislikes (comma separated)"><input name="dislikes" placeholder="socks, scented candles" className={inputCls} /></Field>
            <Field label="Notes"><input name="notes" placeholder="Wears size M, loves jazz" className={inputCls} /></Field>
            <div className="sm:col-span-2"><SubmitButton>Add person</SubmitButton></div>
          </form>
        </Card>
      </div>
    </>
  );
}
