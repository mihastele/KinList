import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getPersonForViewer, visibleGiftsForViewer, sumSpent } from "@/lib/kinlist";
import { Card, PageTitle, Badge, Empty, SubmitButton, Field, inputCls } from "@/components/ui";
import { updatePerson, claimPersonAsMe, deletePerson } from "@/actions/person";
import { addGift, updateGiftStatus, deleteGift } from "@/actions/gift";
import { initials, fmtDate, money } from "@/lib/format";
import { PhotoUpload } from "@/components/photo-upload";
import { PersonEditor } from "./person-editor";
import { GiftCard } from "./gift-card";
import { SuggestButton } from "./suggest-button";

export const dynamic = "force-dynamic";

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireUser();
  const got = await getPersonForViewer(id, user.id);
  if (!got || !got.isMember) notFound();

  const { person } = got;
  const occasions = await prisma.occasion.findMany({
    where: { familyId: person.familyId, people: { some: { personId: person.id } } },
    orderBy: { date: "asc" },
  });

  const isRecipient = person.linkedUserId === user.id;
  const visible = visibleGiftsForViewer(person.gifts, person, user.id, got.isMember);
  const allGifts = person.gifts;
  const spent = sumSpent(allGifts);

  // Group visible gifts by occasion for display
  const byOccasion = new Map<string, typeof visible>();
  const noOccasion: typeof visible = [];
  for (const g of visible) {
    if (g.occasionId) {
      const arr = byOccasion.get(g.occasionId) ?? [];
      arr.push(g);
      byOccasion.set(g.occasionId, arr);
    } else {
      noOccasion.push(g);
    }
  }

  return (
    <>
      <PageTitle sub={person.relation ?? undefined}>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-rose-100 text-2xl font-bold text-rose-700">
            {person.photoUrl ? <img src={person.photoUrl} alt={person.name} className="h-full w-full object-cover" /> : initials(person.name)}
          </div>
          <div>
            {person.name}
            {isRecipient ? <Badge tone="green">this is you</Badge> : null}
            {person.linkedUser && !isRecipient ? <Badge tone="green">linked to {person.linkedUser.name}</Badge> : null}
          </div>
        </div>
      </PageTitle>

      {isRecipient ? (
        <Card className="mb-6 border-emerald-200 bg-emerald-50">
          <p className="text-sm text-emerald-800">
            🎉 This is <strong>your</strong> profile. Gifts others have claimed or bought for you are
            hidden from you — that's the point! Fill in your likes below so the family (and the AI) can suggest great ideas.
          </p>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT: profile */}
        <div className="space-y-6">
          <Card>
            <h3 className="font-semibold">Profile</h3>
            <PersonEditor person={person} action={updatePerson} />
            {!person.linkedUserId ? (
              <form action={claimPersonAsMe} className="mt-4 border-t border-stone-100 pt-4">
                <input type="hidden" name="personId" value={person.id} />
                <SubmitButton>🎯 This is me — link my account</SubmitButton>
                <p className="mt-1 text-xs text-stone-500">Links your login so gifts bought for you stay secret.</p>
              </form>
            ) : null}
            <form action={deletePerson} className="mt-3">
              <input type="hidden" name="personId" value={person.id} />
              <button className="text-xs text-stone-400 underline hover:text-rose-600">Delete this person</button>
            </form>
          </Card>

          <Card>
            <h3 className="font-semibold">Budget so far</h3>
            <p className="mt-2 text-2xl font-bold text-stone-900">{money(Number(spent))}</p>
            <p className="text-xs text-stone-500">purchased gifts (family-wide view)</p>
          </Card>
        </div>

        {/* RIGHT: gifts */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold">Gift ideas & tracking</h3>
              <SuggestButton personId={person.id} occasionId={occasions[0]?.id} disabled={isRecipient} />
            </div>
            <p className="mt-1 text-xs text-stone-500">
              {isRecipient
                ? "You only see ideas here — anything claimed/bought is hidden to keep the surprise."
                : "Claim a gift to secretly buy it. The recipient won't see who claimed it."}
            </p>

            {/* Add gift */}
            <form action={addGift} className="mt-4 grid gap-3 rounded-xl bg-stone-50 p-4 sm:grid-cols-2">
              <input type="hidden" name="personId" value={person.id} />
              <Field label="Gift title"><input name="title" required placeholder="Cozy wool socks" className={inputCls} /></Field>
              <Field label="Price"><input name="price" type="number" min="0" step="0.01" placeholder="25" className={inputCls} /></Field>
              <Field label="Link (optional)"><input name="url" type="url" placeholder="https://…" className={inputCls} /></Field>
              <Field label="Occasion">
                <select name="occasionId" className={inputCls} defaultValue="">
                  <option value="">(none)</option>
                  {occasions.map((o) => <option key={o.id} value={o.id}>{o.name}{o.date ? ` · ${fmtDate(o.date)}` : ""}</option>)}
                </select>
              </Field>
              <Field label="Notes"><input name="description" placeholder="Size M, navy" className={inputCls} /></Field>
              <PhotoField personId={person.id} />
              <div className="sm:col-span-2"><SubmitButton>Add idea</SubmitButton></div>
            </form>
          </Card>

          {visible.length === 0 ? (
            <Empty>No gift ideas yet. Add one above, or tap “Suggest ideas”.</Empty>
          ) : (
            <>
              {noOccasion.length > 0 ? (
                <GiftGroup title="All ideas" gifts={noOccasion} person={person} viewerId={user.id} statusAction={updateGiftStatus} deleteAction={deleteGift} />
              ) : null}
              {[...byOccasion.entries()].map(([occId, gifts]) => {
                const occ = occasions.find((o) => o.id === occId);
                return <GiftGroup key={occId} title={occ ? `${occ.name}${occ.date ? ` · ${fmtDate(occ.date)}` : ""}` : "Occasion"} gifts={gifts} person={person} viewerId={user.id} statusAction={updateGiftStatus} deleteAction={deleteGift} />;
              })}
            </>
          )}

          {/* HISTORY */}
          {allGifts.some((g) => g.status === "PURCHASED" && g.occasion?.date && new Date(g.occasion.date) < new Date()) ? (
            <Card>
              <h3 className="font-semibold">🎁 Gift history</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {allGifts
                  .filter((g) => g.status === "PURCHASED" && g.occasion?.date && new Date(g.occasion.date) < new Date())
                  .sort((a, b) => (b.purchasedAt?.getTime() ?? 0) - (a.purchasedAt?.getTime() ?? 0))
                  .map((g) => (
                    <li key={g.id} className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2">
                      <span>{g.title}</span>
                      <span className="text-xs text-stone-500">{g.occasion?.name} · {money(g.price != null ? Number(g.price) : null, g.currency)}</span>
                    </li>
                  ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>

      <p className="mt-8"><Link href={`/family/${person.familyId}`} className="text-sm text-stone-500 hover:text-stone-900">← Back to family</Link></p>
    </>
  );
}

function PhotoField({ personId }: { personId: string }) {
  // Hidden input filled by PhotoUpload (client). We render a client wrapper.
  return <PhotoUploadField personId={personId} />;
}

import { PhotoUploadField } from "./photo-upload-field";

function GiftGroup({
  title, gifts, person, viewerId, statusAction, deleteAction,
}: {
  title: string;
  gifts: any[];
  person: any;
  viewerId: string;
  statusAction: any;
  deleteAction: any;
}) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">{title}</h4>
      <div className="grid gap-3 md:grid-cols-2">
        {gifts.map((g: any) => (
          <GiftCard key={g.id} gift={g} person={person} viewerId={viewerId} statusAction={statusAction} deleteAction={deleteAction} />
        ))}
      </div>
    </div>
  );
}
