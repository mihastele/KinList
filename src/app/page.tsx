import Link from "next/link";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <nav className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
          <span className="text-2xl">🎁</span> KinList
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-stone-600 hover:text-stone-900">Log in</Link>
          <Link href="/signup" className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-500">Get started free</Link>
        </div>
      </nav>

      <section className="mt-20 text-center">
        <h1 className="mx-auto max-w-3xl text-5xl font-extrabold leading-tight tracking-tight">
          Never forget a birthday.<br />Never spoil a surprise.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-stone-600">
          KinList is a shared space for your family's gift ideas, budgets and Secret Santa.
          Add people, jot down ideas, mark what you've bought — and the recipient never sees it coming.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/signup" className="rounded-xl bg-rose-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-rose-500">Create your family — free</Link>
          <Link href="/login" className="rounded-xl border border-stone-300 bg-white px-6 py-3 text-base font-semibold text-stone-700 hover:bg-stone-50">I have an account</Link>
        </div>
      </section>

      <section className="mt-20 grid gap-6 md:grid-cols-3">
        {[
          { icon: "🎯", title: "Surprise-safe", text: "Claim or buy a gift and it's hidden from the recipient. Everyone else still sees it — no double-buying." },
          { icon: "🤖", title: "Gift ideas on tap", text: "Tell KinList what they love (and hate). Get instant, budget-aware gift ideas — with optional AI." },
          { icon: "🎅", title: "Secret Santa built-in", text: "Draw names, set a budget, share wishlists. Nobody draws themselves." },
        ].map((f) => (
          <div key={f.title} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="text-3xl">{f.icon}</div>
            <h3 className="mt-3 font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-stone-600">{f.text}</p>
          </div>
        ))}
      </section>

      <section className="mt-20 rounded-3xl bg-rose-600 px-8 py-12 text-center text-white">
        <h2 className="text-3xl font-bold">Ready to kill holiday stress?</h2>
        <p className="mx-auto mt-3 max-w-xl text-rose-100">Free for one family. No credit card.</p>
        <Link href="/signup" className="mt-6 inline-block rounded-xl bg-white px-6 py-3 text-base font-semibold text-rose-700 hover:bg-rose-50">Get started</Link>
      </section>

      <footer className="mt-16 pb-10 text-center text-sm text-stone-500">
        KinList — open source. Made for families, not spreadsheets.
      </footer>
    </main>
  );
}
