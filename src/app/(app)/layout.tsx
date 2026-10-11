import Link from "next/link";
import { requireUser } from "@/lib/session";
import { signOutLink } from "./signout";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireUser();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/dashboard" className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
            <span className="text-xl">🎁</span> KinList
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-stone-600 sm:inline">Hi, {user.name.split(" ")[0]}</span>
            <form action={signOutLink}>
              <button className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 font-medium text-stone-700 hover:bg-stone-50">Log out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
