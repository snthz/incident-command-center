import { cn } from "@/lib/cn";
import { inputClassName } from "./input";

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea className={cn(inputClassName, "min-h-24 resize-y", className)} {...props} />
  );
}
