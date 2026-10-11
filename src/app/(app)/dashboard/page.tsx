import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Card, PageTitle, Empty, SubmitButton, Field, inputCls } from "@/components/ui";
import { createFamily } from "@/actions/family";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { user } = await requireUser();

  const families = await prisma.family.findMany({
    where: { members: { some: { userId: user.id } } },
    include: {
      members: { include: { user: { select: { id: true, name: true, image: true } } } },
      people: true,
      occasions: { orderBy: { date: "asc" }, take: 5 },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <PageTitle>Your families</PageTitle>

      {families.length === 0 ? (
        <Card className="max-w-xl">
          <h2 className="text-lg font-semibold">Create your first family</h2>
          <p className="mt-1 text-sm text-stone-500">A shared space for gift ideas, budgets and Secret Santa.</p>
          <form action={createFamily} className="mt-4 space-y-4">
            <Field label="Family name" hint="e.g. The Smiths, The Squad, In-Laws">
              <input name="name" required placeholder="The Smiths" className={inputCls} />
            </Field>
            <SubmitButton>Create family</SubmitButton>
          </form>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {families.map((f) => (
            <Link key={f.id} href={`/family/${f.id}`} className="group">
              <Card className="transition hover:shadow-md">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold group-hover:text-rose-600">{f.name}</h2>
                  <span className="text-xs text-stone-400">{f.members.length} members</span>
                </div>
                <div className="mt-3 flex -space-x-2">
                  {f.members.slice(0, 6).map((m) => (
                    <div key={m.user.id} title={m.user.name} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-stone-200 text-xs font-semibold text-stone-600">
                      {m.user.name[0]?.toUpperCase()}
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-4 text-sm text-stone-500">
                  <span>👥 {f.people.length} people</span>
                  <span>🎉 {f.occasions.length} upcoming</span>
                </div>
                {f.occasions[0] ? (
                  <p className="mt-2 text-xs text-stone-400">Next: {f.occasions[0].name} · {fmtDate(f.occasions[0].date)}</p>
                ) : null}
              </Card>
            </Link>
          ))}

          <Card className="border-dashed">
            <h2 className="text-lg font-semibold">Start a new family</h2>
            <p className="mt-1 text-sm text-stone-500">Invite your partner, kids, siblings, in-laws…</p>
            <form action={createFamily} className="mt-4 space-y-4">
              <Field label="Family name">
                <input name="name" required placeholder="The In-Laws" className={inputCls} />
              </Field>
              <SubmitButton>Create family</SubmitButton>
            </form>
          </Card>
        </div>
      )}

      {families.length === 0 ? <Empty>No families yet — create one above 🎁</Empty> : null}
    </>
  );
}
