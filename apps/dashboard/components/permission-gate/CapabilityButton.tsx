"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@workspace/ui/components/tooltip";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";

export interface CapabilityButtonProps extends React.ComponentProps<typeof Button> {
  /**
   * Server-resolved capability boolean (e.g. record._capabilities.canEdit).
   * Strict boolean evaluation (Rule FE-1, FE-2, FE-3).
   */
  capability?: boolean;
  /**
   * Behavior when capability is false or undefined.
   * - "hide": completely omits rendering from the DOM (default).
   * - "disable": renders button in disabled state with tooltip and Sonner rejection on click.
   */
  mode?: "hide" | "disable";
  /**
   * Custom tooltip message shown when disabled.
   */
  deniedTooltip?: string;
  /**
   * Custom toast message shown if unauthorized user clicks.
   */
  deniedToast?: string;
  /**
   * Optional fallback node when hidden.
   */
  fallback?: React.ReactNode;
  /**
   * Next.js link or polymorphic render node support.
   */
  render?: React.ReactElement;
}

/**
 * CapabilityButton: Gated action button driven exclusively by server-resolved record `_capabilities`.
 * Never recomputes or guesses scope rules on the client.
 */
export const CapabilityButton = React.forwardRef<HTMLButtonElement, CapabilityButtonProps>(
  (
    {
      capability,
      mode = "hide",
      deniedTooltip,
      deniedToast,
      fallback = null,
      onClick,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const isAllowed = Boolean(capability);

    if (!isAllowed) {
      if (mode === "hide") {
        return <>{fallback}</>;
      }

      const defaultTooltip = deniedTooltip || "You do not have permission for this record action.";
      const defaultToast = deniedToast || "Access Denied: You do not have permission to perform this action on this record.";

      const handleDeniedClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        toast.error(defaultToast, {
          icon: <ShieldAlert className="size-4 text-destructive shrink-0" />,
        });
      };

      return (
        <TooltipProvider delay={150}>
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="inline-flex cursor-not-allowed">
                  <Button
                    ref={ref}
                    {...props}
                    disabled={true}
                    onClick={handleDeniedClick}
                    className={className}
                    aria-disabled={true}
                  >
                    {children}
                  </Button>
                </span>
              }
            />
            <TooltipContent side="top" sideOffset={5} className="text-xs max-w-xs font-medium">
              <p>{defaultTooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <Button ref={ref} onClick={onClick} disabled={disabled} className={className} {...props}>
        {children}
      </Button>
    );
  }
);

CapabilityButton.displayName = "CapabilityButton";
