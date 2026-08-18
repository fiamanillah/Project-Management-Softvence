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
import type { CreateQuickPlatformDTO, PlatformItem } from "@workspace/shared";
import { Globe, Loader2 } from "lucide-react";

export interface QuickCreatePlatformDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newPlatform: PlatformItem) => void;
}

export function QuickCreatePlatformDialog({
  open,
  onOpenChange,
  onSuccess,
}: QuickCreatePlatformDialogProps) {
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      setName("");
      setCode("");
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
      setFieldErrors({ name: "Platform name is required" });
      return;
    }

    setLoading(true);
    setFieldErrors({});
    try {
      const payload: CreateQuickPlatformDTO = {
        name: name.trim(),
        code: code.trim() || undefined,
      };
      const res = await api.post("/projects/lookups/platforms", payload);
      const created = res?.data || res;
      toast.success(`Platform "${created.name}" created`);
      onOpenChange(false);
      onSuccess(created);
    } catch (err: any) {
      const general = handleFormApiError(err, (field, errObj) => {
        setFieldErrors((prev) => ({ ...prev, [field]: errObj.message }));
      });
      toast.error(general || "Failed to create platform");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-5">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
              <Globe className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Add Origin Platform</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Register a new client acquisition channel or marketplace
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Platform Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={name}
              onChange={handleNameChange}
              placeholder="e.g. LinkedIn Leads"
              required
              className="h-9 text-xs"
              autoFocus
            />
            {fieldErrors.name && (
              <p className="text-[11px] text-destructive">{fieldErrors.name}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Identifier Code</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. LINKEDIN_LEADS"
              className="h-9 text-xs font-mono"
            />
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
                "Save Platform"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
