import type { IncidentListItem } from "../queries";

export function OwnerChip({ owner }: { owner: IncidentListItem["owner"] }) {
  if (!owner) {
    return <span className="text-xs text-muted">Unassigned</span>;
  }
  const initials = owner.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <span className="flex items-center gap-1.5 text-xs text-muted">
      <span
        aria-hidden
        className="flex size-5 items-center justify-center rounded-full bg-surface-2 text-[9px] font-semibold text-neutral-300"
      >
        {initials}
      </span>
      {owner.name}
    </span>
  );
}
