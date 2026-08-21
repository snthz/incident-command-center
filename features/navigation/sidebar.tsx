import Link from "next/link";
import { getUser } from "@/lib/dal";
import { Logo } from "@/features/branding/logo";
import { getOrganization, getOrgProjects } from "@/features/incidents/queries";
import { SidebarNav } from "./sidebar-nav";

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export async function SidebarContent() {
  const [organization, projects, user] = await Promise.all([
    getOrganization(),
    getOrgProjects(),
    getUser(),
  ]);

  const name =
    (user?.user_metadata?.name as string | undefined) ?? user?.email ?? "User";

  return (
    <>
      <div className="flex h-14 items-center gap-2.5 px-4">
        <Link href="/dashboard" aria-label="Incident Command Center" className="shrink-0">
          <Logo size={26} withText={false} />
        </Link>
        <span className="truncate text-sm font-semibold text-foreground">
          {organization.name}
        </span>
        <svg aria-hidden viewBox="0 0 12 12" className="ml-auto size-3 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3.5 4.5 2.5-2.5 2.5 2.5M3.5 7.5 6 10l2.5-2.5" />
        </svg>
      </div>

      <SidebarNav
        projects={projects.map((project) => ({
          slug: project.slug,
          name: project.name,
          color: project.color,
        }))}
      />

      <div className="flex items-center gap-3 px-4 py-3.5">
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-neutral-300 ring-1 ring-line"
        >
          {initialsOf(name)}
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium text-foreground">{name}</span>
          <span className="truncate text-xs text-muted">{user?.email}</span>
        </div>
      </div>
    </>
  );
}

export function SidebarSkeleton() {
  return (
    <div aria-hidden className="flex flex-1 flex-col gap-2 px-3 py-4">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="h-8 animate-pulse rounded-md bg-white/5" />
      ))}
    </div>
  );
}
