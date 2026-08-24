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
import { Loader2, AlertTriangle } from "lucide-react";
import type { StationItem } from "@workspace/shared";
import { useStationSession } from "@/lib/station/StationContext";

interface DeleteStationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  station: StationItem | null;
  onSuccess: () => void;
}

export function DeleteStationDialog({
  open,
  onOpenChange,
  station,
  onSuccess,
}: DeleteStationDialogProps) {
  const { activeContext, leaveStation } = useStationSession();
  const [loading, setLoading] = React.useState(false);

  if (!station) return null;

  const isCurrent = activeContext?.station?.id === station.id;
  const activeProfilesCount = station.activeProfilesCount ?? station.activeProfiles?.length ?? 0;
  const activeUsersCount = station.activeUsersCount ?? station.assignedUsers?.length ?? 0;

  const handleDelete = async () => {
    setLoading(true);
    try {
      if (isCurrent) {
        await leaveStation();
      }
      await api.delete(`/stations/${station.id}`);
      toast.success(`Workstation "${station.name}" deleted successfully.`);
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete station");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-full max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <AlertDialogTitle className="text-base font-bold">
                Delete Workstation: {station.name}?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground mt-0.5">
                Are you sure you want to soft-delete workstation ({station.code})?
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="p-3 my-2 rounded-lg bg-destructive/[0.05] border border-destructive/20 text-xs text-destructive space-y-1">
          <p className="font-semibold">Important Considerations:</p>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-muted-foreground">
            {activeProfilesCount > 0 && (
              <li>
                <strong>{activeProfilesCount} platform profile(s)</strong> are currently hosted. They will be unassigned.
              </li>
            )}
            {activeUsersCount > 0 && (
              <li>
                <strong>{activeUsersCount} operator(s)</strong> will lose their workstation assignment.
              </li>
            )}
            {isCurrent && (
              <li className="text-destructive font-medium">
                You are currently working in an active shift on this station. Your session will be closed immediately.
              </li>
            )}
          </ul>
        </div>

        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={loading}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-1.5"
          >
            {loading && <Loader2 className="size-3.5 animate-spin" />}
            Delete Station
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
