"use client";
import { useFormStatus } from "react-dom";
import { useState } from "react";

export function SubmitButton({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-500 disabled:opacity-60 ${className}`}
    >
      {pending ? "Saving…" : children}
    </button>
  );
}

export function ErrorText({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-sm text-rose-600">{msg}</p>;
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-stone-500">{hint}</span> : null}
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200";

/** Small client wrapper that runs a server action from a form and shows result. */
export function ActionForm({
  action,
  children,
  onDone,
  className = "",
}: {
  action: (formData: FormData) => Promise<{ error?: string; ok?: boolean } & Record<string, unknown>>;
  children: React.ReactNode;
  onDone?: (res: { error?: string; ok?: boolean }) => void;
  className?: string;
}) {
  const [err, setErr] = useState<string | undefined>();
  async function handle(formData: FormData) {
    setErr(undefined);
    const res = await action(formData);
    if (res?.error) setErr(res.error);
    else onDone?.(res);
  }
  return (
    <form action={handle} className={className}>
      {children}
      <ErrorText msg={err} />
    </form>
  );
}

export function Badge({ children, tone = "stone" }: { children: React.ReactNode; tone?: "stone" | "rose" | "green" | "amber" | "blue" }) {
  const tones: Record<string, string> = {
    stone: "bg-stone-100 text-stone-700",
    rose: "bg-rose-100 text-rose-700",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-sky-100 text-sky-700",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-stone-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

export function PageTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight text-stone-900">{children}</h1>
      {sub ? <p className="mt-1 text-sm text-stone-500">{sub}</p> : null}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">{children}</div>;
}
