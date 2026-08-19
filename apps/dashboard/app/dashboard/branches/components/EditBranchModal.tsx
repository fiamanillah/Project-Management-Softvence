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
import { Textarea } from "@workspace/ui/components/textarea";
import { Switch } from "@workspace/ui/components/switch";
import {
  FieldSet,
  FieldGroup,
  Field,
  FieldLabel,
  FieldError,
} from "@workspace/ui/components/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Loader2, Pencil, GitBranch, MapPin, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { api, getErrorMessage } from "@/lib/api";
import { updateBranchSchema, type BranchItem } from "@workspace/shared";
import { HelpTooltip } from "@/components/HelpTooltip";
import { ScrollArea } from "@workspace/ui/components/scroll-area";

interface EditBranchModalProps {
  branch: BranchItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches?: BranchItem[];
  onSuccess: () => void;
}

export function EditBranchModal({
  branch,
  open,
  onOpenChange,
  branches = [],
  onSuccess,
}: EditBranchModalProps) {
  const [name, setName] = React.useState("");
  const [parentId, setParentId] = React.useState<string>("NONE");
  const [description, setDescription] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (branch && open) {
      setName(branch.name || "");
      setParentId(branch.parentId || "NONE");
      setDescription(branch.description || "");
      setEmail(branch.email || "");
      setPhone(branch.phone || "");
      setAddress(branch.address || "");
      setIsActive(branch.isActive ?? true);
      setErrors({});
    }
  }, [branch, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branch) return;
    setErrors({});

    const payload = {
      name: name.trim(),
      parentId: parentId === "NONE" ? null : parentId,
      description: description.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
      isActive,
    };

    const validationResult = updateBranchSchema.safeParse(payload);

    if (!validationResult.success) {
      const formattedErrors: Record<string, string> = {};
      validationResult.error.issues.forEach((issue) => {
        const fieldName = issue.path[0]?.toString();
        if (fieldName) {
          formattedErrors[fieldName] = issue.message;
        }
      });
      setErrors(formattedErrors);
      return;
    }

    setIsLoading(true);
    try {
      await api.patch(`/organization/branches/${branch.id}`, validationResult.data);

      toast.success(`Branch '${branch.code}' updated successfully!`);
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to update branch"));
    } finally {
      setIsLoading(false);
    }
  };

  const parentCandidates = React.useMemo(() => {
    return branches.filter((b) => b.id !== branch?.id && b.isActive);
  }, [branches, branch]);

  const selectedParent = React.useMemo(() => {
    if (!parentId || parentId === "NONE") return null;
    return parentCandidates.find((b) => b.id === parentId);
  }, [parentCandidates, parentId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-xl sm:min-w-[540px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Pencil className="size-5 text-primary" /> Edit Branch: {branch?.code}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Update the title, operational status, contact information, or parent hierarchy.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <ScrollArea className="max-h-[60vh] h-[400px] w-full px-6 py-2">
            <FieldSet>
              <FieldGroup className="space-y-4 pr-2">
                {/* Branch Code (Immutable) */}
                <Field>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <FieldLabel htmlFor="edit-branch-code" className="text-xs font-semibold">
                      Branch Code (Immutable)
                    </FieldLabel>
                    <HelpTooltip text="Branch codes are immutable system identifiers required by security and permission rules." />
                  </div>
                  <Input
                    id="edit-branch-code"
                    value={branch?.code || ""}
                    disabled
                    className="bg-muted font-mono uppercase text-xs cursor-not-allowed opacity-80"
                  />
                </Field>

                {/* Parent Branch Selection */}
                <Field data-invalid={Boolean(errors.parentId)}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <FieldLabel htmlFor="edit-branch-parent" className="text-xs font-semibold">
                      Parent Branch Hierarchy
                    </FieldLabel>
                    <HelpTooltip text="Modify the hierarchical parent. Circular hierarchy loops are strictly blocked by the server." />
                  </div>
                  <Select
                    value={parentId}
                    onValueChange={(val: string | null) => setParentId(val || "NONE")}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="edit-branch-parent" className="w-full text-xs">
                      <SelectValue placeholder="None (Top-Level Enterprise Branch)">
                        {selectedParent
                          ? `${selectedParent.name} (${selectedParent.code})`
                          : "None (Top-Level Enterprise Branch)"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="w-full max-h-56">
                      <SelectItem value="NONE" className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <GitBranch className="size-3.5 text-muted-foreground" />
                          <span>None (Top-Level Enterprise Branch)</span>
                        </div>
                      </SelectItem>
                      {parentCandidates.map((b) => (
                        <SelectItem key={b.id} value={b.id} className="text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                              {b.code}
                            </span>
                            <span>{b.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError errors={errors.parentId} />
                </Field>

                {/* Branch Name */}
                <Field data-invalid={Boolean(errors.name)}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <FieldLabel htmlFor="edit-branch-name" className="text-xs font-semibold">
                      Branch Name <span className="text-destructive">*</span>
                    </FieldLabel>
                    <HelpTooltip text="Full official title of the branch." />
                  </div>
                  <Input
                    id="edit-branch-name"
                    placeholder="e.g. Softvence Alpha"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                    }}
                    className="text-xs"
                    autoComplete="off"
                    disabled={isLoading}
                  />
                  <FieldError errors={errors.name} />
                </Field>

                {/* Description */}
                <Field data-invalid={Boolean(errors.description)}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <FieldLabel htmlFor="edit-branch-desc" className="text-xs font-semibold">
                      Description / Purpose
                    </FieldLabel>
                  </div>
                  <Textarea
                    id="edit-branch-desc"
                    placeholder="Brief description of operations, focus, or sister concern domain..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isLoading}
                    rows={2}
                    className="text-xs"
                  />
                  <FieldError errors={errors.description} />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Email */}
                  <Field data-invalid={Boolean(errors.email)}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <FieldLabel htmlFor="edit-branch-email" className="text-xs font-semibold">
                        Official Email
                      </FieldLabel>
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                      <Input
                        id="edit-branch-email"
                        type="email"
                        placeholder="contact@branch.betopia.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                        className="pl-9 text-xs"
                      />
                    </div>
                    <FieldError errors={errors.email} />
                  </Field>

                  {/* Phone */}
                  <Field data-invalid={Boolean(errors.phone)}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <FieldLabel htmlFor="edit-branch-phone" className="text-xs font-semibold">
                        Phone / Hotline
                      </FieldLabel>
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                      <Input
                        id="edit-branch-phone"
                        placeholder="+1 (555) 019-2834"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={isLoading}
                        className="pl-9 text-xs"
                      />
                    </div>
                    <FieldError errors={errors.phone} />
                  </Field>
                </div>

                {/* Address */}
                <Field data-invalid={Boolean(errors.address)}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <FieldLabel htmlFor="edit-branch-address" className="text-xs font-semibold">
                      Physical Office Location
                    </FieldLabel>
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      id="edit-branch-address"
                      placeholder="e.g. Level 4, Silicon Tower, Tech City"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      disabled={isLoading}
                      className="pl-9 text-xs"
                    />
                  </div>
                  <FieldError errors={errors.address} />
                </Field>

                {/* Operational Status Switch */}
                <Field className="flex items-center justify-between p-3.5 rounded-lg border bg-muted/20">
                  <div className="space-y-0.5">
                    <FieldLabel htmlFor="edit-branch-active" className="text-xs font-medium cursor-pointer">
                      Operational Status
                    </FieldLabel>
                    <p className="text-[11px] text-muted-foreground">
                      Active branches can host departments, teams, projects, and users.
                    </p>
                  </div>
                  <Switch
                    id="edit-branch-active"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                    disabled={isLoading}
                  />
                </Field>
              </FieldGroup>
            </FieldSet>
          </ScrollArea>

          <DialogFooter className="p-6 pt-3 border-t bg-muted/10 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isLoading} className="gap-1.5">
              {isLoading && <Loader2 className="size-3.5 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
