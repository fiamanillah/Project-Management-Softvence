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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { api, handleFormApiError } from "@/lib/api";
import { toast } from "sonner";
import type { PlatformItem, CreateQuickProfileDTO, ProfileItem } from "@workspace/shared";
import { Globe, Loader2 } from "lucide-react";

export interface QuickCreateProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platforms: PlatformItem[];
  defaultPlatformId?: string;
  onSuccess: (newProfile: ProfileItem) => void;
}

export function QuickCreateProfileDialog({
  open,
  onOpenChange,
  platforms,
  defaultPlatformId,
  onSuccess,
}: QuickCreateProfileDialogProps) {
  const [username, setUsername] = React.useState("");
  const [platformId, setPlatformId] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      setUsername("");
      setPlatformId(defaultPlatformId || platforms[0]?.id || "");
      setFieldErrors({});
    }
  }, [open, defaultPlatformId, platforms]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setFieldErrors({ username: "Username / handle is required" });
      return;
    }
    if (!platformId) {
      setFieldErrors({ platformId: "Platform is required" });
      return;
    }

    setLoading(true);
    setFieldErrors({});
    try {
      const payload: CreateQuickProfileDTO = {
        username: username.trim(),
        platformId,
        isActive: true,
      };
      const res = await api.post("/projects/lookups/profiles", payload);
      const created = res?.data || res;
      toast.success(`Account Profile "${created.username}" registered`);
      onOpenChange(false);
      onSuccess(created);
    } catch (err: any) {
      const general = handleFormApiError(err, (field, errObj) => {
        setFieldErrors((prev) => ({ ...prev, [field]: errObj.message }));
      });
      toast.error(general || "Failed to create profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-5">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <Globe className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Add Account Profile</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Link an agency/freelancer seller profile on a platform
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Origin Platform <span className="text-destructive">*</span>
            </Label>
            <Select value={platformId} onValueChange={(val: string | null) => setPlatformId(val || "")}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select Platform">
                  {platforms.find((p) => p.id === platformId)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {platforms.map((pl) => (
                  <SelectItem key={pl.id} value={pl.id} className="text-xs">
                    {pl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.platformId && (
              <p className="text-[11px] text-destructive">{fieldErrors.platformId}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Profile Username / Handle <span className="text-destructive">*</span>
            </Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. Softvence_Upwork"
              required
              className="h-9 text-xs"
              autoFocus
            />
            {fieldErrors.username && (
              <p className="text-[11px] text-destructive">{fieldErrors.username}</p>
            )}
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
                "Save Profile"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
