import { useId } from "react";
import { Input } from "./input";
import { PasswordInput } from "./password-input";

type TextFieldProps = React.ComponentProps<"input"> & {
  label: string;
  /** Message from the Zod `fieldErrors` of the form's action state. */
  error?: string;
};

/**
 * Label + control + error message, with the ids and ARIA wiring handled.
 * `type="password"` swaps in the input with the reveal toggle.
 */
export function TextField({ label, error, id, type = "text", ...props }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  const control =
    type === "password" ? (
      <PasswordInput
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
      />
    ) : (
      <Input
        id={inputId}
        type={type}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
      />
    );

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm text-neutral-300">
        {label}
      </label>
      {control}
      {error ? (
        <p id={errorId} className="text-xs text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
