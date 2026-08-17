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
import type { TeamItem } from "@workspace/shared";
import { AlertTriangle, Loader2 } from "lucide-react";

interface DeleteTeamDialogProps {
  team: TeamItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteTeamDialog({
  team,
  open,
  onOpenChange,
  onSuccess,
}: DeleteTeamDialogProps) {
  const [loading, setLoading] = React.useState(false);

  if (!team) return null;

  const activeMembersCount = team._count?.members || team.members?.length || 0;

  const handleDeactivate = async () => {
    setLoading(true);
    try {
      await api.delete(`/teams/${team.id}`);
      toast.success(`Team "${team.name}" has been deactivated.`);
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to deactivate team.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            <AlertDialogTitle>Deactivate Team</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-2 pt-2 text-left">
            <p>
              Are you sure you want to deactivate team{" "}
              <strong className="text-foreground">{team.name}</strong> (
              <span className="font-mono text-xs">{team.slug}</span>)?
            </p>
            {activeMembersCount > 0 && (
              <div className="rounded-md bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 border border-amber-500/20">
                ⚠️ This team currently has{" "}
                <strong>{activeMembersCount} active member(s)</strong>. Deactivating
                the team will archive its operational status, but historical assignment
                records and membership logs will be preserved.
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDeactivate();
            }}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Deactivating...
              </>
            ) : (
              "Deactivate Team"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
