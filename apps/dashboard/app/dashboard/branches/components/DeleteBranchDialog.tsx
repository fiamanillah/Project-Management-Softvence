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
import type { BranchItem } from "@workspace/shared";

interface DeleteBranchDialogProps {
  branch: BranchItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteBranchDialog({
  branch,
  open,
  onOpenChange,
  onSuccess,
}: DeleteBranchDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setErrorMessage(null);
    }
  }, [open, branch]);

  const subBranchesCount = branch?._count?.subBranches ?? 0;
  const departmentsCount = branch?._count?.departments ?? 0;
  const hasDependencies = subBranchesCount > 0 || departmentsCount > 0;

  const handleDelete = async () => {
    if (!branch || hasDependencies) return;
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      const res = await api.delete(`/organization/branches/${branch.id}`);
      toast.success(res?.message || `Branch '${branch.name}' deleted successfully.`);
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const msg = getErrorMessage(err, "Failed to delete branch");
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
            <AlertTriangle className="size-5" /> Delete Branch
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 pt-1 text-left">
            <span>
              Are you sure you want to delete branch{" "}
              <strong className="text-foreground">{branch?.name}</strong> (
              <span className="font-mono text-primary font-semibold">{branch?.code}</span>)?
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
            {hasDependencies ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-300 flex items-start gap-2.5">
                <ShieldAlert className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div className="flex-1 text-xs space-y-1">
                  <p className="font-semibold text-amber-800 dark:text-amber-200">
                    Cannot delete branch with active child dependencies
                  </p>
                  <p className="text-amber-700/90 dark:text-amber-300/90">
                    This branch currently contains{" "}
                    {subBranchesCount > 0 && (
                      <>
                        <strong>
                          {subBranchesCount} nested sub-branch{subBranchesCount === 1 ? "" : "es"}
                        </strong>
                        {departmentsCount > 0 ? ", and " : ""}
                      </>
                    )}
                    {departmentsCount > 0 && (
                      <strong>
                        {departmentsCount} hosted department{departmentsCount === 1 ? "" : "s"}
                      </strong>
                    )}
                    . You can deactivate this branch instead, or reassign/delete its sub-branches and departments first.
                  </p>
                </div>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground block">
                This action will soft-delete the branch and invalidate active session tokens.
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
            disabled={isDeleting || hasDependencies}
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
