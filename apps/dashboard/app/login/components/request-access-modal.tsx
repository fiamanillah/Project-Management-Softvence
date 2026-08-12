"use client"

import * as React from "react"
import { Button } from "@workspace/ui/components/button"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Building2, Info, Briefcase } from "lucide-react"

interface RequestAccessModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RequestAccessModal({
  open,
  onOpenChange,
}: RequestAccessModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Building2 className="size-4 text-primary" />
            Request Access
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Direct sign-up is disabled for this workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <Alert className="bg-muted/50 border border-muted-foreground/15 text-xs py-2 px-3">
            <Info className="size-4 text-primary shrink-0 mt-0.5" />
            <AlertDescription className="text-muted-foreground text-xs">
              Accounts are provisioned by invitation only. Contact your organization administrator or IT department to request an invitation.
            </AlertDescription>
          </Alert>

          <div className="p-3 rounded-lg bg-muted/60 text-xs space-y-1">
            <div className="font-medium text-foreground flex items-center gap-1.5">
              <Briefcase className="size-3.5 text-primary" /> Enterprise Onboarding
            </div>
            <div className="text-muted-foreground text-[11px]">
              Email support at{" "}
              <span className="text-primary font-medium underline">
                support@softvence.com
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            className="w-full text-xs"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
