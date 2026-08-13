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
import { Badge } from "@workspace/ui/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Loader2, Save, ShieldCheck, Info } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { DesignationItem } from "./DesignationTable";

interface PermissionItem {
  id: string;
  code: string;
  module: string;
  description: string;
}

interface ScopeTypeItem {
  id: string;
  code: string;
  name: string;
  resolutionStrategy: string;
}

interface PermissionMatrixModalProps {
  designation: DesignationItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function PermissionMatrixModal({
  designation,
  open,
  onOpenChange,
  onSuccess,
}: PermissionMatrixModalProps) {
  const [allPermissions, setAllPermissions] = React.useState<PermissionItem[]>([]);
  const [scopeTypes, setScopeTypes] = React.useState<ScopeTypeItem[]>([]);
  const [selectedScopes, setSelectedScopes] = React.useState<Record<string, string>>({}); // permissionId -> scopeTypeId
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  const loadMatrixData = React.useCallback(async () => {
    if (!designation) return;
    setIsLoading(true);
    try {
      const [perms, scopes, desigData] = await Promise.all([
        api.get("/permissions"),
        api.get("/permissions/scope-types"),
        api.get(`/organization/designations/${designation.id}/permissions`),
      ]);

      setAllPermissions(perms || []);
      setScopeTypes(scopes || []);

      // Build mapping of existing permissions -> scopeTypeId
      const mapping: Record<string, string> = {};
      if (desigData && desigData.permissions) {
        for (const item of desigData.permissions) {
          mapping[item.permissionId] = item.scopeTypeId;
        }
      }
      setSelectedScopes(mapping);
    } catch (err: any) {
      toast.error(err.message || "Failed to load permission matrix data");
    } finally {
      setIsLoading(false);
    }
  }, [designation]);

  React.useEffect(() => {
    if (open && designation) {
      loadMatrixData();
    }
  }, [open, designation, loadMatrixData]);

  const handleScopeChange = (permissionId: string, scopeTypeId: string | null) => {
    setSelectedScopes((prev) => {
      const copy = { ...prev };
      if (!scopeTypeId || scopeTypeId === "NONE") {
        delete copy[permissionId];
      } else {
        copy[permissionId] = scopeTypeId;
      }
      return copy;
    });
  };

  const handleSave = async () => {
    if (!designation) return;
    setIsSaving(true);
    try {
      const assignments = Object.entries(selectedScopes).map(([permissionId, scopeTypeId]) => ({
        permissionId,
        scopeTypeId,
      }));

      await api.put(`/organization/designations/${designation.id}/permissions`, {
        assignments,
      });

      toast.success(`Permissions matrix updated & cache invalidated for ${designation.name}`);
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to save permission matrix");
    } finally {
      setIsSaving(false);
    }
  };

  // Group permissions by module
  const groupedModules = React.useMemo(() => {
    const map: Record<string, PermissionItem[]> = {};
    for (const p of allPermissions) {
      const mod = p.module || "General";
      if (!map[mod]) map[mod] = [];
      map[mod].push(p);
    }
    return map;
  }, [allPermissions]);

  if (!designation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" /> Permission Matrix: {designation.name} ({designation.code})
          </DialogTitle>
          <DialogDescription>
            Assign scope boundaries per permission. Changes take effect immediately across all users with this designation.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-4 py-2">
            <div className="space-y-6">
              {Object.entries(groupedModules).map(([moduleName, perms]) => (
                <div key={moduleName} className="space-y-3">
                  <div className="flex items-center justify-between border-b pb-1.5">
                    <h3 className="font-bold text-sm tracking-wide text-primary flex items-center gap-2">
                      <Badge variant="outline">{moduleName}</Badge>
                      <span className="text-xs text-muted-foreground font-normal">
                        ({perms.length} actions)
                      </span>
                    </h3>
                  </div>

                  <div className="grid gap-2">
                    {perms.map((p) => {
                      const currentScopeId = selectedScopes[p.id] || "NONE";
                      return (
                        <div
                          key={p.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/40 transition-colors gap-3"
                        >
                          <div className="space-y-0.5 max-w-md">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs font-mono text-foreground">
                                {p.code}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">{p.description}</p>
                          </div>

                          <div className="w-full sm:w-60 shrink-0">
                            <Select
                              value={currentScopeId}
                              onValueChange={(val: any) => handleScopeChange(p.id, val)}
                            >
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="No Access (Disabled)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="NONE" className="text-rose-600 font-medium">
                                  🚫 No Access (Disabled)
                                </SelectItem>
                                {scopeTypes.map((st) => (
                                  <SelectItem key={st.id} value={st.id}>
                                    ⚡ {st.name} ({st.resolutionStrategy})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="pt-4 border-t flex items-center justify-between">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Info className="size-4 text-blue-500" />
            <span>Updates update DB grants & clear Redis designation cache.</span>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || isLoading} className="gap-2">
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save Matrix
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
