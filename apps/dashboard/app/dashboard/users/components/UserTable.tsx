"use client";

import * as React from "react";
import {
  useTable,
  createColumnHelper,
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  MoreHorizontal,
  Edit,
  Mail,
  UserX,
  KeyRound,
  Send,
  Loader2,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Lock,
  Archive,
  ChevronDown,
  IdCard,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  features,
  type DataTableFeatures,
  DataTableColumnHeader,
  DataTablePagination,
  DataTableToolbar,
} from "@/components/data-table";

export type UserStatus = "INVITED" | "ACTIVE" | "INACTIVE" | "SUSPENDED" | "LOCKED" | "ARCHIVED";

export interface UserCapabilities {
  canEdit?: boolean;
  canToggleActive?: boolean;
  canManageOverrides?: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  employeeId?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
  systemRole: "SuperAdmin" | "Admin" | "Staff";
  status?: UserStatus;
  isActive: boolean;
  mustChangePassword?: boolean;
  roleId?: string;
  role?: {
    id: string;
    code: string;
    name: string;
    department?: {
      id: string;
      name: string;
    } | null;
  } | null;
  designationId?: string | null;
  designation?: {
    id: string;
    code: string;
    name: string;
    department?: {
      id: string;
      name: string;
    } | null;
  } | null;
  _capabilities?: UserCapabilities;
}

interface UserTableProps {
  users: AdminUser[];
  onEdit: (user: AdminUser) => void;
  onToggleActive?: (user: AdminUser, active: boolean) => void;
  onStatusChange?: (user: AdminUser, newStatus: UserStatus) => void;
  onRefresh?: () => void;
  search?: string;
  onSearchChange?: (value: string) => void;
  roleFilter?: string;
  onRoleFilterChange?: (value: string) => void;
  statusFilter?: string;
  onStatusFilterChange?: (value: string) => void;
}

const columnHelper = createColumnHelper<DataTableFeatures, AdminUser>();

