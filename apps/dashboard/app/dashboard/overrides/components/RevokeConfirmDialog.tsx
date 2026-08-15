"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { AlertTriangle, Loader2 } from "lucide-react";

interface RevokeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
}

export function RevokeConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
}: RevokeConfirmDialogProps) {
  const [isRevoking, setIsRevoking] = React.useState(false);

  const handleConfirm = async () => {
    setIsRevoking(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="gap-2">
          <div className="size-10 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="size-5" />
          </div>
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRevoking}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isRevoking}
          >
            {isRevoking ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> Revoking...
              </>
            ) : (
              "Confirm Revocation"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
