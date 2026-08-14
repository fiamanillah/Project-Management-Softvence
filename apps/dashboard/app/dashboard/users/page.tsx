"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { UserPlus, Search, Shield, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { RouteGuard } from "@/components/permission-gate/RouteGuard";
import { PermissionGate } from "@/components/permission-gate/PermissionGate";
import { UserTable, type AdminUser } from "./components/UserTable";
import { CreateUserModal } from "./components/CreateUserModal";
import { EditUserSheet } from "./components/EditUserSheet";

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
  const [isLoading, setIsLoading] = React.useState(true);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [editSheetOpen, setEditSheetOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<AdminUser | null>(null);

  const fetchUsers = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.set("search", search);
      if (roleFilter !== "all") queryParams.set("role", roleFilter);

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
  }, [search, roleFilter]);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleActive = async (user: AdminUser, active: boolean) => {
    try {
      await api.patch(`/users/${user.id}`, { isActive: active });
      toast.success(`User ${active ? "activated" : "disabled"} successfully`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to update user status");
    }
  };

  const handleEditClick = (user: AdminUser) => {
    setSelectedUser(user);
    setEditSheetOpen(true);
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
            Manage system roles, designations, and account access statuses across your organization.
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

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, employee ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-sm"
          />
        </div>

        <Select value={roleFilter} onValueChange={(val: any) => val && setRoleFilter(val)}>
          <SelectTrigger className="w-full sm:w-44 h-10">
            <SelectValue placeholder="Filter by Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All System Roles</SelectItem>
            <SelectItem value="SuperAdmin">SuperAdmin</SelectItem>
            <SelectItem value="Admin">Admin</SelectItem>
            <SelectItem value="Staff">Staff</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* User Table */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center border rounded-xl bg-card">
          <RefreshCw className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <UserTable
          users={users}
          onEdit={handleEditClick}
          onToggleActive={handleToggleActive}
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

      {/* Edit User Sheet */}
      <EditUserSheet
        user={selectedUser}
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
        designations={designations}
        onSuccess={fetchUsers}
      />
    </div>
  );
}
