import { useId } from "react";
import { cn } from "@/lib/cn";

type SelectFieldProps = React.ComponentProps<"select"> & {
  label: string;
};

export function SelectField({ label, id, className, children, ...props }: SelectFieldProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={selectId} className="text-sm text-muted">
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          className={cn(
            "appearance-none rounded-md border border-line bg-surface-2 py-1.5 pl-3 pr-8 text-sm text-foreground",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <svg
          aria-hidden
          viewBox="0 0 12 12"
          className="pointer-events-none absolute right-2.5 top-1/2 size-3 -translate-y-1/2 text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2.5 4.5 6 8l3.5-3.5" />
        </svg>
      </div>
    </div>
  );
}
