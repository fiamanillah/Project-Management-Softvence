"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@workspace/ui/components/tooltip";
import { usePermissions, hasPermission } from "@/lib/permissions/PermissionContext";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";

export interface PermissionButtonProps extends React.ComponentProps<typeof Button> {
  /**
   * Permission code required to perform this action (e.g. "project.create").
   * If omitted, button acts normally.
   */
  code?: string;
  /**
   * Behavior when the user does NOT possess the required permission.
   * - "hide": completely omits rendering the button from the DOM (default).
   * - "disable": renders button disabled, with tooltip and toast on interaction.
   */
  mode?: "hide" | "disable";
  /**
   * Custom tooltip message shown when disabled due to missing permission.
   */
  deniedTooltip?: string;
  /**
   * Custom toast message shown if unauthorized user attempts to trigger the action.
   */
  deniedToast?: string;
  /**
   * Optional fallback node to render when hidden.
   */
  fallback?: React.ReactNode;
  /**
   * Next.js link or polymorphic render node support.
   */
  render?: React.ReactElement;
}

/**
 * PermissionButton: Interactive action button with enterprise-grade permission gating.
 * Prevents unauthorized action dispatches with rich Sonner toast feedback and disabled states.
 */
export const PermissionButton = React.forwardRef<HTMLButtonElement, PermissionButtonProps>(
  (
    {
      code,
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
    const permissions = usePermissions();
    const isAllowed = !code || hasPermission(permissions, code);

    if (!isAllowed) {
      if (mode === "hide") {
        return <>{fallback}</>;
      }

      const defaultTooltip = deniedTooltip || "You do not have permission to perform this action.";
      const defaultToast = deniedToast || `Access Denied: Missing "${code || "required"}" permission.`;

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

PermissionButton.displayName = "PermissionButton";
