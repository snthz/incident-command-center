import Link from "next/link";
import { Suspense } from "react";
import { UserMenu } from "@/features/auth/user-menu";

// Static shell: streams immediately. Session-dependent UserMenu loads in its
// own Suspense boundary so it never blocks page content.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="border-b border-white/10 bg-surface">
        <nav
          aria-label="Main"
          className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4"
        >
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-sm font-semibold tracking-wide text-slate-100">
              ⚡ Incident Command Center
            </Link>
            <Link href="/about-severities" className="text-sm text-slate-400 hover:text-slate-200">
              Severity guide
            </Link>
          </div>
          <Suspense fallback={<div aria-hidden className="h-8 w-28 animate-pulse rounded-md bg-white/5" />}>
            <UserMenu />
          </Suspense>
        </nav>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
