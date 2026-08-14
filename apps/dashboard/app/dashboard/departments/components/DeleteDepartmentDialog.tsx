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
import type { DepartmentItem } from "@workspace/shared";

interface DeleteDepartmentDialogProps {
  department: DepartmentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteDepartmentDialog({
  department,
  open,
  onOpenChange,
  onSuccess,
}: DeleteDepartmentDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setErrorMessage(null);
    }
  }, [open, department]);

  const activeDesignationsCount = department?._count?.designations ?? 0;
  const activeTeamsCount = department?._count?.teams ?? 0;
  const subDepartmentsCount = department?._count?.subDepartments ?? 0;
  const hasDependencies =
    activeDesignationsCount > 0 || activeTeamsCount > 0 || subDepartmentsCount > 0;

  const handleDelete = async () => {
    if (!department || hasDependencies) return;
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      const res = await api.delete(`/organization/departments/${department.id}`);
      toast.success(res?.message || `Department '${department.name}' deleted successfully.`);
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const msg = getErrorMessage(err, "Failed to delete department");
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
            <AlertTriangle className="size-5" /> Delete Department
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 pt-1 text-left">
            <span>
              Are you sure you want to delete department{" "}
              <strong className="text-foreground">{department?.name}</strong> (
              <span className="font-mono text-primary font-semibold">{department?.code}</span>)?
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
                    Cannot delete department with dependencies
                  </p>
                  <p className="text-amber-700/90 dark:text-amber-300/90">
                    This department contains{" "}
                    {subDepartmentsCount > 0 && (
                      <>
                        <strong>
                          {subDepartmentsCount} sub-department{subDepartmentsCount === 1 ? "" : "s"}
                        </strong>
                        {activeDesignationsCount > 0 || activeTeamsCount > 0 ? ", " : ""}
                      </>
                    )}
                    {activeDesignationsCount > 0 && (
                      <>
                        <strong>
                          {activeDesignationsCount} designation{activeDesignationsCount === 1 ? "" : "s"}
                        </strong>
                        {activeTeamsCount > 0 ? ", and " : ""}
                      </>
                    )}
                    {activeTeamsCount > 0 && (
                      <strong>
                        {activeTeamsCount} team{activeTeamsCount === 1 ? "" : "s"}
                      </strong>
                    )}
                    . You can deactivate this department instead, or delete/reassign its sub-departments, designations, and teams first.
                  </p>
                </div>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground block">
                This action is permanent and cannot be undone.
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
            {isDeleting && <Loader2 className="mr-2 size-4 animate-spin" />}
            {hasDependencies ? "Cannot Delete (Has Dependencies)" : "Delete Department"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
