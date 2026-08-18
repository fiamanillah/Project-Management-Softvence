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
import type { CreateQuickServiceLineDTO, ServiceLineItem } from "@workspace/shared";
import { Layers, Loader2 } from "lucide-react";

export interface QuickCreateServiceLineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newServiceLine: ServiceLineItem) => void;
}

export function QuickCreateServiceLineDialog({
  open,
  onOpenChange,
  onSuccess,
}: QuickCreateServiceLineDialogProps) {
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      setName("");
      setSlug("");
      setFieldErrors({});
    }
  }, [open]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFieldErrors({ name: "Service line name is required" });
      return;
    }

    setLoading(true);
    setFieldErrors({});
    try {
      const payload: CreateQuickServiceLineDTO = {
        name: name.trim(),
        slug: slug.trim() || undefined,
      };
      const res = await api.post("/projects/lookups/service-lines", payload);
      const created = res?.data || res;
      toast.success(`Service Line "${created.name}" created`);
      onOpenChange(false);
      onSuccess(created);
    } catch (err: any) {
      const general = handleFormApiError(err, (field, errObj) => {
        setFieldErrors((prev) => ({ ...prev, [field]: errObj.message }));
      });
      toast.error(general || "Failed to create service line");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-5">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <Layers className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Add Service Line</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Categorize technical domain (e.g. AI Engineering, DevOps)
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Service Line Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={name}
              onChange={handleNameChange}
              placeholder="e.g. Cybersecurity Audit"
              required
              className="h-9 text-xs"
              autoFocus
            />
            {fieldErrors.name && (
              <p className="text-[11px] text-destructive">{fieldErrors.name}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Slug Identifier</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              placeholder="e.g. cybersecurity-audit"
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
                "Save Service Line"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
