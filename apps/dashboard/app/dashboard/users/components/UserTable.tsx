"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Badge } from "@workspace/ui/components/badge";
import { Switch } from "@workspace/ui/components/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { MoreHorizontal, Edit, Mail, UserCheck, UserX } from "lucide-react";

export interface AdminUser {
  id: string;
  email: string;
  employeeId?: string;
  firstName?: string;
  lastName?: string;
  systemRole: "SuperAdmin" | "Admin" | "Staff";
  isActive: boolean;
  designationId?: string;
  designation?: {
    id: string;
    code: string;
    name: string;
    department?: {
      id: string;
      name: string;
    };
  };
}

interface UserTableProps {
  users: AdminUser[];
  onEdit: (user: AdminUser) => void;
  onToggleActive: (user: AdminUser, active: boolean) => void;
}

export function UserTable({ users, onEdit, onToggleActive }: UserTableProps) {
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "SuperAdmin":
        return <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30">SuperAdmin</Badge>;
      case "Admin":
        return <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30">Admin</Badge>;
      default:
        return <Badge variant="outline">Staff</Badge>;
    }
  };

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User / Employee ID</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Designation & Department</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground text-sm">
                No users found.
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">
                      {user.firstName || user.lastName ? `${user.firstName || ""} ${user.lastName || ""}` : "System User"}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="size-3" /> {user.email} {user.employeeId ? `• ${user.employeeId}` : ""}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{getRoleBadge(user.systemRole)}</TableCell>
                <TableCell>
                  {user.designation ? (
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold">{user.designation.name}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {user.designation.department?.name || "System"}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Unassigned</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={user.isActive}
                      onCheckedChange={(checked) => onToggleActive(user, checked)}
                    />
                    <span className="text-xs text-muted-foreground">
                      {user.isActive ? (
                        <span className="text-emerald-600 font-medium flex items-center gap-1"><UserCheck className="size-3" /> Active</span>
                      ) : (
                        <span className="text-rose-600 font-medium flex items-center gap-1"><UserX className="size-3" /> Disabled</span>
                      )}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="size-8 p-0 rounded-md hover:bg-accent flex items-center justify-center border border-input">
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onEdit(user)}>
                        <Edit className="mr-2 size-4" /> Edit Role
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
