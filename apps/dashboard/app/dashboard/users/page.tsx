"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { UserPlus, Shield, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { RouteGuard } from "@/components/permission-gate/RouteGuard";
import { PermissionGate } from "@/components/permission-gate/PermissionGate";
import { UserTable, type AdminUser, type UserStatus } from "./components/UserTable";
import { CreateUserModal } from "./components/CreateUserModal";
import { EditUserModal } from "./components/EditUserModal";

export default function UsersPage() {
  return (
    <RouteGuard code="auth.user.view">
      <UsersContent />
    </RouteGuard>
  );
}

function UsersContent() {
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [designations, setDesignations] = React.useState<{ id: string; name: string; code: string }[]>([]);
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [isLoading, setIsLoading] = React.useState(true);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<AdminUser | null>(null);

  const fetchUsers = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.set("search", search);
      if (roleFilter !== "all") queryParams.set("role", roleFilter);
      if (statusFilter !== "all") queryParams.set("status", statusFilter);

      const [resUsers, resDesig] = await Promise.all([
        api.get(`/users?${queryParams.toString()}`),
        api.get("/organization/designations"),
      ]);

      setUsers(resUsers.data || []);
      setDesignations(resDesig || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, [search, roleFilter, statusFilter]);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleStatusChange = async (user: AdminUser, newStatus: UserStatus) => {
    try {
      await api.patch(`/users/${user.id}`, { status: newStatus });
      toast.success(`User status updated to ${newStatus}`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to update user status");
    }
  };

  const handleEditClick = (user: AdminUser) => {
    setSelectedUser(user);
    setEditModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="size-6 text-primary" /> Users Management
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage system roles, designations, invitations, and account lifecycle statuses across your organization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchUsers()}>
            <RefreshCw className="mr-2 size-4" /> Refresh
          </Button>
          <PermissionGate code="auth.user.create">
            <Button size="sm" onClick={() => setCreateModalOpen(true)}>
              <UserPlus className="mr-2 size-4" /> Add User
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* User Table with Unified Toolbar (Search, Filters, and Column Visibility) */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center border rounded-xl bg-card">
          <RefreshCw className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <UserTable
          users={users}
          search={search}
          onSearchChange={setSearch}
          roleFilter={roleFilter}
          onRoleFilterChange={setRoleFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onEdit={handleEditClick}
          onStatusChange={handleStatusChange}
          onRefresh={fetchUsers}
        />
      )}

      {/* Create User Modal */}
      <CreateUserModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        designations={designations}
        onSuccess={fetchUsers}
      />

      {/* Edit User Modal */}
      <EditUserModal
        user={selectedUser}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        designations={designations}
        onSuccess={fetchUsers}
      />
    </div>
  );
}
