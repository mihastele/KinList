"use client";
import { useState } from "react";
import { SubmitButton, Field, inputCls } from "@/components/ui";

export function InviteLink({
  familyId,
  inviteAction,
}: {
  familyId: string;
  inviteAction: (fd: FormData) => Promise<{ error?: string; ok?: boolean; inviteLink?: string }>;
}) {
  const [link, setLink] = useState<string>();
  const [err, setErr] = useState<string>();
  const [copied, setCopied] = useState(false);

  async function handle(fd: FormData) {
    setErr(undefined); setLink(undefined); setCopied(false);
    const res = await inviteAction(fd);
    if (res?.error) setErr(res.error);
    else if (res?.inviteLink) setLink(res.inviteLink);
  }

  return (
    <div>
      <form action={handle} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <input type="hidden" name="familyId" value={familyId} />
        <div className="flex-1">
          <Field label="Invite by email">
            <input name="email" type="email" required placeholder="sister@example.com" className={inputCls} />
          </Field>
        </div>
        <SubmitButton>Send invite</SubmitButton>
      </form>
      {err ? <p className="mt-2 text-sm text-rose-600">{err}</p> : null}
      {link ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm">
          <span className="flex-1 break-all text-emerald-800">{link}</span>
          <button
            type="button"
            onClick={() => { navigator.clipboard.writeText(link); setCopied(true); }}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
          >{copied ? "Copied!" : "Copy"}</button>
        </div>
      ) : null}
    </div>
  );
}
