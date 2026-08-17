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
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import type { ProjectItem } from "@workspace/shared";

interface DeleteProjectDialogProps {
  project: ProjectItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteProjectDialog({
  project,
  open,
  onOpenChange,
  onSuccess,
}: DeleteProjectDialogProps) {
  const [loading, setLoading] = React.useState(false);

  if (!project) return null;

  const handleDelete = async () => {
    setLoading(true);
    try {
      await api.delete(`/projects/${project.id}`);
      toast.success(`Project '${project.projectName}' deleted successfully`);
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex size-11 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-2">
            <Trash2 className="size-6" />
          </div>
          <AlertDialogTitle className="text-base font-bold">
            Delete Project?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-muted-foreground space-y-2">
            <span>
              Are you sure you want to soft-delete project{" "}
              <strong className="text-foreground">{project.projectName}</strong> (
              <code className="font-mono text-xs text-foreground">{project.orderId}</code>)?
            </span>
            <span className="block text-[11px] text-muted-foreground pt-1">
              This action soft-deletes the project from active views while preserving audit logs and historical assignment records.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel disabled={loading} className="text-xs">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs gap-1.5"
          >
            {loading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Deleting...
              </>
            ) : (
              "Delete Project"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
