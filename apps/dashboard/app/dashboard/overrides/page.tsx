"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { KeyRound, Plus, RefreshCw, ShieldAlert, UserCheck } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { OverrideTable, type OverrideItem } from "./components/OverrideTable";
import { CreateOverrideModal } from "./components/CreateOverrideModal";
import { DelegationTable, type DelegationItem } from "./components/DelegationTable";
import { CreateDelegationModal } from "./components/CreateDelegationModal";

export default function OverridesPage() {
  const [overrides, setOverrides] = React.useState<OverrideItem[]>([]);
  const [delegations, setDelegations] = React.useState<DelegationItem[]>([]);
  const [users, setUsers] = React.useState<{ id: string; email: string; firstName?: string; lastName?: string }[]>([]);
  const [permissions, setPermissions] = React.useState<{ id: string; code: string; module: string; description: string }[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Modals
  const [overrideModalOpen, setOverrideModalOpen] = React.useState(false);
  const [delegationModalOpen, setDelegationModalOpen] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [resOv, resDel, resUsers, resPerms] = await Promise.all([
        api.get("/users/overrides"),
        api.get("/users/delegations"),
        api.get("/users?limit=100"),
        api.get("/permissions"),
      ]);

      setOverrides(resOv || []);
      setDelegations(resDel || []);
      setUsers(resUsers.data || []);
      setPermissions(resPerms || []);
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
      toast.success("User permission override revoked");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke override");
    }
  };

  const handleRevokeDelegation = async (id: string) => {
    try {
      await api.delete(`/users/delegations/${id}`);
      toast.success("Delegation revoked");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke delegation");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <KeyRound className="size-6 text-primary" /> User Overrides & Delegations
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage hand-grants, explicit deny overrides, and active user delegation windows.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchData()}>
            <RefreshCw className="mr-2 size-4" /> Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overrides" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="overrides" className="gap-1.5">
              <ShieldAlert className="size-4 text-amber-500" /> Permission Overrides ({overrides.length})
            </TabsTrigger>
            <TabsTrigger value="delegations" className="gap-1.5">
              <UserCheck className="size-4 text-blue-500" /> Active Delegations ({delegations.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overrides" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setOverrideModalOpen(true)}>
              <Plus className="mr-2 size-4" /> New Override
            </Button>
          </div>

          {isLoading ? (
            <div className="h-64 flex items-center justify-center border rounded-xl bg-card">
              <RefreshCw className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <OverrideTable overrides={overrides} onRevoke={handleRevokeOverride} />
          )}
        </TabsContent>

        <TabsContent value="delegations" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setDelegationModalOpen(true)}>
              <Plus className="mr-2 size-4" /> New Delegation
            </Button>
          </div>

          {isLoading ? (
            <div className="h-64 flex items-center justify-center border rounded-xl bg-card">
              <RefreshCw className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <DelegationTable delegations={delegations} onRevoke={handleRevokeDelegation} />
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <CreateOverrideModal
        open={overrideModalOpen}
        onOpenChange={setOverrideModalOpen}
        users={users}
        permissions={permissions}
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
