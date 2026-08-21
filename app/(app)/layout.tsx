import Link from "next/link";
import { Suspense } from "react";
import { ToastProvider } from "@/components/ui/toaster";
import { UserMenu } from "@/features/auth/user-menu";
import { Logo } from "@/features/branding/logo";
import { NotificationsBell } from "@/features/notifications/bell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
    <div className="flex min-h-full flex-1 flex-col">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="border-b border-line bg-surface">
        <nav
          aria-label="Main"
          className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4"
        >
          <Link href="/dashboard" aria-label="Incident Command Center">
            <Logo size={28} />
          </Link>
          <div className="flex items-center gap-2">
            <Suspense fallback={<div aria-hidden className="size-8 animate-pulse rounded-full bg-white/5" />}>
              <NotificationsBell />
            </Suspense>
            <Suspense fallback={<div aria-hidden className="size-8 animate-pulse rounded-full bg-white/5" />}>
              <UserMenu />
            </Suspense>
          </div>
        </nav>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex h-12 w-full max-w-6xl items-center justify-between gap-4 px-4 text-xs text-muted">
          <span>Incident Command Center</span>
          <Link href="/about-severities" className="hover:text-neutral-200">
            Severity guide
          </Link>
        </div>
      </footer>
    </div>
    </ToastProvider>
  );
}
