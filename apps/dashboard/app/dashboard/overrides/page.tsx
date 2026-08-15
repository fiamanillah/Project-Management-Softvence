"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { ShieldAlert, UserCheck, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { RouteGuard } from "@/components/permission-gate/RouteGuard";
import { OverrideHeader } from "./components/OverrideHeader";
import { OverrideStats } from "./components/OverrideStats";
import { OverrideTable } from "./components/OverrideTable";
import { CreateOverrideModal } from "./components/CreateOverrideModal";
import { DelegationTable } from "./components/DelegationTable";
import { CreateDelegationModal } from "./components/CreateDelegationModal";
import type {
  OverrideItem,
  DelegationItem,
  UserSummary,
  PermissionSummary,
  DepartmentSummary,
} from "./types";

export default function OverridesPage() {
  return (
    <RouteGuard code="auth.user.manage">
      <OverridesContent />
    </RouteGuard>
  );
}

function OverridesContent() {
  const [overrides, setOverrides] = React.useState<OverrideItem[]>([]);
  const [delegations, setDelegations] = React.useState<DelegationItem[]>([]);
  const [users, setUsers] = React.useState<UserSummary[]>([]);
  const [permissions, setPermissions] = React.useState<PermissionSummary[]>([]);
  const [departments, setDepartments] = React.useState<DepartmentSummary[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Modals
  const [overrideModalOpen, setOverrideModalOpen] = React.useState(false);
  const [delegationModalOpen, setDelegationModalOpen] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [resOv, resDel, resUsers, resPerms, resDepts] = await Promise.all([
        api.get("/users/overrides"),
        api.get("/users/delegations"),
        api.get("/users?limit=100"),
        api.get("/permissions"),
        api.get("/organization/departments").catch(() => []),
      ]);

      setOverrides(resOv || []);
      setDelegations(resDel || []);
      setUsers(resUsers.data || []);
      setPermissions(resPerms || []);
      setDepartments(resDepts || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load overrides and delegations");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRevokeOverride = async (id: string) => {
    try {
      await api.delete(`/users/overrides/${id}`);
      toast.success("User permission override revoked successfully");
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke override");
      throw err;
    }
  };

  const handleRevokeDelegation = async (id: string) => {
    try {
      await api.delete(`/users/delegations/${id}`);
      toast.success("Delegation revoked successfully");
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke delegation");
      throw err;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with quick action buttons & refresh */}
      <OverrideHeader
        isLoading={isLoading}
        onRefresh={fetchData}
        onOpenCreateOverride={() => setOverrideModalOpen(true)}
        onOpenCreateDelegation={() => setDelegationModalOpen(true)}
      />

      {/* KPI Overview Metrics */}
      <OverrideStats overrides={overrides} delegations={delegations} />

      {/* Tabs for Overrides & Delegations */}
      <Tabs defaultValue="overrides" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="bg-muted/60 p-1">
            <TabsTrigger value="overrides" className="gap-2">
              <ShieldAlert className="size-4 text-amber-500" />
              <span>Permission Overrides</span>
              <span className="ml-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                {overrides.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="delegations" className="gap-2">
              <UserCheck className="size-4 text-blue-500" />
              <span>Active Delegations</span>
              <span className="ml-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
                {delegations.length}
              </span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Overrides Table */}
        <TabsContent value="overrides" className="space-y-4">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center border rounded-xl bg-card gap-2">
              <RefreshCw className="size-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Loading permission overrides...</p>
            </div>
          ) : (
            <OverrideTable
              overrides={overrides}
              onRevoke={handleRevokeOverride}
            />
          )}
        </TabsContent>

        {/* Tab 2: Delegations Table */}
        <TabsContent value="delegations" className="space-y-4">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center border rounded-xl bg-card gap-2">
              <RefreshCw className="size-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Loading user delegations...</p>
            </div>
          ) : (
            <DelegationTable
              delegations={delegations}
              onRevoke={handleRevokeDelegation}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Creation Modals */}
      <CreateOverrideModal
        open={overrideModalOpen}
        onOpenChange={setOverrideModalOpen}
        users={users}
        permissions={permissions}
        departments={departments}
        onSuccess={fetchData}
      />

      <CreateDelegationModal
        open={delegationModalOpen}
        onOpenChange={setDelegationModalOpen}
        users={users}
        onSuccess={fetchData}
      />
    </div>
  );
}
