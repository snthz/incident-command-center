import { cn } from "@/lib/cn";

const base =
  "rounded-md px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const variants = {
  primary: "bg-brand text-brand-contrast hover:bg-brand-hover",
  secondary: "border border-line text-neutral-300 hover:bg-white/5",
  ghost: "text-muted hover:text-foreground",
} as const;

type ButtonProps = React.ComponentProps<"button"> & {
  variant?: keyof typeof variants;
};

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return <button className={cn(base, variants[variant], className)} {...props} />;
}
