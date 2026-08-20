import Link from "next/link";
import { Suspense } from "react";
import { UserMenu } from "@/features/auth/user-menu";
import { Logo } from "@/features/branding/logo";
import { LoadingScreen } from "@/components/ui/loading-screen";


export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
    <div className="flex min-h-full flex-1 flex-col">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="border-b border-line bg-surface">
        <nav
          aria-label="Main"
          className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4"
        >
          <div className="flex items-center gap-6">
            <Link href="/dashboard" aria-label="Incident Command Center">
              <Logo size={28} />
            </Link>
            <Link href="/about-severities" className="text-sm text-muted hover:text-neutral-200">
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
    </>
  );
}
