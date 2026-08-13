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
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface CreateOverrideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: { id: string; email: string; firstName?: string; lastName?: string }[];
  permissions: { id: string; code: string; module: string; description: string }[];
  onSuccess: () => void;
}

export function CreateOverrideModal({
  open,
  onOpenChange,
  users,
  permissions,
  onSuccess,
}: CreateOverrideModalProps) {
  const [userId, setUserId] = React.useState("");
  const [permissionId, setPermissionId] = React.useState("");
  const [isDeny, setIsDeny] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [expiresAt, setExpiresAt] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !permissionId) {
      toast.error("Please select both a user and a permission");
      return;
    }

    setIsLoading(true);
    try {
      await api.post("/users/overrides", {
        userId,
        permissionId,
        isDeny,
        reason: reason || undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });

      toast.success(`User permission ${isDeny ? "DENIED" : "GRANTED"} override created successfully`);
      onOpenChange(false);
      onSuccess();
      setUserId("");
      setPermissionId("");
      setIsDeny(false);
      setReason("");
      setExpiresAt("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create override");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create User Override</DialogTitle>
          <DialogDescription>
            Hand-grant or explicitly deny a specific permission code for a user without changing their designation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Select User</Label>
            <Select value={userId} onValueChange={(val: any) => val && setUserId(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select target user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.firstName || u.lastName ? `${u.firstName || ""} ${u.lastName || ""}` : u.email} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Permission Code</Label>
            <Select value={permissionId} onValueChange={(val: any) => val && setPermissionId(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select permission to override" />
              </SelectTrigger>
              <SelectContent>
                {permissions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.code} ({p.module})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3 shadow-xs bg-accent/20">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold">Explicit Deny Flag (`is_deny`)</Label>
              <p className="text-xs text-muted-foreground">
                Deny overrides short-circuit and win over any existing designation grants.
              </p>
            </div>
            <Switch checked={isDeny} onCheckedChange={setIsDeny} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Reason / Note</Label>
            <Input
              placeholder="e.g. Temporary security revocation"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Expiry Date (Optional)</Label>
            <Input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Create Override
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
