import { getProfiles } from "@/features/incidents/queries";

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export async function TeamAvatars() {
  const profiles = await getProfiles();
  const shown = profiles.slice(0, 5);
  const rest = profiles.length - shown.length;

  return (
    <div className="hidden items-center sm:flex" aria-label="Team members" role="img">
      <div className="flex -space-x-1.5">
        {shown.map((profile) => (
          <span
            key={profile.id}
            title={profile.name}
            className="flex size-6.5 items-center justify-center rounded-full bg-surface-2 text-[9px] font-semibold text-neutral-300 ring-2 ring-surface"
          >
            {initialsOf(profile.name)}
            <span className="sr-only">{profile.name}</span>
          </span>
        ))}
      </div>
      {rest > 0 ? (
        <span className="ml-1.5 text-xs text-muted">+{rest}</span>
      ) : null}
    </div>
  );
}
