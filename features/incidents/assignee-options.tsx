import type { SelectOption } from "@/components/ui/select";
import type { ProfileOption } from "./queries";

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function AssigneeAvatar({ name }: { name?: string }) {
  return (
    <span
      aria-hidden
      className="flex size-6 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-[9px] font-semibold text-neutral-300"
    >
      {name ? (
        initialsOf(name)
      ) : (
        <svg viewBox="0 0 16 16" className="size-3.5 text-muted" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
          <circle cx="8" cy="5.5" r="2.5" />
          <path d="M3.5 13.5c.7-2.4 2.4-3.5 4.5-3.5s3.8 1.1 4.5 3.5" />
        </svg>
      )}
    </span>
  );
}

export function assigneeOptions(profiles: ProfileOption[]): SelectOption[] {
  return [
    {
      value: "",
      label: "Unassigned",
      icon: <AssigneeAvatar />,
      description: "No one is on this yet",
    },
    ...profiles.map((profile) => ({
      value: profile.id,
      label: profile.name,
      icon: <AssigneeAvatar name={profile.name} />,
      description: profile.email,
    })),
  ];
}
