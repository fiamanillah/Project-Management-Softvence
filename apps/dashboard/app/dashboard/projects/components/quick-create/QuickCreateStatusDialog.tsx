"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { api, handleFormApiError } from "@/lib/api";
import { toast } from "sonner";
import type { CreateQuickStatusDTO, ProjectStatusItem } from "@workspace/shared";
import { Activity, Loader2 } from "lucide-react";

export interface QuickCreateStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newStatus: ProjectStatusItem) => void;
}

export function QuickCreateStatusDialog({
  open,
  onOpenChange,
  onSuccess,
}: QuickCreateStatusDialogProps) {
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [color, setColor] = React.useState("#3b82f6");
  const [requiresAction, setRequiresAction] = React.useState(false);
  const [isTerminal, setIsTerminal] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      setName("");
      setCode("");
      setColor("#3b82f6");
      setRequiresAction(false);
      setIsTerminal(false);
      setFieldErrors({});
    }
  }, [open]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    setCode(val.toUpperCase().replace(/[^A-Z0-9]/g, "_"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFieldErrors({ name: "Status name is required" });
      return;
    }

    setLoading(true);
    setFieldErrors({});
    try {
      const payload: CreateQuickStatusDTO = {
        name: name.trim(),
        code: code.trim() || undefined,
        color,
        requiresAction,
        isTerminal,
      };
      const res = await api.post("/projects/lookups/statuses", payload);
      const created = res?.data || res;
      toast.success(`Project Status "${created.name}" created`);
      onOpenChange(false);
      onSuccess(created);
    } catch (err: any) {
      const general = handleFormApiError(err, (field, errObj) => {
        setFieldErrors((prev) => ({ ...prev, [field]: errObj.message }));
      });
      toast.error(general || "Failed to create status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-5">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
              <Activity className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Add Project Status</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Define a lifecycle status with behavioral flags
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Status Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={name}
              onChange={handleNameChange}
              placeholder="e.g. Under Client Review"
              required
              className="h-9 text-xs"
              autoFocus
            />
            {fieldErrors.name && (
              <p className="text-[11px] text-destructive">{fieldErrors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Code</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. CLIENT_REVIEW"
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Theme Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="size-9 rounded-md border cursor-pointer p-0.5"
                />
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t">
            <label className="flex items-center gap-2 p-2 rounded-lg border bg-muted/20 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={requiresAction}
                onChange={(e) => setRequiresAction(e.target.checked)}
                className="rounded border-input text-primary"
              />
              <span>Requires Action</span>
            </label>

            <label className="flex items-center gap-2 p-2 rounded-lg border bg-muted/20 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={isTerminal}
                onChange={(e) => setIsTerminal(e.target.checked)}
                className="rounded border-input text-primary"
              />
              <span>Terminal State</span>
            </label>
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading} className="text-xs gap-1.5">
              {loading ? (
                <>
                  <Loader2 className="size-3 animate-spin" /> Creating...
                </>
              ) : (
                "Save Status"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
