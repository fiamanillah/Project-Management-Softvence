"use client";

import * as React from "react";
import {
  useForm,
  zodResolver,
  z,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Loader2,
  Clock,
  CheckCircle2,
  UserX,
  ShieldAlert,
  Lock,
  Archive,
  User,
  Mail,
  Building2,
  Shield,
  KeyRound,
  Send,
  Copy,
  Check,
  IdCard,
} from "lucide-react";
import { toast } from "sonner";
import { api, handleFormApiError } from "@/lib/api";
import { HelpTooltip } from "@/components/HelpTooltip";
import type { AdminUser, UserStatus } from "./UserTable";

const editUserFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  employeeId: z.string().min(1, "Employee ID is required"),
  systemRole: z.enum(["SuperAdmin", "Admin", "Staff"]),
  designationId: z.string().min(1, "Please select a designation"),
  status: z.enum(["INVITED", "ACTIVE", "INACTIVE", "SUSPENDED", "LOCKED", "ARCHIVED"]),
});

type EditUserFormValues = z.infer<typeof editUserFormSchema>;

interface EditUserModalProps {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  designations: { id: string; name: string; code: string; department?: { id: string; name: string } }[];
  onSuccess: () => void;
}

export function EditUserModal({
  user,
  open,
  onOpenChange,
  designations,
  onSuccess,
}: EditUserModalProps) {
  const [isResettingPassword, setIsResettingPassword] = React.useState(false);
  const [newTempPassword, setNewTempPassword] = React.useState<string | null>(null);
  const [copiedPassword, setCopiedPassword] = React.useState(false);

  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      employeeId: "",
      systemRole: "Staff",
      designationId: "",
      status: "ACTIVE",
    },
    mode: "onTouched",
  });

  React.useEffect(() => {
    if (user) {
      const defaultStatus: UserStatus =
        user.status || (user.isActive ? "ACTIVE" : "INACTIVE");

      form.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        employeeId: user.employeeId || "",
        systemRole: user.systemRole,
        designationId: user.designationId || user.designation?.id || "",
        status: defaultStatus,
      });
      setNewTempPassword(null);
      setCopiedPassword(false);
    }
  }, [user, form]);

  const selectedDesignationId = form.watch("designationId");
  const selectedRole = form.watch("systemRole");
  const currentWatchedStatus = form.watch("status");

  const activeDesignation = React.useMemo(() => {
    return designations.find((d) => d.id === selectedDesignationId);
  }, [designations, selectedDesignationId]);

  const onSubmit = async (values: EditUserFormValues) => {
    if (!user) return;

    try {
      await api.patch(`/users/${user.id}`, {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        employeeId: values.employeeId.trim(),
        systemRole: values.systemRole,
        designationId: values.designationId || undefined,
        status: values.status,
      });

      toast.success("User management profile updated successfully!");
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      const message = handleFormApiError(err, form.setError, "Failed to update user");
      if (message.toLowerCase().includes("employee id")) {
        form.setError("employeeId", { type: "server", message: "This employee ID is already assigned" });
      }
      toast.error(message);
    }
  };

  const handleResetPassword = async () => {
    if (!user) return;
    setIsResettingPassword(true);
    try {
      const res = await api.post(`/users/${user.id}/resend-invite`, {});
      setNewTempPassword(res.temporaryPassword);
      toast.success("New temporary credentials generated!");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate temporary credentials");
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleCopyPassword = () => {
    if (!newTempPassword || !user) return;
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
      `Temporary Password: ${newTempPassword}`,
      `Login URL: ${window.location.origin}/login`,
      "Status: Invited (Pending First Login & Password Setup)",
      "",
      "Please log in at the portal with your temporary credentials to establish your permanent password.",
    ]
      .filter((l) => l !== "")
      .join("\n");

    navigator.clipboard.writeText(lines);
    setCopiedPassword(true);
    toast.success("Login info & password copied to clipboard!");
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  if (!user) return null;

  const isLoading = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base border border-primary/20 shrink-0">
              {user.firstName ? user.firstName[0]?.toUpperCase() : "U"}
              {user.lastName ? user.lastName[0]?.toUpperCase() : ""}
            </div>
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <span>
                  {user.firstName || user.lastName
                    ? `${user.firstName || ""} ${user.lastName || ""}`
                    : "User Profile"}
                </span>
                <Badge variant="outline" className="text-xs font-medium">
                  {user.systemRole}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs flex items-center gap-2 mt-0.5">
                <Mail className="size-3.5 text-muted-foreground" /> {user.email}
                {user.employeeId && (
                  <>
                    <span>•</span>
                    <span className="font-mono">{user.employeeId}</span>
                  </>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-2">
            {/* Personal Details */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <User className="size-3.5 text-primary" /> Identity & Profile
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="First Name" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Last Name" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs flex items-center gap-1">
                        <IdCard className="size-3.5 text-muted-foreground" /> Employee ID
                        <HelpTooltip text="Unique company identification code assigned to this employee." />
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. EMP-10023"
                          {...field}
                          disabled={isLoading}
                          className="font-mono text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <label className="text-xs font-medium leading-none flex items-center gap-1 mb-2 text-foreground/80">
                    <Mail className="size-3.5 text-muted-foreground" /> Work Email (Primary ID)
                    <HelpTooltip text="Account email address is permanent and used as the primary login identifier." />
                  </label>
                  <Input
                    value={user.email}
                    readOnly
                    disabled
                    className="bg-muted/40 cursor-not-allowed opacity-90 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Role & Designation */}
            <div className="space-y-3 pt-2 border-t">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="size-3.5 text-primary" /> Role & Organizational Placement
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="systemRole"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs flex items-center gap-1">
                        <Shield className="size-3.5 text-muted-foreground" /> System Role
                        <HelpTooltip text="SuperAdmin has unrestricted system access, Admin manages departments and staff, and Staff operates with standard role-scoped permissions." />
                      </FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isLoading}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select system role">
                              {selectedRole || undefined}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="w-full">
                          <SelectItem value="Staff">
                            <span className="font-medium">Staff</span>
                          </SelectItem>
                          <SelectItem value="Admin">
                            <span className="font-medium text-blue-600 dark:text-blue-400">Admin</span>
                          </SelectItem>
                          <SelectItem value="SuperAdmin">
                            <span className="font-medium text-purple-600 dark:text-purple-400">SuperAdmin</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="designationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs flex items-center gap-1">
                        <Building2 className="size-3.5 text-muted-foreground" /> Designation & Department
                        <HelpTooltip text="Assigns job designation and automatically inherits department-level operational RBAC permissions." />
                      </FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isLoading}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select designation">
                              {activeDesignation
                                ? `${activeDesignation.name} (${activeDesignation.code})`
                                : undefined}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="w-full max-h-56">
                          {designations.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{d.name} ({d.code})</span>
                                {d.department && (
                                  <span className="text-[10.5px] text-muted-foreground">
                                    Dept: {d.department.name}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Account Lifecycle & Security */}
            <div className="space-y-3 pt-2 border-t">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="size-3.5 text-primary" /> Lifecycle Status & Access Control
              </h3>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs flex items-center gap-1">
                      Account Status
                      <HelpTooltip text="Active: Full access. Invited: Can login to set password. Inactive/Suspended/Locked/Archived: Login is blocked and active sessions are revoked immediately." />
                    </FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue placeholder="Select account status">
                            {currentWatchedStatus === "INVITED" && "Invited (Pending Setup & Password)"}
                            {currentWatchedStatus === "ACTIVE" && "Active (Operational Access)"}
                            {currentWatchedStatus === "INACTIVE" && "Inactive (Temporarily Deactivated)"}
                            {currentWatchedStatus === "SUSPENDED" && "Suspended (Disciplinary Lock)"}
                            {currentWatchedStatus === "LOCKED" && "Locked (Access Blocked)"}
                            {currentWatchedStatus === "ARCHIVED" && "Archived (Offboarded)"}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="w-full">
                        <SelectItem value="INVITED">
                          <div className="flex items-center gap-2">
                            <Clock className="size-4 text-amber-600" />
                            <div>
                              <span className="font-semibold text-amber-700 dark:text-amber-400">Invited</span>
                              <span className="text-[11px] text-muted-foreground ml-2">
                                (Can log in with temporary credentials to set password)
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="ACTIVE">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="size-4 text-emerald-600" />
                            <div>
                              <span className="font-semibold text-emerald-700 dark:text-emerald-400">Active</span>
                              <span className="text-[11px] text-muted-foreground ml-2">
                                (Full active access enabled)
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="INACTIVE">
                          <div className="flex items-center gap-2">
                            <UserX className="size-4 text-slate-600" />
                            <div>
                              <span className="font-semibold text-slate-700 dark:text-slate-400">Inactive</span>
                              <span className="text-[11px] text-muted-foreground ml-2">
                                (Deactivated, sessions terminated)
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="SUSPENDED">
                          <div className="flex items-center gap-2">
                            <ShieldAlert className="size-4 text-rose-600" />
                            <div>
                              <span className="font-semibold text-rose-700 dark:text-rose-400">Suspended</span>
                              <span className="text-[11px] text-muted-foreground ml-2">
                                (Security or disciplinary hold)
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="LOCKED">
                          <div className="flex items-center gap-2">
                            <Lock className="size-4 text-orange-600" />
                            <div>
                              <span className="font-semibold text-orange-700 dark:text-orange-400">Locked</span>
                              <span className="text-[11px] text-muted-foreground ml-2">
                                (Login blocked)
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="ARCHIVED">
                          <div className="flex items-center gap-2">
                            <Archive className="size-4 text-zinc-600" />
                            <div>
                              <span className="font-semibold text-zinc-700 dark:text-zinc-400">Archived</span>
                              <span className="text-[11px] text-muted-foreground ml-2">
                                (Historical offboarded record)
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password & Credential management block */}
              <div className="p-3.5 rounded-xl border bg-muted/20 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <KeyRound className="size-3.5 text-primary" /> Temporary Password Reset
                  </span>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5 shrink-0"
                    onClick={handleResetPassword}
                    disabled={isResettingPassword || isLoading}
                  >
                    {isResettingPassword ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <KeyRound className="size-3.5 text-primary" />
                    )}
                    Generate New Password
                  </Button>
                </div>

                {newTempPassword && (
                  <div className="p-3 rounded-lg bg-background border space-y-2.5 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                        New Temporary Password:
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 px-2.5 text-xs gap-1.5"
                        onClick={handleCopyPassword}
                      >
                        {copiedPassword ? (
                          <Check className="size-3.5 text-emerald-300" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                        {copiedPassword ? "Copied!" : "Copy Credentials"}
                      </Button>
                    </div>
                    <div className="p-2.5 rounded bg-muted/40 font-mono text-sm font-bold text-foreground select-all text-center tracking-wider">
                      {newTempPassword}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="pt-3 border-t flex sm:justify-between items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="gap-1.5">
                {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
