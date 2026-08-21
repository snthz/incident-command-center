"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export type SidebarProject = {
  slug: string;
  name: string;
  color: string;
};

const overviewIcon = (
  <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="5" height="5" rx="1" />
    <rect x="9" y="2" width="5" height="5" rx="1" />
    <rect x="2" y="9" width="5" height="5" rx="1" />
    <rect x="9" y="9" width="5" height="5" rx="1" />
  </svg>
);

const teamIcon = (
  <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="5.5" cy="5.5" r="2.3" />
    <path d="M1.5 13.5c.6-2.2 2.2-3.3 4-3.3s3.4 1.1 4 3.3" />
    <circle cx="11.5" cy="6" r="1.9" />
    <path d="M10.8 10.4c1.7.1 3.2 1.1 3.7 3.1" />
  </svg>
);

const guideIcon = (
  <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2.5c-1.6-1-3.9-1-5.5-.4v10.4c1.6-.6 3.9-.6 5.5.4 1.6-1 3.9-1 5.5-.4V2.1c-1.6-.6-3.9-.6-5.5.4Z" />
    <path d="M8 2.5v10.4" />
  </svg>
);

function NavLink({
  href,
  active,
  children,
  onNavigate,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
        active
          ? "bg-white/5 text-foreground"
          : "text-muted hover:bg-white/5 hover:text-neutral-200",
      )}
    >
      {children}
    </Link>
  );
}

export function SidebarNav({
  projects,
  onNavigate,
}: {
  projects: SidebarProject[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Sidebar" className="flex flex-1 flex-col gap-6 overflow-y-auto scroll-slim px-3 py-4">
      <div className="flex flex-col gap-0.5">
        <NavLink href="/dashboard" active={pathname === "/dashboard"} onNavigate={onNavigate}>
          {overviewIcon}
          Overview
        </NavLink>
        <NavLink href="/team" active={pathname === "/team"} onNavigate={onNavigate}>
          {teamIcon}
          Team
        </NavLink>
        <NavLink href="/about-severities" active={false} onNavigate={onNavigate}>
          {guideIcon}
          Severity guide
        </NavLink>
      </div>

      <div className="flex flex-col gap-1">
        <p className="px-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
          Projects
        </p>
        <div className="flex flex-col gap-0.5">
          {projects.map((project) => (
            <NavLink
              key={project.slug}
              href={`/projects/${project.slug}`}
              active={pathname === `/projects/${project.slug}`}
              onNavigate={onNavigate}
            >
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: project.color }}
              />
              <span className="truncate">{project.name}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
