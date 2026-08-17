"use client";

import * as React from "react";
import Link from "next/link";
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
import { Loader2, AlertTriangle, AlertCircle, Users, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { api, getErrorMessage } from "@/lib/api";
import type { RoleItem } from "./RoleTable";

interface DeleteRoleDialogProps {
  role: RoleItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteRoleDialog({
  role,
  open,
  onOpenChange,
  onSuccess,
}: DeleteRoleDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setErrorMessage(null);
    }
  }, [open, role]);

  const activeUsersCount = role?._count?.users ?? 0;
  const hasActiveUsers = activeUsersCount > 0;

  const handleDelete = async () => {
    if (!role || hasActiveUsers) return;
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      const res = await api.delete(`/organization/roles/${role.id}`);
      toast.success(res?.message || `Role '${role.name}' deleted successfully.`);
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const msg = getErrorMessage(err, "Failed to delete role");
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
            <AlertTriangle className="size-5" /> Delete Security Role
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 pt-1 text-left">
            <span>
              Are you sure you want to delete role{" "}
              <strong className="text-foreground">{role?.name}</strong> (
              <span className="font-mono text-primary font-semibold">{role?.code}</span>)?
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

            {/* Proactive Active Users Warning Banner */}
            {hasActiveUsers ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-300 flex items-start gap-2.5">
                <Users className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div className="flex-1 text-xs space-y-1.5">
                  <p className="font-semibold text-amber-800 dark:text-amber-200">
                    Cannot delete assigned role
                  </p>
                  <p className="text-amber-700/90 dark:text-amber-300/90">
                    This role is currently assigned to{" "}
                    <strong>
                      {activeUsersCount} active user{activeUsersCount === 1 ? "" : "s"}
                    </strong>
                    . Please reassign those users in User Management before deleting.
                  </p>
                  <div className="pt-0.5">
                    <Link
                      href="/dashboard/users"
                      onClick={() => onOpenChange(false)}
                      className="inline-flex items-center gap-1 font-semibold text-amber-800 dark:text-amber-200 hover:underline"
                    >
                      <span>Go to User Management</span>
                      <ExternalLink className="size-3" />
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground block">
                This action will permanently delete the role and its associated permission matrix configurations.
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
            disabled={isDeleting || hasActiveUsers}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting && <Loader2 className="mr-2 size-4 animate-spin" />}
            {hasActiveUsers ? "Cannot Delete (Users Assigned)" : "Delete Role"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
