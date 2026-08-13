import * as React from "react";
import { cn } from "@workspace/ui/lib/utils";

function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn("space-y-4 border-0 p-0 m-0", className)}
      {...props}
    />
  );
}

interface FieldLegendProps extends React.ComponentProps<"legend"> {
  variant?: "legend" | "label";
}

function FieldLegend({
  className,
  variant = "legend",
  ...props
}: FieldLegendProps) {
  return (
    <legend
      data-slot="field-legend"
      className={cn(
        variant === "label"
          ? "text-sm font-medium leading-none text-foreground"
          : "text-base font-semibold tracking-tight text-foreground mb-1.5",
        className
      )}
      {...props}
    />
  );
}

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-group"
      className={cn("@container/field-group flex flex-col gap-5", className)}
      {...props}
    />
  );
}

interface FieldProps extends React.ComponentProps<"div"> {
  orientation?: "vertical" | "horizontal" | "responsive";
  "data-invalid"?: boolean;
}

function Field({
  className,
  orientation = "vertical",
  "data-invalid": dataInvalid,
  ...props
}: FieldProps) {
  return (
    <div
      data-slot="field"
      data-invalid={dataInvalid ? true : undefined}
      className={cn(
        "group/field flex flex-col gap-1.5 data-[invalid=true]:text-destructive",
        orientation === "horizontal" &&
          "flex-row items-center justify-between gap-4 space-y-0",
        orientation === "responsive" &&
          "@container/field-group:flex-row @container/field-group:items-center @container/field-group:justify-between @container/field-group:gap-4",
        className
      )}
      {...props}
    />
  );
}

function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-content"
      className={cn("flex flex-col gap-1 flex-1 min-w-0", className)}
      {...props}
    />
  );
}

function FieldLabel({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="field-label"
      className={cn(
        "text-sm font-medium leading-none text-foreground select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 group-data-[invalid=true]/field:text-destructive peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

function FieldTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-title"
      className={cn(
        "text-sm font-medium text-foreground group-data-[invalid=true]/field:text-destructive",
        className
      )}
      {...props}
    />
  );
}

function FieldDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-description"
      className={cn("text-xs text-muted-foreground leading-normal", className)}
      {...props}
    />
  );
}

function FieldSeparator({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-separator"
      className={cn(
        "flex items-center gap-3 my-2 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface FieldErrorProps extends React.ComponentProps<"div"> {
  errors?:
    | string
    | (string | { message?: string } | undefined | null)[]
    | Record<string, any>;
}

function FieldError({
  className,
  children,
  errors,
  ...props
}: FieldErrorProps) {
  let errorList: string[] = [];

  if (children) {
    if (typeof children === "string") {
      errorList.push(children);
    } else {
      return (
        <div
          data-slot="field-error"
          className={cn("text-xs font-medium text-destructive mt-1", className)}
          {...props}
        >
          {children}
        </div>
      );
    }
  }

  if (errors) {
    if (typeof errors === "string") {
      errorList.push(errors);
    } else if (Array.isArray(errors)) {
      errors.forEach((err) => {
        if (typeof err === "string") {
          errorList.push(err);
        } else if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
          errorList.push(err.message);
        }
      });
    } else if (typeof errors === "object" && "message" in errors && typeof errors.message === "string") {
      errorList.push(errors.message);
    }
  }

  if (errorList.length === 0) return null;

  if (errorList.length === 1) {
    return (
      <p
        data-slot="field-error"
        className={cn("text-xs font-medium text-destructive mt-1", className)}
        {...props}
      >
        {errorList[0]}
      </p>
    );
  }

  return (
    <div
      data-slot="field-error"
      className={cn("text-xs font-medium text-destructive mt-1 space-y-0.5", className)}
      {...props}
    >
      <ul className="list-disc pl-4 space-y-0.5">
        {errorList.map((msg, i) => (
          <li key={i}>{msg}</li>
        ))}
      </ul>
    </div>
  );
}

export {
  FieldSet,
  FieldLegend,
  FieldGroup,
  Field,
  FieldContent,
  FieldLabel,
  FieldTitle,
  FieldDescription,
  FieldSeparator,
  FieldError,
};
