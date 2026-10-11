"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";

function LoginPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(undefined);
    const res = await signIn.email({ email, password });
    setBusy(false);
    if (res.error) { setErr(res.error.message ?? "Sign in failed"); return; }
    const invite = params.get("invite");
    router.push(invite ? `/invite/${invite}` : "/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2 text-xl font-extrabold"><span className="text-2xl">🎁</span> KinList</div>
        <h1 className="text-xl font-bold">Welcome back</h1>
        <p className="mt-1 text-sm text-stone-500">Log in to your family space.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-stone-700">Email</span>
            <input className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-stone-700">Password</span>
            <input className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {err ? <p className="text-sm text-rose-600">{err}</p> : null}
          <button disabled={busy} className="w-full rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-60">{busy ? "Signing in…" : "Log in"}</button>
        </form>
        <p className="mt-4 text-center text-sm text-stone-500">
          No account? <Link href="/signup" className="font-medium text-rose-600 hover:underline">Sign up</Link>
        </p>
      </div>
    </main>
  );
}


export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
