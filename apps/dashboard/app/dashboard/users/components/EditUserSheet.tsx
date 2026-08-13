"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Button } from "@workspace/ui/components/button";
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
import type { AdminUser } from "./UserTable";

interface EditUserSheetProps {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  designations: { id: string; name: string; code: string }[];
  onSuccess: () => void;
}

export function EditUserSheet({ user, open, onOpenChange, designations, onSuccess }: EditUserSheetProps) {
  const [systemRole, setSystemRole] = React.useState<"SuperAdmin" | "Admin" | "Staff">("Staff");
  const [designationId, setDesignationId] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (user) {
      setSystemRole(user.systemRole);
      setDesignationId(user.designationId || user.designation?.id || "");
      setIsActive(user.isActive);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    try {
      await api.patch(`/admin/users/${user.id}`, {
        systemRole,
        designationId: designationId || undefined,
        isActive,
      });

      toast.success("User updated successfully!");
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to update user");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit User Profile</SheetTitle>
          <SheetDescription>
            Update role and designation for {user.firstName} {user.lastName} ({user.email}).
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-6">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">System Role</Label>
            <Select value={systemRole} onValueChange={(val: any) => val && setSystemRole(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select system role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Staff">Staff</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="SuperAdmin">SuperAdmin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Designation</Label>
            <Select value={designationId} onValueChange={(val: any) => val && setDesignationId(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select designation" />
              </SelectTrigger>
              <SelectContent>
                {designations.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3 shadow-xs">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Active Account</Label>
              <p className="text-xs text-muted-foreground">
                Disabled users cannot log in or perform API actions.
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
