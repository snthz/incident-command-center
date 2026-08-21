import Link from "next/link";
import { Suspense } from "react";
import { ToastProvider } from "@/components/ui/toaster";
import { UserMenu } from "@/features/auth/user-menu";
import { Logo } from "@/features/branding/logo";
import { MobileSidebar } from "@/features/navigation/mobile-sidebar";
import { SidebarContent, SidebarSkeleton } from "@/features/navigation/sidebar";
import { NotificationsBell } from "@/features/notifications/bell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const sidebar = (
    <Suspense fallback={<SidebarSkeleton />}>
      <SidebarContent />
    </Suspense>
  );

  return (
    <ToastProvider>
    <div className="flex min-h-full flex-1">
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        {sidebar}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-line bg-surface">
          <div className="flex h-14 w-full items-center justify-between gap-4 px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <MobileSidebar>{sidebar}</MobileSidebar>
              <Link href="/dashboard" aria-label="Incident Command Center" className="lg:hidden">
                <Logo size={26} withText={false} />
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Suspense fallback={<div aria-hidden className="size-8 animate-pulse rounded-full bg-white/5" />}>
                <NotificationsBell />
              </Suspense>
              <Suspense fallback={<div aria-hidden className="size-8 animate-pulse rounded-full bg-white/5" />}>
                <UserMenu />
              </Suspense>
            </div>
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-6">
          {children}
        </main>

        <footer className="border-t border-line">
          <div className="mx-auto flex h-12 w-full max-w-6xl items-center justify-between gap-4 px-4 text-xs text-muted lg:px-6">
            <span>Incident Command Center</span>
            <Link href="/about-severities" className="hover:text-neutral-200">
              Severity guide
            </Link>
          </div>
        </footer>
      </div>
    </div>
    </ToastProvider>
  );
}