export function UserTable({
  users,
  onEdit,
  onToggleActive,
  onStatusChange,
  onRefresh,
  search,
  onSearchChange,
  roleFilter = "all",
  onRoleFilterChange,
  statusFilter = "all",
  onStatusFilterChange,
}: UserTableProps) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = React.useState<string | null>(null);

  // Table state
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "SuperAdmin":
        return <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 font-semibold">SuperAdmin</Badge>;
      case "Admin":
        return <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 font-semibold">Admin</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">Staff</Badge>;
    }
  };

  const getStatusBadge = (status: UserStatus = "ACTIVE", mustChangePassword?: boolean) => {
    switch (status) {
      case "INVITED":
        return (
          <div className="flex flex-col gap-1 items-start min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shadow-xs">
              <Clock className="size-3 shrink-0" />
              Invited
            </span>
            {mustChangePassword && (
              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400/90 flex items-center gap-1 whitespace-nowrap pl-0.5">
                <KeyRound className="size-2.5 shrink-0" /> Pending Acceptance
              </span>
            )}
          </div>
        );
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 shadow-xs">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            Active
          </span>
        );
      case "INACTIVE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-500/25 shadow-xs">
            <UserX className="size-3 shrink-0 text-slate-500" />
            Inactive
          </span>
        );
      case "SUSPENDED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/25 shadow-xs">
            <ShieldAlert className="size-3 shrink-0 text-rose-500" />
            Suspended
          </span>
        );
      case "LOCKED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/25 shadow-xs">
            <Lock className="size-3 shrink-0 text-orange-500" />
            Locked
          </span>
        );
      case "ARCHIVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border border-zinc-500/25 shadow-xs">
            <Archive className="size-3 shrink-0 text-zinc-500" />
            Archived
          </span>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleStatusUpdate = async (user: AdminUser, newStatus: UserStatus) => {
    if (onStatusChange) {
      onStatusChange(user, newStatus);
      return;
    }

    setUpdatingUserId(user.id);
    try {
      await api.patch(`/users/${user.id}`, { status: newStatus });
      toast.success(`User status updated to ${newStatus}`);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update user status");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const [copyingUserId, setCopyingUserId] = React.useState<string | null>(null);

  const handleQuickCopyInvite = async (user: AdminUser) => {
    setCopyingUserId(user.id);
    try {
      const res = await api.post(`/users/${user.id}/resend-invite`, {});
      const tempPassword = res.temporaryPassword;

      const lines = [
        "==================================",
        " SOFTVENCE ACCOUNT INVITATION",
        "==================================",
        `Name: ${user.firstName || ""} ${user.lastName || ""}`.trim(),
        `Email: ${user.email}`,
        user.employeeId ? `Employee ID: ${user.employeeId}` : "",
        user.designation?.name ? `Designation: ${user.designation.name}` : "",
        user.designation?.department?.name ? `Department: ${user.designation.department.name}` : "",
        `Role: ${user.systemRole}`,
        `Temporary Password: ${tempPassword}`,
        `Login URL: ${window.location.origin}/login`,
        "Status: Invited (Pending First Login & Password Setup)",
        "",
        "Please log in at the portal with your temporary credentials to establish your permanent password.",
      ]
        .filter((line) => line !== "")
        .join("\n");

      navigator.clipboard.writeText(lines);
      setCopiedId(user.id);
      toast.success(`Login info & password for ${user.email} copied!`);
      if (onRefresh) onRefresh();
      setTimeout(() => setCopiedId(null), 2500);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate login info");
    } finally {
      setCopyingUserId(null);
    }
  };

  // Define table columns
  const columns = React.useMemo(() => {
    return columnHelper.columns([
      columnHelper.accessor(
        (row) => `${row.firstName || ""} ${row.lastName || ""} ${row.email} ${row.employeeId || ""}`.trim(),
        {
          id: "user",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="User / Employee" />
          ),
          cell: ({ row }) => {
            const user = row.original;
            const displayName =
              user.firstName || user.lastName
                ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                : "System User";
            const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "U";

            return (
              <div className="flex items-center gap-3">
                <Avatar className="size-9 rounded-lg border border-primary/20 shrink-0 shadow-2xs">
                  {user.avatarUrl && (
                    <AvatarImage
                      src={user.avatarUrl}
                      alt={displayName}
                      className="rounded-lg object-cover"
                    />
                  )}
                  <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-sm text-foreground truncate">
                    {displayName}
                  </span>
                  <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5">
                    <span className="flex items-center gap-1 truncate">
                      <Mail className="size-3 shrink-0" /> {user.email}
                    </span>
                    {user.employeeId && (
                      <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground shrink-0 flex items-center gap-0.5">
                        <IdCard className="size-2.5" />
                        {user.employeeId}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          },
        }
      ),

      columnHelper.accessor(
        (row) => row.role?.name || row.systemRole,
        {
          id: "role",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Authorization Role" />
          ),
          cell: ({ row }) => {
            const user = row.original;
            return user.role ? (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-primary">
                  {user.role.name}
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {user.role.code}
                </span>
              </div>
            ) : (
              getRoleBadge(user.systemRole)
            );
          },
        }
      ),

      columnHelper.accessor(
        (row) => row.designation?.name || "Unassigned",
        {
          id: "designation",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Job Title / Designation" />
          ),
          cell: ({ row }) => {
            const user = row.original;
            return user.designation ? (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-foreground">
                  {user.designation.name}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {user.designation.department?.name || user.role?.department?.name || "Company-Wide"}
                </span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground italic">Unassigned</span>
            );
          },
        }
      ),

      columnHelper.accessor("systemRole", {
        id: "systemRole",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="System Tier" />
        ),
        cell: ({ row }) => getRoleBadge(row.original.systemRole),
      }),

      columnHelper.accessor(
        (row) => row.status || (row.isActive ? "ACTIVE" : "INACTIVE"),
        {
          id: "status",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Status & Lifecycle" />
          ),
          cell: ({ row }) => {
            const user = row.original;
            const caps = user._capabilities || {
              canEdit: true,
              canToggleActive: true,
              canManageOverrides: true,
            };
            const isUpdating = updatingUserId === user.id;

            return (
              <div className="flex items-center gap-2">
                {caps.canEdit ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      disabled={isUpdating}
                      className="group flex items-center gap-1.5 p-1 -ml-1 rounded-lg hover:bg-muted/60 transition-colors text-left outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                      title="Click to quick-change status"
                    >
                      {isUpdating ? (
                        <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground">
                          <Loader2 className="size-3.5 animate-spin" /> Updating...
                        </div>
                      ) : (
                        <>
                          {getStatusBadge(
                            user.status || (user.isActive ? "ACTIVE" : "INACTIVE"),
                            user.mustChangePassword
                          )}
                          <ChevronDown className="size-3 text-muted-foreground opacity-40 group-hover:opacity-100 transition-opacity shrink-0 ml-0.5" />
                        </>
                      )}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                        Change Status
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleStatusUpdate(user, "INVITED")}
                        className="cursor-pointer"
                      >
                        <Clock className="mr-2 size-3.5 text-amber-600" />
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Invited</span>
                          <span className="text-[10px] text-muted-foreground">Pending password change</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleStatusUpdate(user, "ACTIVE")}
                        className="cursor-pointer"
                      >
                        <CheckCircle2 className="mr-2 size-3.5 text-emerald-600" />
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Active</span>
                          <span className="text-[10px] text-muted-foreground">Full operational access</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleStatusUpdate(user, "INACTIVE")}
                        className="cursor-pointer"
                      >
                        <UserX className="mr-2 size-3.5 text-slate-600" />
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-400">Inactive</span>
                          <span className="text-[10px] text-muted-foreground">Temporarily deactivated</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleStatusUpdate(user, "SUSPENDED")}
                        className="cursor-pointer"
                      >
                        <ShieldAlert className="mr-2 size-3.5 text-rose-600" />
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-rose-700 dark:text-rose-400">Suspended</span>
                          <span className="text-[10px] text-muted-foreground">Disciplinary lock</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleStatusUpdate(user, "LOCKED")}
                        className="cursor-pointer"
                      >
                        <Lock className="mr-2 size-3.5 text-orange-600" />
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-orange-700 dark:text-orange-400">Locked</span>
                          <span className="text-[10px] text-muted-foreground">Block sign in attempts</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleStatusUpdate(user, "ARCHIVED")}
                        className="cursor-pointer"
                      >
                        <Archive className="mr-2 size-3.5 text-zinc-600" />
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-400">Archived</span>
                          <span className="text-[10px] text-muted-foreground">Offboarded account</span>
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  getStatusBadge(
                    user.status || (user.isActive ? "ACTIVE" : "INACTIVE"),
                    user.mustChangePassword
                  )
                )}
              </div>
            );
          },
        }
      ),

      columnHelper.display({
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const user = row.original;
          const caps = user._capabilities || {
            canEdit: true,
            canToggleActive: true,
            canManageOverrides: true,
          };
          const hasAnyAction = caps.canEdit || caps.canManageOverrides;
          const isInvited =
            (user.status || (user.mustChangePassword ? "INVITED" : "ACTIVE")) ===
            "INVITED";
          const isCopying = copyingUserId === user.id;

          return (
            <div className="flex items-center justify-end gap-1.5">
              {/* 1-Click Copy Invite Button with Password */}
              {isInvited && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-xs gap-1.5 border-amber-500/30 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium"
                  onClick={() => handleQuickCopyInvite(user)}
                  disabled={isCopying}
                  title="Copy Login Info with Temporary Password"
                >
                  {isCopying ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span className="hidden sm:inline">Copying...</span>
                    </>
                  ) : copiedId === user.id ? (
                    <>
                      <Check className="size-3.5 text-emerald-500" />
                      <span className="hidden sm:inline text-emerald-600 dark:text-emerald-400 font-semibold">
                        Copied!
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" />
                      <span className="hidden sm:inline">Copy Invite</span>
                    </>
                  )}
                </Button>
              )}

              {hasAnyAction && (
                <DropdownMenu>
                  <DropdownMenuTrigger className="size-8 p-0 rounded-md hover:bg-accent flex items-center justify-center border border-input">
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel>User Actions</DropdownMenuLabel>
                    {caps.canEdit && (
                      <DropdownMenuItem onClick={() => onEdit(user)}>
                        <Edit className="mr-2 size-4" /> Manage & Edit Profile
                      </DropdownMenuItem>
                    )}

                    {isInvited && (
                      <DropdownMenuItem
                        onClick={() => handleQuickCopyInvite(user)}
                        disabled={isCopying}
                        className="text-amber-700 dark:text-amber-400 focus:text-amber-700"
                      >
                        <Copy className="mr-2 size-4" /> Copy Login Info & Password
                      </DropdownMenuItem>
                    )}

                    {caps.canManageOverrides && !isInvited && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleQuickCopyInvite(user)}
                          disabled={isCopying}
                          className="text-primary focus:text-primary"
                        >
                          <KeyRound className="mr-2 size-4" /> Reset Password & Copy Info
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        },
      }),
    ]);
  }, [copiedId, copyingUserId, updatingUserId, onEdit]);

  const table = useTable({
    features,
    data: users,
    columns,
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
    },
  });

  return (
    <div className="space-y-4">
      {/* Table Toolbar */}
      <DataTableToolbar
        table={table}
        searchKey={typeof onSearchChange === "function" ? undefined : "user"}
        searchValue={search}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search users by name, email, or employee ID..."
        onReset={() => {
          if (onSearchChange) onSearchChange("");
          if (onRoleFilterChange) onRoleFilterChange("all");
          if (onStatusFilterChange) onStatusFilterChange("all");
        }}
        isFiltered={Boolean(
          (search && search.trim() !== "") ||
            roleFilter !== "all" ||
            statusFilter !== "all"
        )}
      >
        {/* Role Filter */}
        {onRoleFilterChange && (
          <Select
            value={roleFilter}
            onValueChange={(val: any) => val && onRoleFilterChange(val)}
          >
            <SelectTrigger className="w-[140px] sm:w-[150px] h-9 text-xs bg-background/50">
              <SelectValue placeholder="Filter by Role">
                {roleFilter === "all" ? "All System Roles" : roleFilter}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All System Roles</SelectItem>
              <SelectItem value="SuperAdmin">SuperAdmin</SelectItem>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="Staff">Staff</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Status Filter */}
        {onStatusFilterChange && (
          <Select
            value={statusFilter}
            onValueChange={(val: any) => val && onStatusFilterChange(val)}
          >
            <SelectTrigger className="w-[130px] sm:w-[140px] h-9 text-xs bg-background/50">
              <SelectValue placeholder="Filter by Status">
                {statusFilter === "all" ? "All Statuses" : statusFilter}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="INVITED">Invited</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
              <SelectItem value="LOCKED">Locked</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>
        )}
      </DataTableToolbar>

      {/* TanStack Table Container */}
      <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder ? null : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-muted/40 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-28 text-center text-muted-foreground text-sm"
                >
                  No users found matching the filter criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Table Pagination */}
      <DataTablePagination table={table} />
    </div>
  );
}
