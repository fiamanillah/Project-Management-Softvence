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
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
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

  const handleDelete = async () => {
    if (!department) return;
    setIsDeleting(true);
    try {
      const res = await api.delete(`/organization/departments/${department.id}`);
      toast.success(res?.message || `Department '${department.name}' deleted successfully.`);
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      if (err.data?.message) {
        toast.error(err.data.message);
      } else {
        toast.error(err.message || "Failed to delete department");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" /> Delete Department
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span>
              Are you sure you want to delete department{" "}
              <strong className="text-foreground">{department?.name}</strong> (
              <span className="font-mono text-primary">{department?.code}</span>)?
            </span>
            <br />
            <span className="text-xs text-muted-foreground block mt-1">
              Note: Departments containing active designations or teams cannot be deleted. You can deactivate them instead.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {isDeleting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Delete Department
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
