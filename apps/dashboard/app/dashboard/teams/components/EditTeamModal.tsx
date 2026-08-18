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
import { Switch } from "@workspace/ui/components/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { api, handleFormApiError } from "@/lib/api";
import { toast } from "sonner";
import { AvatarUpload } from "@/components/AvatarUpload";
import type { TeamItem, DepartmentItem } from "@workspace/shared";
import { Settings, Loader2, Building2, Clock } from "lucide-react";

interface EditTeamModalProps {
  team: TeamItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: DepartmentItem[];
  onSuccess: () => void;
}

export function EditTeamModal({
  team,
  open,
  onOpenChange,
  departments,
  onSuccess,
}: EditTeamModalProps) {
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [departmentId, setDepartmentId] = React.useState("");
  const [shift, setShift] = React.useState<string>("none");
  const [isActive, setIsActive] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const selectedDept = React.useMemo(() => {
    return departments.find((d) => d.id === departmentId);
  }, [departments, departmentId]);

  const SHIFT_LABELS: Record<string, string> = {
    Day: "Day Shift",
    Night: "Night Shift",
    Roster: "Roster / Rotational",
    Flexible: "Flexible Shift",
    none: "Not Specified",
  };

  React.useEffect(() => {
    if (open && team) {
      setName(team.name);
      setSlug(team.slug);
      setDepartmentId(team.departmentId);
      setShift(team.shift || "none");
      setIsActive(team.isActive);
      setFieldErrors({});
    }
  }, [open, team]);

  if (!team) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) return;
    setFieldErrors({});

    if (!name.trim()) {
      setFieldErrors((prev) => ({ ...prev, name: "Team name is required" }));
      return;
    }
    if (!departmentId) {
      setFieldErrors((prev) => ({ ...prev, departmentId: "Department is required" }));
      return;
    }

    setLoading(true);
    try {
      await api.patch(`/teams/${team.id}`, {
        name: name.trim(),
        slug: slug.trim() || undefined,
        departmentId,
        shift: shift !== "none" ? shift : null,
        isActive,
      });

      toast.success(`Team "${name.trim()}" updated successfully.`);
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      const msg = handleFormApiError(err, (field, errObj) => {
        setFieldErrors((prev) => ({ ...prev, [field]: errObj.message }));
      });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-2xl min-w-[min(100vw-2rem,600px)] sm:min-w-[660px] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Settings className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Edit Team Settings</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Update team metadata, department affiliation, and operational shift.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Team Avatar */}
          <div className="p-3.5 rounded-xl border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-0.5 text-center sm:text-left">
              <h4 className="text-xs font-semibold text-foreground">Team Logo & Avatar</h4>
              <p className="text-[11px] text-muted-foreground">
                Upload a distinctive avatar or logo for this team.
              </p>
            </div>
            <AvatarUpload
              currentAvatarUrl={team.avatarUrl}
              fallbackName={team.name}
              size="md"
              uploadEndpoint={`/teams/${team.id}/avatar`}
              removeEndpoint={`/teams/${team.id}/avatar`}
              onAvatarChange={() => {
                onSuccess();
              }}
              showHelpText={false}
            />
          </div>

          {/* Top Row: Name and Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Team Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Team Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Core Web Platform Team"
                className="text-xs h-9 w-full"
              />
              {fieldErrors.name && (
                <p className="text-[11px] text-destructive">{fieldErrors.name}</p>
              )}
            </div>

            {/* Team Slug */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Identifier Slug</Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                placeholder="core-web-platform-team"
                className="text-xs h-9 font-mono bg-muted/30 w-full"
              />
              {fieldErrors.slug && (
                <p className="text-[11px] text-destructive">{fieldErrors.slug}</p>
              )}
            </div>
          </div>

          {/* Department Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1">
              <Building2 className="size-3.5 text-muted-foreground" /> Department *
            </Label>
            <Select value={departmentId} onValueChange={(val: string | null) => setDepartmentId(val || "")}>
              <SelectTrigger className="text-xs h-9 w-full">
                <SelectValue placeholder="Select parent department...">
                  {selectedDept ? `${selectedDept.name} (${selectedDept.code})` : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="w-full">
                {departments
                  .filter((d) => d.isActive)
                  .map((dept) => (
                    <SelectItem key={dept.id} value={dept.id} className="text-xs">
                      {dept.name} ({dept.code})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {fieldErrors.departmentId && (
              <p className="text-[11px] text-destructive">{fieldErrors.departmentId}</p>
            )}
          </div>

          {/* Shift Selection & Active Status Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1">
                <Clock className="size-3.5 text-muted-foreground" /> Working Shift
              </Label>
              <Select value={shift} onValueChange={(val: string | null) => setShift(val || "none")}>
                <SelectTrigger className="text-xs h-9 w-full">
                  <SelectValue placeholder="Select shift...">
                    {shift ? SHIFT_LABELS[shift] || shift : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="w-full">
                  <SelectItem value="Day" className="text-xs">Day Shift</SelectItem>
                  <SelectItem value="Night" className="text-xs">Night Shift</SelectItem>
                  <SelectItem value="Roster" className="text-xs">Roster / Rotational</SelectItem>
                  <SelectItem value="Flexible" className="text-xs">Flexible Shift</SelectItem>
                  <SelectItem value="none" className="text-xs">Not Specified</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20 h-9">
              <div className="space-y-0.5">
                <Label className="text-xs font-medium cursor-pointer">Active Status</Label>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>

          <DialogFooter className="pt-3 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading} className="gap-1.5 font-medium">
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
