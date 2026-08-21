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
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { RoleItem } from "./RoleTable";
import {
  RolePermissionMatrixEditor,
  type PermissionItem,
  type ScopeTypeItem,
} from "./RolePermissionMatrixEditor";

interface PermissionMatrixModalProps {
  role: RoleItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function PermissionMatrixModal({
  role,
  open,
  onOpenChange,
  onSuccess,
}: PermissionMatrixModalProps) {
  const [allPermissions, setAllPermissions] = React.useState<PermissionItem[]>([]);
  const [scopeTypes, setScopeTypes] = React.useState<ScopeTypeItem[]>([]);
  const [selectedScopes, setSelectedScopes] = React.useState<Record<string, string>>({}); // permissionId -> scopeTypeId
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  const fetchData = React.useCallback(async () => {
    if (!role) return;
    setIsLoading(true);
    setFetchError(null);

    try {
      const [perms, scopes, rolePerms] = await Promise.all([
        api.get("/permissions"),
        api.get("/permissions/scope-types"),
        api.get(`/organization/roles/${role.id}/permissions`),
      ]);

      setAllPermissions(Array.isArray(perms) ? perms : []);
      setScopeTypes(Array.isArray(scopes) ? scopes : []);

      const grantsMap: Record<string, string> = {};
      if (rolePerms && Array.isArray(rolePerms.permissions)) {
        rolePerms.permissions.forEach((grant: any) => {
          if (grant.permissionId && grant.scopeTypeId) {
            grantsMap[grant.permissionId] = grant.scopeTypeId;
          }
        });
      }
      setSelectedScopes(grantsMap);
    } catch (err: any) {
      const msg = err.message || "Failed to load permissions matrix";
      setFetchError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [role]);

  React.useEffect(() => {
    if (open && role) {
      fetchData();
    }
  }, [open, role, fetchData]);

  const handleSave = async () => {
    if (!role) return;

    const assignments = Object.entries(selectedScopes).map(([permissionId, scopeTypeId]) => ({
      permissionId,
      scopeTypeId,
    }));

    setIsSaving(true);
    try {
      await api.put(`/organization/roles/${role.id}/permissions`, {
        assignments,
      });

      toast.success(`Permission assignments for '${role.name}' saved successfully`);
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to update permissions matrix");
    } finally {
      setIsSaving(false);
    }
  };

  if (!role) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-5xl sm:min-w-[850px] h-[750px] max-h-[92vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <DialogTitle className="text-xl font-bold">
              Permission Matrix: {role.name} ({role.code})
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Configure fine-grained system permission assignments and access resolution scope strategies.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden px-6 pb-2">
          {fetchError ? (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="size-4" />
              <AlertTitle className="text-xs">Error Loading Permissions</AlertTitle>
              <AlertDescription className="text-[11px]">
                {fetchError}{" "}
                <Button
                  variant="link"
                  size="sm"
                  onClick={fetchData}
                  className="p-0 h-auto text-[11px] underline"
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : isLoading ? (
            <div className="flex-1 flex items-center justify-center border rounded-lg bg-muted/10 min-h-[350px]">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="size-6 animate-spin text-primary" />
                <span className="text-xs">Loading role permissions matrix...</span>
              </div>
            </div>
          ) : (
            <RolePermissionMatrixEditor
              permissions={allPermissions}
              scopeTypes={scopeTypes}
              selectedScopes={selectedScopes}
              onChange={setSelectedScopes}
              disabled={isSaving}
            />
          )}
        </div>

        <DialogFooter className="p-6 pt-3 border-t mt-auto shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="gap-1.5"
          >
            {isSaving && <Loader2 className="size-3.5 animate-spin" />}
            Save Permissions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
