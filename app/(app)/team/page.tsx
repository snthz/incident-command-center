import type { Metadata } from "next";
import { requireUser } from "@/lib/dal";
import { getOrganization, getTeam } from "@/features/incidents/queries";

export const metadata: Metadata = { title: "Team — Incident Command Center" };

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function TeamPage() {
  await requireUser();
  const [organization, members] = await Promise.all([getOrganization(), getTeam()]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Team</h1>
        <p className="text-sm text-muted">
          Everyone responding to incidents at {organization.name}.
        </p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {members.map((member) => (
          <li
            key={member.profileId}
            className="flex items-center gap-4 rounded-lg border border-line bg-surface p-4"
          >
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 text-sm font-semibold text-neutral-300"
            >
              {initialsOf(member.profile.name)}
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-foreground">
                  {member.profile.name}
                </span>
                {member.role === "admin" ? (
                  <span className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
                    Admin
                  </span>
                ) : null}
              </span>
              <span className="truncate text-xs text-muted">{member.profile.email}</span>
              <span className="text-xs text-muted">
                {member.profile._count.ownedIncidents} active incident
                {member.profile._count.ownedIncidents === 1 ? "" : "s"}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
