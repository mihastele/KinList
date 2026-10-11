"use client";
// Better Auth v1.4 doesn't export a SessionProvider — it uses a nanostore internally.
// useSession() works without a provider. This wrapper just passes children through.
export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
