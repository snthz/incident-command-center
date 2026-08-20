import { cn } from "@/lib/cn";

/**
 * Single source of truth for how every text control in the app looks.
 * Change it here and every input, textarea and select follows.
 */
export const inputClassName =
  "w-full rounded-md border border-line bg-background px-3 py-2 text-sm text-foreground transition-colors placeholder:text-neutral-600 hover:border-neutral-600 aria-invalid:border-red-500/60 disabled:cursor-not-allowed disabled:opacity-60";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(inputClassName, className)} {...props} />;
}
