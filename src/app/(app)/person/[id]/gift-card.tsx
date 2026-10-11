"use client";
import { useState } from "react";
import { Badge, SubmitButton } from "@/components/ui";
import { money } from "@/lib/format";
import { PhotoUpload } from "@/components/photo-upload";

export function GiftCard({
  gift, person, viewerId, statusAction, deleteAction,
}: {
  gift: any;
  person: any;
  viewerId: string;
  statusAction: any;
  deleteAction: any;
}) {
  const [status, setStatus] = useState<string>(gift.status);
  const isRecipient = person.linkedUserId === viewerId;
  const canManage = !isRecipient;

  function set(next: string) {
    setStatus(next);
    const fd = new FormData();
    fd.append("giftId", gift.id);
    fd.append("status", next);
    statusAction(fd);
  }

  const tone =
    status === "PURCHASED" ? "green" :
    status === "CLAIMED" ? "blue" : "stone";

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex gap-3">
        {gift.imageUrl ? (
          <img src={gift.imageUrl} alt={gift.title} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-2xl">🎁</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold leading-tight">{gift.title}</h4>
            <Badge tone={tone as any}>
              {status === "IDEA" ? "idea" : status === "CLAIMED" ? "claimed" : "bought"}
            </Badge>
          </div>
          {gift.description ? <p className="mt-1 text-sm text-stone-500">{gift.description}</p> : null}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-stone-500">
            {gift.price != null ? <span className="font-medium text-stone-700">{money(gift.price, gift.currency)}</span> : null}
            {gift.occasion ? <Badge>{gift.occasion.name}</Badge> : null}
            {gift.url ? <a href={gift.url} target="_blank" rel="noreferrer" className="text-rose-600 hover:underline">view ↗</a> : null}
            {gift.source === "AI" ? <Badge tone="rose">AI</Badge> : null}
          </div>
          {canManage && gift.purchaser ? (
            <p className="mt-1 text-xs text-stone-400">by {gift.purchaser.name}</p>
          ) : null}
        </div>
      </div>

      {canManage ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-stone-100 pt-3">
          {status === "IDEA" ? (
            <button onClick={() => set("CLAIMED")} className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500">🙋 I'll get this</button>
          ) : (
            <button onClick={() => set("IDEA")} className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50">↩︎ Un-claim</button>
          )}
          {status !== "PURCHASED" ? (
            <button onClick={() => set("PURCHASED")} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500">✓ Mark bought</button>
          ) : (
            <button onClick={() => set("CLAIMED")} className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50">↩︎ Mark not bought</button>
          )}
          <form action={deleteAction} className="ml-auto">
            <input type="hidden" name="giftId" value={gift.id} />
            <button className="text-xs text-stone-400 underline hover:text-rose-600">delete</button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
