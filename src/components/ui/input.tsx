import * as React from "react";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"; // Import field components
import { cn } from "@/lib/utils";

// High-level Input component that includes Field, Label, Description, Error
interface InputProps extends React.ComponentPropsWithoutRef<"input"> {
  label?: string;
  description?: string;
  errorMessage?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, description, errorMessage, id, className, ...props }, ref) => {
    const generatedId = React.useId(); // Call unconditionally
    const inputId = id || generatedId; // Use provided id or generated one

    return (
      <Field className={cn(className)}>
        {label && <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}
        <input
          id={inputId}
          type={props.type} // Pass type from props
          data-slot="input"
          className={cn(
            "border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 h-9 rounded-md border bg-white dark:bg-gray-800 px-2.5 py-1 text-base shadow-xs transition-[color,box-shadow] file:h-7 file:text-sm file:font-medium focus-visible:ring-[3px] aria-invalid:ring-[3px] md:text-sm file:text-foreground placeholder:text-muted-foreground w-full min-w-0 outline-none file:inline-flex file:border-0 file:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
            className, // Apply className here
          )}
          ref={ref}
          {...props}
        />
        {description && <FieldDescription>{description}</FieldDescription>}
        {errorMessage && <FieldError>{errorMessage}</FieldError>}
      </Field>
    );
  },
);
Input.displayName = "Input";

export { Input };
