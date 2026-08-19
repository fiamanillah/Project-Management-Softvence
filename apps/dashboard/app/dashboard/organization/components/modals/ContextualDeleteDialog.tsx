"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Loader2, AlertTriangle, AlertCircle, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { api, getErrorMessage } from "@/lib/api";
import type { UnifiedOrgNode } from "@workspace/shared";

interface ContextualDeleteDialogProps {
  node: UnifiedOrgNode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ContextualDeleteDialog({
  node,
  open,
  onOpenChange,
  onSuccess,
}: ContextualDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setErrorMessage(null);
    }
  }, [open, node]);

  const isBranch = node?.type === "BRANCH";
  const isDepartment = node?.type === "DEPARTMENT";
  const isTeam = node?.type === "TEAM";

  const hasChildren = (node?.children?.length ?? 0) > 0;
  const childCount = node?.children?.length ?? 0;

  const handleDelete = async () => {
    if (!node || hasChildren) return;
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      if (isBranch) {
        await api.delete(`/organization/branches/${node.id}`);
      } else if (isDepartment) {
        await api.delete(`/organization/departments/${node.id}`);
      } else {
        await api.delete(`/organization/teams/${node.id}`);
      }

      toast.success(`${node.type} '${node.name}' deleted successfully.`);
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const msg = getErrorMessage(err, "Failed to delete organizational unit");
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" /> Delete {node?.type}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 pt-1 text-left">
            <span>
              Are you sure you want to delete {node?.type.toLowerCase()}{" "}
              <strong className="text-foreground">{node?.name}</strong> (
              <span className="font-mono text-primary font-semibold">{node?.code}</span>)?
            </span>

            {/* In-Dialog Error Feedback from API */}
            {errorMessage && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-destructive flex items-start gap-2.5">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <div className="flex-1 text-xs leading-relaxed font-medium">
                  {errorMessage}
                </div>
              </div>
            )}

            {/* Proactive Dependencies Warning Banner */}
            {hasChildren ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-300 flex items-start gap-2.5">
                <ShieldAlert className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div className="flex-1 text-xs space-y-1">
                  <p className="font-semibold text-amber-800 dark:text-amber-200">
                    Cannot delete unit with active nested dependencies
                  </p>
                  <p className="text-amber-700/90 dark:text-amber-300/90">
                    This {node?.type.toLowerCase()} currently contains{" "}
                    <strong>
                      {childCount} nested {isBranch ? "department/sub-branch" : isDepartment ? "team/sub-dept" : "member"} unit{childCount === 1 ? "" : "s"}
                    </strong>
                    . You can deactivate this unit instead, or delete/reassign its nested child units first.
                  </p>
                </div>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground block">
                This action is permanent and will update hierarchy tree paths.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-2">
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isDeleting || hasChildren}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            Confirm Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
