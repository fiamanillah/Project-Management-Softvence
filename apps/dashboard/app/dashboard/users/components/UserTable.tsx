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
import { Input } from "@workspace/ui/components/input";
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
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  features,
  type DataTableFeatures,
  DataTableColumnHeader,
  DataTablePagination,
  DataTableToolbar,
  DataTableViewOptions,
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
  systemRole: "SuperAdmin" | "Admin" | "Staff";
  status?: UserStatus;
  isActive: boolean;
  mustChangePassword?: boolean;
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
  const [resendModalUser, setResendModalUser] = React.useState<AdminUser | null>(null);
  const [isResending, setIsResending] = React.useState(false);
  const [resendResult, setResendResult] = React.useState<{
    email: string;
    temporaryPassword: string;
  } | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = React.useState<string | null>(null);

  // Table state
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

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

  const getStatusBadge = (status: UserStatus = "ACTIVE", mustChangePassword?: boolean) => {
    switch (status) {
      case "INVITED":
        return (
          <div className="flex flex-col gap-1 items-start">
            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1.5 font-medium">
              <Clock className="size-3" /> Invited
            </Badge>
            {mustChangePassword && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400/90 font-medium flex items-center gap-0.5">
                <KeyRound className="size-2.5" /> Pending First Login
              </span>
            )}
          </div>
        );
      case "ACTIVE":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1.5 font-medium">
            <CheckCircle2 className="size-3" /> Active
          </Badge>
        );
      case "INACTIVE":
        return (
          <Badge className="bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30 gap-1.5 font-medium">
            <UserX className="size-3" /> Inactive
          </Badge>
        );
      case "SUSPENDED":
        return (
          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 gap-1.5 font-medium">
            <ShieldAlert className="size-3" /> Suspended
          </Badge>
        );
      case "LOCKED":
        return (
          <Badge className="bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30 gap-1.5 font-medium">
            <Lock className="size-3" /> Locked
          </Badge>
        );
      case "ARCHIVED":
        return (
          <Badge className="bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 border-zinc-500/30 gap-1.5 font-medium">
            <Archive className="size-3" /> Archived
          </Badge>
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

  const handleCopyInviteDetails = (user: AdminUser) => {
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
      `Login URL: ${window.location.origin}/login`,
      "Status: Invited (Pending First Login & Password Setup)",
      "",
      "Please log in at the portal with your temporary credentials to establish your permanent password.",
    ]
      .filter((line) => line !== "")
      .join("\n");

    navigator.clipboard.writeText(lines);
    setCopiedId(user.id);
    toast.success("Invitation details copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleResendInvite = async () => {
    if (!resendModalUser) return;
    setIsResending(true);
    try {
      const res = await api.post(`/users/${resendModalUser.id}/resend-invite`, {});
      setResendResult({
        email: resendModalUser.email,
        temporaryPassword: res.temporaryPassword,
      });
      toast.success("Invitation and temporary credentials resent successfully!");
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to resend invitation");
    } finally {
      setIsResending(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!resendResult) return;
    const creds = `Softvence Account Invitation\nEmail: ${resendResult.email}\nTemporary Password: ${resendResult.temporaryPassword}\nLogin URL: ${window.location.origin}/login`;
    navigator.clipboard.writeText(creds);
    setCopiedId("resend-modal");
    toast.success("Credentials copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const closeResendModal = () => {
    setResendModalUser(null);
    setResendResult(null);
    setCopiedId(null);
  };

  // Define table columns
  const columns = React.useMemo(() => {
    return columnHelper.columns([
      columnHelper.accessor(
        (row) => `${row.firstName || ""} ${row.lastName || ""} ${row.email} ${row.employeeId || ""}`.trim(),
        {
          id: "user",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="User / Employee ID" />
          ),
          cell: ({ row }) => {
            const user = row.original;
            return (
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-sm text-foreground">
                  {user.firstName || user.lastName
                    ? `${user.firstName || ""} ${user.lastName || ""}`
                    : "System User"}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Mail className="size-3 shrink-0" /> {user.email}{" "}
                  {user.employeeId ? `• ${user.employeeId}` : ""}
                </span>
              </div>
            );
          },
        }
      ),

      columnHelper.accessor("systemRole", {
        id: "role",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Role" />
        ),
        cell: ({ row }) => getRoleBadge(row.original.systemRole),
      }),

      columnHelper.accessor(
        (row) => row.designation?.name || "Unassigned",
        {
          id: "designation",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Designation & Department" />
          ),
          cell: ({ row }) => {
            const user = row.original;
            return user.designation ? (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-foreground">
                  {user.designation.name}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {user.designation.department?.name || "System"}
                </span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground italic">Unassigned</span>
            );
          },
        }
      ),

      columnHelper.accessor(
        (row) => row.status || (row.isActive ? "ACTIVE" : "INACTIVE"),
        {
          id: "status",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Status & Access" />
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
                  <Select
                    value={user.status || (user.isActive ? "ACTIVE" : "INACTIVE")}
                    onValueChange={(val) => {
                      if (val) handleStatusUpdate(user, val as UserStatus);
                    }}
                    disabled={isUpdating}
                  >
                    <SelectTrigger className="h-8 w-36 text-xs bg-background/50 border-input">
                      <SelectValue>
                        {isUpdating ? (
                          <Loader2 className="size-3 animate-spin text-muted-foreground" />
                        ) : (
                          getStatusBadge(
                            user.status || (user.isActive ? "ACTIVE" : "INACTIVE"),
                            user.mustChangePassword
                          )
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectItem value="INVITED">
                        <span className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                          <Clock className="size-3" /> Invited
                        </span>
                      </SelectItem>
                      <SelectItem value="ACTIVE">
                        <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                          <CheckCircle2 className="size-3" /> Active
                        </span>
                      </SelectItem>
                      <SelectItem value="INACTIVE">
                        <span className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                          <UserX className="size-3" /> Inactive
                        </span>
                      </SelectItem>
                      <SelectItem value="SUSPENDED">
                        <span className="flex items-center gap-1.5 text-xs text-rose-600 font-medium">
                          <ShieldAlert className="size-3" /> Suspended
                        </span>
                      </SelectItem>
                      <SelectItem value="LOCKED">
                        <span className="flex items-center gap-1.5 text-xs text-orange-600 font-medium">
                          <Lock className="size-3" /> Locked
                        </span>
                      </SelectItem>
                      <SelectItem value="ARCHIVED">
                        <span className="flex items-center gap-1.5 text-xs text-zinc-600 font-medium">
                          <Archive className="size-3" /> Archived
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
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

          return (
            <div className="flex items-center justify-end gap-1.5">
              {/* Quick Copy Invite Action for Invited Users */}
              {isInvited && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-xs gap-1.5 border-amber-500/30 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  onClick={() => handleCopyInviteDetails(user)}
                  title="Copy Invitation Details"
                >
                  {copiedId === user.id ? (
                    <>
                      <Check className="size-3.5 text-emerald-500" />
                      <span className="hidden sm:inline text-emerald-600 dark:text-emerald-400 font-semibold">
                        Copied
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" />
                      <span className="hidden sm:inline font-medium">Copy Invite</span>
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
                        <Edit className="mr-2 size-4" /> Edit Profile & Role
                      </DropdownMenuItem>
                    )}

                    {isInvited && (
                      <>
                        <DropdownMenuItem onClick={() => handleCopyInviteDetails(user)}>
                          <Copy className="mr-2 size-4 text-amber-600" /> Copy Invite Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setResendModalUser(user)}
                          className="text-primary focus:text-primary"
                        >
                          <Send className="mr-2 size-4" /> Resend Credentials
                        </DropdownMenuItem>
                      </>
                    )}

                    {caps.canManageOverrides && !isInvited && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setResendModalUser(user)}
                          className="text-primary focus:text-primary"
                        >
                          <KeyRound className="mr-2 size-4" /> Reset Password
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
  }, [copiedId, updatingUserId, onEdit]);

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
              <SelectValue placeholder="Filter by Role" />
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
              <SelectValue placeholder="Filter by Status" />
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

      {/* Resend Invite Modal */}
      <Dialog open={!!resendModalUser} onOpenChange={(open) => !open && closeResendModal()}>
        <DialogContent className="sm:max-w-md">
          {resendResult ? (
            <div className="space-y-4 py-2">
              <DialogHeader>
                <div className="mx-auto size-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1">
                  <CheckCircle2 className="size-6" />
                </div>
                <DialogTitle className="text-center text-lg font-bold">
                  New Credentials Generated
                </DialogTitle>
                <DialogDescription className="text-center text-xs">
                  A new temporary password has been issued for <strong>{resendResult.email}</strong>. The user status is set to Invited.
                </DialogDescription>
              </DialogHeader>

              <div className="p-3.5 rounded-xl border bg-muted/30 space-y-2">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <KeyRound className="size-3.5 text-primary" /> New Temporary Password
                </span>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-background border font-mono text-sm font-bold tracking-wide select-all">
                  <span>{resendResult.temporaryPassword}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1"
                    onClick={handleCopyCredentials}
                  >
                    {copiedId === "resend-modal" ? (
                      <Check className="size-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                    {copiedId === "resend-modal" ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" className="w-full" onClick={closeResendModal}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Send className="size-5 text-primary" /> Resend Account Invite
                </DialogTitle>
                <DialogDescription>
                  This will generate a new temporary password for <strong>{resendModalUser?.email}</strong> and send updated login instructions. The user will remain in <strong>Invited</strong> status until they log in and change their password.
                </DialogDescription>
              </DialogHeader>

              <div className="p-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs border border-amber-500/20 flex items-start gap-2">
                <KeyRound className="size-4 shrink-0 mt-0.5" />
                <span>The user will be required to change this new password upon logging in.</span>
              </div>

              <DialogFooter className="pt-2 gap-2">
                <Button type="button" variant="outline" onClick={closeResendModal}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleResendInvite}
                  disabled={isResending}
                  className="gap-1.5"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Issuing...
                    </>
                  ) : (
                    <>
                      <Send className="size-4" /> Reset & Resend Invite
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
