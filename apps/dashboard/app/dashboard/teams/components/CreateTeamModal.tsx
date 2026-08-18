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
import { Badge } from "@workspace/ui/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { UserSearchSelect, type UserItem } from "@/components/user-search-select";
import { AvatarUpload } from "@/components/AvatarUpload";
import { api, handleFormApiError } from "@/lib/api";
import { toast } from "sonner";
import type { DepartmentItem, AssignmentRoleItem } from "@workspace/shared";
import {
  UsersRound,
  Loader2,
  Sparkles,
  Building2,
  Clock,
  UserPlus,
  Crown,
  Trash2,
} from "lucide-react";

interface CreateTeamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: DepartmentItem[];
  defaultDepartmentId?: string | null;
  onSuccess: () => void;
}

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

interface InitialMemberDraft {
  userId: string;
  userObj: UserItem | null;
  roleId: string;
  note?: string;
}

export function CreateTeamModal({
  open,
  onOpenChange,
  departments,
  defaultDepartmentId,
  onSuccess,
}: CreateTeamModalProps) {
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [departmentId, setDepartmentId] = React.useState("");
  const [shift, setShift] = React.useState<string>("Day");
  const [isActive, setIsActive] = React.useState(true);
  const [isCustomSlug, setIsCustomSlug] = React.useState(false);
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  // Initial Members & Roles
  const [roles, setRoles] = React.useState<AssignmentRoleItem[]>([]);
  const [initialMembers, setInitialMembers] = React.useState<InitialMemberDraft[]>([]);
  const [draftUserId, setDraftUserId] = React.useState("");
  const [draftUserObj, setDraftUserObj] = React.useState<UserItem | null>(null);
  const [draftRoleId, setDraftRoleId] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setName("");
      setSlug("");
      setDepartmentId(defaultDepartmentId || (departments[0]?.id ?? ""));
      setShift("Day");
      setIsActive(true);
      setIsCustomSlug(false);
      setAvatarFile(null);
      setAvatarPreview(null);
      setFieldErrors({});
      setInitialMembers([]);
      setDraftUserId("");
      setDraftUserObj(null);

      // Fetch assignment roles
      api.get("/teams/roles")
        .then((resRoles) => {
          setRoles(resRoles || []);
          if (resRoles && resRoles.length > 0) {
            const leadRole = resRoles.find((r: any) => r.qualifiesForTeamScope) || resRoles[0];
            setDraftRoleId(leadRole.id);
          }
        })
        .catch(() => {});
    }
  }, [open, defaultDepartmentId, departments]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextName = e.target.value;
    setName(nextName);
    if (!isCustomSlug) {
      setSlug(slugify(nextName));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsCustomSlug(true);
    setSlug(slugify(e.target.value));
  };

  const handleAddDraftMember = () => {
    if (!draftUserId || !draftRoleId) {
      toast.error("Please select a user and an assignment role.");
      return;
    }
    if (initialMembers.some((m) => m.userId === draftUserId)) {
      toast.error("User is already in the initial members list.");
      return;
    }

    setInitialMembers((prev) => [
      ...prev,
      {
        userId: draftUserId,
        userObj: draftUserObj,
        roleId: draftRoleId,
      },
    ]);
    setDraftUserId("");
    setDraftUserObj(null);
  };

  const handleRemoveDraftMember = (userId: string) => {
    setInitialMembers((prev) => prev.filter((m) => m.userId !== userId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const created = await api.post("/teams", {
        name: name.trim(),
        slug: slug.trim() || undefined,
        departmentId,
        shift: shift !== "none" ? shift : null,
        isActive,
        initialMembers:
          initialMembers.length > 0
            ? initialMembers.map((m) => ({
                userId: m.userId,
                roleId: m.roleId,
                note: m.note || undefined,
              }))
            : undefined,
      });

      if (avatarFile && created?.id) {
        try {
          const formData = new FormData();
          formData.append("avatar", avatarFile);
          await api.upload(`/teams/${created.id}/avatar`, formData);
        } catch (uploadErr) {
          console.warn("Failed to upload initial team avatar:", uploadErr);
        }
      }

      toast.success(`Team "${name.trim()}" created successfully.`);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-2xl min-w-[min(100vw-2rem,600px)] sm:min-w-[660px] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <UsersRound className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Create New Team</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Set up an operational unit under a department to assign team leads and members.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Team Avatar Draft */}
          <div className="p-3.5 rounded-xl border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-0.5 text-center sm:text-left">
              <h4 className="text-xs font-semibold text-foreground">Team Logo & Avatar</h4>
              <p className="text-[11px] text-muted-foreground">
                Set an optional logo for this new team.
              </p>
            </div>
            <AvatarUpload
              currentAvatarUrl={avatarPreview}
              fallbackName={name || "New Team"}
              size="md"
              onUpload={async (file) => {
                setAvatarFile(file);
                const url = URL.createObjectURL(file);
                setAvatarPreview(url);
                return url;
              }}
              onRemove={async () => {
                setAvatarFile(null);
                setAvatarPreview(null);
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
                onChange={handleNameChange}
                placeholder="e.g. Core Web Platform Team"
                className="text-xs h-9 w-full"
                autoFocus
              />
              {fieldErrors.name && (
                <p className="text-[11px] text-destructive">{fieldErrors.name}</p>
              )}
            </div>

            {/* Team Slug */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Identifier Slug</Label>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                  <Sparkles className="size-3 text-amber-500" /> Auto
                </span>
              </div>
              <Input
                value={slug}
                onChange={handleSlugChange}
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
              <Select value={shift} onValueChange={(val: string | null) => setShift(val || "Day")}>
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

          {/* Optional: Add Initial Members Section */}
          <div className="rounded-xl border bg-card p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <UserPlus className="size-3.5 text-primary" />
                <span>Initial Team Members (Optional)</span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                Assign leads or members now, or manage anytime later
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
              <div className="sm:col-span-6 space-y-1">
                <Label className="text-[11px] font-medium text-muted-foreground">Select User</Label>
                <UserSearchSelect
                  value={draftUserId}
                  onValueChange={(id, u) => {
                    setDraftUserId(id);
                    setDraftUserObj(u);
                  }}
                  excludeUserIds={initialMembers.map((m) => m.userId)}
                  placeholder="Select user..."
                  triggerClassName="h-8 text-xs"
                />
              </div>

              <div className="sm:col-span-4 space-y-1">
                <Label className="text-[11px] font-medium text-muted-foreground">Role</Label>
                <Select value={draftRoleId} onValueChange={(v: string | null) => setDraftRoleId(v || "")}>
                  <SelectTrigger className="h-8 text-xs w-full">
                    <SelectValue placeholder="Role...">
                      {roles.find((r) => r.id === draftRoleId)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id} className="text-xs">
                        <div className="flex items-center gap-1.5">
                          {r.qualifiesForTeamScope && <Crown className="size-3 text-amber-500" />}
                          <span>{r.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddDraftMember}
                  disabled={!draftUserId || !draftRoleId}
                  className="w-full h-8 text-xs"
                >
                  Add
                </Button>
              </div>
            </div>

            {/* List of Initial Members */}
            {initialMembers.length > 0 && (
              <div className="divide-y rounded-md border bg-muted/20 overflow-hidden mt-2">
                {initialMembers.map((m) => {
                  const roleObj = roles.find((r) => r.id === m.roleId);
                  return (
                    <div key={m.userId} className="p-2 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-foreground truncate">
                          {m.userObj?.firstName} {m.userObj?.lastName}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate">
                          ({m.userObj?.email})
                        </span>
                        {m.userObj?.designation?.name && (
                          <Badge variant="outline" className="text-[10px] py-0">
                            {m.userObj.designation.name}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-[10px] py-0 gap-1">
                          {roleObj?.qualifiesForTeamScope && <Crown className="size-2.5 text-amber-500" />}
                          {roleObj?.name}
                        </Badge>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveDraftMember(m.userId)}
                        className="size-6 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 gap-2">
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
                  <Loader2 className="size-4 animate-spin" /> Creating...
                </>
              ) : (
                "Create Team"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
