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
import { Button } from "@workspace/ui/components/button";
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
  MoreHorizontal,
  Edit,
  Mail,
  UserCheck,
  UserX,
  KeyRound,
  Send,
  Loader2,
  Copy,
  Check,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

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
  onToggleActive: (user: AdminUser, active: boolean) => void;
  onRefresh?: () => void;
}

export function UserTable({ users, onEdit, onToggleActive, onRefresh }: UserTableProps) {
  const [resendModalUser, setResendModalUser] = React.useState<AdminUser | null>(null);
  const [isResending, setIsResending] = React.useState(false);
  const [resendResult, setResendResult] = React.useState<{
    email: string;
    temporaryPassword: string;
  } | null>(null);
  const [copied, setCopied] = React.useState(false);

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
    setCopied(true);
    toast.success("Credentials copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const closeResendModal = () => {
    setResendModalUser(null);
    setResendResult(null);
    setCopied(false);
  };

  return (
    <>
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User / Employee ID</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Designation & Department</TableHead>
              <TableHead>Account Status</TableHead>
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
              users.map((user) => {
                const caps = user._capabilities || { canEdit: true, canToggleActive: true, canManageOverrides: true };
                const hasAnyAction = caps.canEdit || caps.canManageOverrides;

                return (
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
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={user.isActive}
                            disabled={!caps.canToggleActive}
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
                        {user.mustChangePassword && (
                          <div>
                            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 py-0">
                              <KeyRound className="size-2.5" /> Pending First Login
                            </Badge>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {hasAnyAction ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger className="size-8 p-0 rounded-md hover:bg-accent flex items-center justify-center border border-input">
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            {caps.canEdit && (
                              <DropdownMenuItem onClick={() => onEdit(user)}>
                                <Edit className="mr-2 size-4" /> Edit User Role
                              </DropdownMenuItem>
                            )}
                            {caps.canManageOverrides && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setResendModalUser(user)}
                                  className="text-primary focus:text-primary"
                                >
                                  <Send className="mr-2 size-4" /> Resend Invite
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

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
                  A new temporary password has been issued and sent to {resendResult.email}.
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
                    {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                    {copied ? "Copied" : "Copy"}
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
                  This will generate a new temporary password for <strong>{resendModalUser?.email}</strong> and send updated login instructions.
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
    </>
  );
}
