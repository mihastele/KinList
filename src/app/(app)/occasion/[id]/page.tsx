import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isFamilyMember, visibleGiftsForViewer, sumSpent } from "@/lib/kinlist";
import { Card, PageTitle, Badge, Empty, SubmitButton, Field, inputCls } from "@/components/ui";
import { addPersonToOccasion } from "@/actions/occasion";
import { fmtDate, money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OccasionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireUser();

  const occasion = await prisma.occasion.findUnique({
    where: { id },
    include: {
      family: { include: { members: { select: { userId: true } }, people: { orderBy: { name: "asc" } } } },
      people: { include: { person: { include: { gifts: { where: { occasionId: id } } } }, } },
      gifts: { include: { person: true, purchaser: { select: { name: true } } } },
      createdBy: { select: { name: true } },
    },
  });
  if (!occasion) notFound();
  if (!occasion.family.members.some((m) => m.userId === user.id)) notFound();

  const familyPeople = occasion.family.people;
  const inOccasionIds = new Set(occasion.people.map((po) => po.personId));

  const totalSpent = sumSpent(occasion.gifts);
  const budgetNum = occasion.budget ? Number(occasion.budget) : null;

  return (
    <>
      <PageTitle sub={`Created by ${occasion.createdBy.name}`}>
        <div className="flex items-center gap-3">
          🎉 {occasion.name}
          {occasion.date ? <Badge tone="blue">{fmtDate(occasion.date)}</Badge> : null}
          {budgetNum ? <Badge tone="amber">budget {money(budgetNum)}</Badge> : null}
        </div>
      </PageTitle>

      {budgetNum ? (
        <Card className="mb-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-stone-500">Spent (purchased)</span>
            <span className="font-semibold">{money(totalSpent)} / {money(budgetNum)}</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-100">
            <div
              className={`h-full rounded-full ${totalSpent > budgetNum ? "bg-rose-500" : "bg-emerald-500"}`}
              style={{ width: `${Math.min(100, (totalSpent / budgetNum) * 100)}%` }}
            />
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {occasion.people.map((po) => {
          const p = po.person;
          const gifts = visibleGiftsForViewer(p.gifts, p, user.id, true);
          const spent = sumSpent(p.gifts);
          return (
            <Card key={po.personId}>
              <div className="flex items-center justify-between">
                <Link href={`/person/${p.id}`} className="font-semibold hover:text-rose-600">{p.name}</Link>
                <div className="flex gap-2 text-xs">
                  {po.budget ? <Badge tone="amber">{money(Number(po.budget))}</Badge> : null}
                  {spent ? <Badge tone="green">{money(spent)} spent</Badge> : null}
                </div>
              </div>
              {gifts.length === 0 ? (
                <p className="mt-2 text-sm text-stone-400">No ideas yet.</p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm">
                  {gifts.slice(0, 8).map((g: any) => (
                    <li key={g.id} className="flex items-center justify-between">
                      <span className="truncate">{g.title}</span>
                      <span className="ml-2 shrink-0 text-xs text-stone-400">
                        {g.status === "IDEA" ? "" : g.status === "CLAIMED" ? "claimed · " : "bought · "}
                        {money(g.price, g.currency)}
                      </span>
                    </li>
                  ))}
                  {gifts.length > 8 ? <li className="text-xs text-stone-400">+{gifts.length - 8} more</li> : null}
                </ul>
              )}
              <Link href={`/person/${p.id}`} className="mt-2 inline-block text-xs text-rose-600 hover:underline">Manage gifts →</Link>
            </Card>
          );
        })}
      </div>

      {occasion.people.length === 0 ? <Empty>No people added to this occasion yet.</Empty> : null}

      <Card className="mt-6">
        <h3 className="font-semibold">Add people to this occasion</h3>
        <form action={addPersonToOccasion} className="mt-3 grid gap-4 sm:grid-cols-3">
          <input type="hidden" name="occasionId" value={id} />
          <Field label="Person">
            <select name="personId" required className={inputCls}>
              <option value="">— choose —</option>
              {familyPeople.filter((p) => !inOccasionIds.has(p.id)).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Budget for this person"><input name="budget" type="number" min="0" step="0.01" placeholder="50" className={inputCls} /></Field>
          <div className="flex items-end"><SubmitButton>Add</SubmitButton></div>
        </form>
      </Card>

      <p className="mt-8"><Link href={`/family/${occasion.familyId}`} className="text-sm text-stone-500 hover:text-stone-900">← Back to family</Link></p>
    </>
  );
}
