import Link from "next/link";
import { Suspense } from "react";
import { ToastProvider } from "@/components/ui/toaster";
import { UserMenu } from "@/features/auth/user-menu";
import { Logo } from "@/features/branding/logo";
import { MobileSidebar } from "@/features/navigation/mobile-sidebar";
import { SidebarContent, SidebarSkeleton } from "@/features/navigation/sidebar";
import { TeamAvatars } from "@/features/navigation/team-avatars";
import { NotificationsBell } from "@/features/notifications/bell";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const sidebar = (
    <Suspense fallback={<SidebarSkeleton />}>
      <SidebarContent />
    </Suspense>
  );

  return (
    <ToastProvider>
    <div className="flex min-h-dvh flex-1">
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col lg:flex">
        {sidebar}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col p-2 lg:p-3 lg:pl-0">
        <div className="relative flex w-full flex-1 flex-col rounded-xl border border-line bg-surface shadow-2xl shadow-black/20">
          <header className="flex items-center justify-between gap-4 px-4 pt-3 lg:absolute lg:right-8 lg:top-4 lg:p-0">
            <div className="flex items-center gap-3 lg:hidden">
              <MobileSidebar>{sidebar}</MobileSidebar>
              <Link href="/dashboard" aria-label="Incident Command Center">
                <Logo size={24} withText={false} />
              </Link>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <Suspense fallback={<div aria-hidden className="h-6.5 w-24 animate-pulse rounded-full bg-white/5" />}>
                <TeamAvatars />
              </Suspense>
              <span aria-hidden className="hidden h-5 w-px bg-line sm:block" />
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

          <main id="main" className="w-full flex-1 px-4 pb-10 pt-1 lg:px-8 lg:pt-4">
            {children}
          </main>
        </div>
      </div>
    </div>
    </ToastProvider>
  );
}
