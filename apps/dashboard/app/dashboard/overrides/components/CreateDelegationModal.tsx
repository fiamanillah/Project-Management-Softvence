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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface CreateDelegationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: { id: string; email: string; firstName?: string; lastName?: string }[];
  onSuccess: () => void;
}

export function CreateDelegationModal({
  open,
  onOpenChange,
  users,
  onSuccess,
}: CreateDelegationModalProps) {
  const [delegatorId, setDelegatorId] = React.useState("");
  const [delegateeId, setDelegateeId] = React.useState("");
  const [scope, setScope] = React.useState("*");
  const [validFrom, setValidFrom] = React.useState("");
  const [validUntil, setValidUntil] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delegatorId || !delegateeId) {
      toast.error("Please select both a delegator and delegatee");
      return;
    }
    if (delegatorId === delegateeId) {
      toast.error("Delegator and delegatee cannot be the same user");
      return;
    }
    if (!validFrom || !validUntil) {
      toast.error("Please specify valid start and end dates");
      return;
    }

    setIsLoading(true);
    try {
      await api.post("/admin/delegations", {
        delegatorId,
        delegateeId,
        scope: scope || "*",
        validFrom: new Date(validFrom).toISOString(),
        validUntil: new Date(validUntil).toISOString(),
      });

      toast.success("Delegation created successfully");
      onOpenChange(false);
      onSuccess();
      setDelegatorId("");
      setDelegateeId("");
      setScope("*");
      setValidFrom("");
      setValidUntil("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create delegation");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Delegation</DialogTitle>
          <DialogDescription>
            Temporarily delegate a user's permissions to another employee for a specific validity window.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Delegator (Owner of permissions)</Label>
            <Select value={delegatorId} onValueChange={(val: any) => val && setDelegatorId(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select delegator" />
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
            <Label className="text-xs font-medium">Delegatee (Recipient)</Label>
            <Select value={delegateeId} onValueChange={(val: any) => val && setDelegateeId(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select delegatee" />
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
            <Label className="text-xs font-medium">Scope Boundary</Label>
            <Input
              placeholder="*"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Valid From</Label>
              <Input
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Valid Until</Label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Create Delegation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
