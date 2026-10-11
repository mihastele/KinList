"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { acceptInvite } from "@/actions/family";

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [msg, setMsg] = useState<string>("Accepting invite…");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      router.push(`/login?invite=${token}`);
      return;
    }
    (async () => {
      const res = await acceptInvite(token);
      if (res?.error) { setMsg(res.error); return; }
      setDone(true);
      setMsg("You're in! Redirecting…");
      router.push(`/family/${res.familyId}`);
    })();
  }, [isPending, session, token, router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 text-center">
      <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <div className="text-4xl">🎁</div>
        <h1 className="mt-3 text-xl font-bold">{done ? "Welcome to the family!" : "Joining family…"}</h1>
        <p className="mt-1 text-sm text-stone-500">{msg}</p>
      </div>
    </main>
  );
}
