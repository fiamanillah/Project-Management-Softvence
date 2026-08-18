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
import { Textarea } from "@workspace/ui/components/textarea";
import { api, handleFormApiError } from "@/lib/api";
import { toast } from "sonner";
import type { CreateQuickOrderSourceDTO, OrderSourceItem } from "@workspace/shared";
import { Tag, Loader2 } from "lucide-react";

export interface QuickCreateOrderSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newOrderSource: OrderSourceItem) => void;
}

export function QuickCreateOrderSourceDialog({
  open,
  onOpenChange,
  onSuccess,
}: QuickCreateOrderSourceDialogProps) {
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      setName("");
      setCode("");
      setDescription("");
      setFieldErrors({});
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFieldErrors({ name: "Order source name is required" });
      return;
    }

    setLoading(true);
    setFieldErrors({});
    try {
      const payload: CreateQuickOrderSourceDTO = {
        name: name.trim(),
        code: code.trim() || undefined,
        description: description.trim() || undefined,
      };

      const res = await api.post("/projects/lookups/order-sources", payload);
      toast.success(`Order Source "${name}" created successfully`);
      onOpenChange(false);
      onSuccess(res as OrderSourceItem);
    } catch (err: any) {
      handleFormApiError(err, (field, errObj) => {
        setFieldErrors((prev) => ({ ...prev, [field]: errObj.message }));
      }, "Failed to create order source");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-5 border shadow-xl rounded-xl">
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Tag className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">New Order Source</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Add an inbound order origin or acquisition channel on demand
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Source Name <span className="text-destructive">*</span>
            </Label>
            <Input
              autoFocus
              placeholder="e.g. Conversion/Query, Bid/Proposal Order, Fixed Client"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!code || code === name.toUpperCase().replace(/[^A-Z0-9]/g, "_")) {
                  setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "_"));
                }
              }}
              className="h-9 text-xs"
              aria-invalid={!!fieldErrors.name}
            />
            {fieldErrors.name && (
              <p className="text-[11px] text-destructive">{fieldErrors.name}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Source Identifier Code (Optional)</Label>
            <Input
              placeholder="e.g. CONVERSION_QUERY"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="h-9 text-xs font-mono uppercase"
              aria-invalid={!!fieldErrors.code}
            />
            {fieldErrors.code && (
              <p className="text-[11px] text-destructive">{fieldErrors.code}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Description (Optional)</Label>
            <Textarea
              placeholder="Context or channel notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs min-h-[60px]"
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
                "Save Order Source"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
