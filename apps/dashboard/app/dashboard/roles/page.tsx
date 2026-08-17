"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { RouteGuard } from "@/components/permission-gate/RouteGuard";
import { PermissionGate } from "@/components/permission-gate/PermissionGate";
import { RoleTable, type RoleItem } from "./components/RoleTable";
import { CreateRoleModal } from "./components/CreateRoleModal";
import { EditRoleModal } from "./components/EditRoleModal";
import { DeleteRoleDialog } from "./components/DeleteRoleDialog";

export default function RolesPage() {
  return (
    <RouteGuard code="auth.user.view">
      <RolesContent />
    </RouteGuard>
  );
}

function RolesContent() {
  const [roles, setRoles] = React.useState<RoleItem[]>([]);
  const [departments, setDepartments] = React.useState<{ id: string; name: string; code: string }[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Modals
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [editInitialTab, setEditInitialTab] = React.useState<"details" | "permissions">("details");
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedRole, setSelectedRole] = React.useState<RoleItem | null>(null);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [resRoles, resDepts] = await Promise.all([
        api.get("/organization/roles"),
        api.get("/organization/departments"),
      ]);
      setRoles(resRoles || []);
      setDepartments(resDepts || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load roles data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = (role: RoleItem, initialTab: "details" | "permissions" = "details") => {
    setSelectedRole(role);
    setEditInitialTab(initialTab);
    setEditModalOpen(true);
  };

  const handleDelete = (role: RoleItem) => {
    setSelectedRole(role);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="size-6 text-primary" /> Roles & Security Matrix
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage system authorization roles and configure fine-grained permission scope matrix assignments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchData()}>
            <RefreshCw className="mr-2 size-4" /> Refresh
          </Button>
          <PermissionGate code="auth.user.manage">
            <Button size="sm" onClick={() => setCreateModalOpen(true)}>
              <Plus className="mr-2 size-4" /> Add Role
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Role Table */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center border rounded-xl bg-card">
          <RefreshCw className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <RoleTable
          roles={roles}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Create Role Modal */}
      <CreateRoleModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        departments={departments}
        onSuccess={fetchData}
      />

      {/* Edit Role Modal */}
      <EditRoleModal
        role={selectedRole}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        departments={departments}
        initialTab={editInitialTab}
        onSuccess={fetchData}
      />

      {/* Delete Role Dialog */}
      <DeleteRoleDialog
        role={selectedRole}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onSuccess={fetchData}
      />
    </div>
  );
}
