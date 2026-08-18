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
import { ScrollArea } from "@workspace/ui/components/scroll-area";
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
  ShieldCheck,
  Briefcase,
  KeyRound,
  Send,
  Copy,
  Check,
  IdCard,
} from "lucide-react";
import { toast } from "sonner";
import { api, handleFormApiError } from "@/lib/api";
import { HelpTooltip } from "@/components/HelpTooltip";
import { AvatarUpload } from "@/components/AvatarUpload";
import type { AdminUser, UserStatus } from "./UserTable";

const editUserFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  employeeId: z.string().min(1, "Employee ID is required"),
  systemRole: z.enum(["SuperAdmin", "Admin", "Staff"]),
  roleId: z.string().min(1, "Please select a security role"),
  designationId: z.string().optional(),
  status: z.enum(["INVITED", "ACTIVE", "INACTIVE", "SUSPENDED", "LOCKED", "ARCHIVED"]),
});

type EditUserFormValues = z.infer<typeof editUserFormSchema>;

interface RoleOption {
  id: string;
  name: string;
  code: string;
  department?: { id: string; name: string } | null;
}

interface DesignationOption {
  id: string;
  name: string;
  code: string;
  department?: { id: string; name: string } | null;
}

interface EditUserModalProps {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: RoleOption[];
  designations: DesignationOption[];
  onSuccess: () => void;
}

export function EditUserModal({
  user,
  open,
  onOpenChange,
  roles,
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
      roleId: "",
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
        roleId: user.roleId || user.role?.id || (user as any).designationId || "",
        designationId: user.designationId || user.designation?.id || "",
        status: defaultStatus,
      });
      setNewTempPassword(null);
      setCopiedPassword(false);
    }
  }, [user, form]);

  const selectedRoleId = form.watch("roleId");
  const selectedDesignationId = form.watch("designationId");
  const selectedRole = form.watch("systemRole");
  const currentWatchedStatus = form.watch("status");

  const activeRole = React.useMemo(() => {
    return roles.find((r) => r.id === selectedRoleId);
  }, [roles, selectedRoleId]);

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
        roleId: values.roleId,
        designationId: values.designationId === "NONE" || !values.designationId ? null : values.designationId,
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
      user.role?.name ? `Role: ${user.role.name}` : "",
      user.designation?.name ? `Job Title: ${user.designation.name}` : "",
      user.role?.department?.name || user.designation?.department?.name ? `Department: ${user.role?.department?.name || user.designation?.department?.name}` : "",
      `System Role: ${user.systemRole}`,
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
      <DialogContent className="w-[95vw] sm:max-w-2xl sm:min-w-[680px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
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
              <DialogDescription className="text-xs flex items-center gap-2 mt-0.5 text-muted-foreground">
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <ScrollArea className="max-h-[60vh] h-[460px] w-full px-6 py-2">
              <div className="space-y-5 pr-2">
                {/* Avatar & Profile Picture */}
                <div className="p-3.5 rounded-lg border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-0.5 text-center sm:text-left">
                    <h4 className="text-xs font-semibold text-foreground">User Avatar</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Upload or change profile picture for this account.
                    </p>
                  </div>
                  <AvatarUpload
                    currentAvatarUrl={user.avatarUrl}
                    fallbackName={`${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email}
                    size="md"
                    uploadEndpoint={`/users/${user.id}/avatar`}
                    removeEndpoint={`/users/${user.id}/avatar`}
                    onAvatarChange={() => {
                      if (onSuccess) onSuccess();
                    }}
                    showHelpText={false}
                  />
                </div>

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

                {/* Roles and Security Tier */}
                <div className="space-y-3 pt-2 border-t">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-primary" /> Authorization & Job Title
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="roleId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs flex items-center gap-1 font-semibold text-foreground">
                            <ShieldCheck className="size-3.5 text-primary" /> Authorization Role <span className="text-destructive">*</span>
                          </FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={isLoading}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select role">
                                  {activeRole
                                    ? `${activeRole.name} (${activeRole.code})`
                                    : undefined}
                                </SelectValue>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="w-full max-h-56">
                              {roles.map((r) => (
                                <SelectItem key={r.id} value={r.id}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{r.name} ({r.code})</span>
                                    {r.department && (
                                      <span className="text-[10px] text-muted-foreground">
                                        {r.department.name}
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

                    <FormField
                      control={form.control}
                      name="systemRole"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs flex items-center gap-1">
                            <Shield className="size-3.5 text-muted-foreground" /> System Tier
                          </FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={isLoading}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select system tier">
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
                  </div>

                  {/* Optional Job Title */}
                  <FormField
                    control={form.control}
                    name="designationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs flex items-center gap-1">
                          <Briefcase className="size-3.5 text-muted-foreground" /> Job Title / Designation (Optional)
                        </FormLabel>
                        <Select
                          value={field.value || "NONE"}
                          onValueChange={(val) => field.onChange(val === "NONE" ? "" : val)}
                          disabled={isLoading}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="None / Select HR designation">
                                {activeDesignation
                                  ? `${activeDesignation.name} (${activeDesignation.code})`
                                  : "None / Unassigned"}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="w-full max-h-56">
                            <SelectItem value="NONE" className="text-xs text-muted-foreground">
                              None / Unassigned
                            </SelectItem>
                            {designations.map((d) => (
                              <SelectItem key={d.id} value={d.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{d.name} ({d.code})</span>
                                  {d.department && (
                                    <span className="text-[10px] text-muted-foreground">
                                      {d.department.name}
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

                {/* Account Status Management */}
                <div className="space-y-3 pt-2 border-t">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="size-3.5 text-primary" /> Lifecycle & Status
                  </h3>

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Account Lifecycle Status</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={isLoading}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select Status">
                                {currentWatchedStatus || undefined}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="w-full">
                            <SelectItem value="ACTIVE">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="size-4 text-emerald-500" />
                                <span className="font-medium">Active (Full operational access)</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="INVITED">
                              <div className="flex items-center gap-2">
                                <Clock className="size-4 text-blue-500" />
                                <span className="font-medium">Invited (Pending password setup)</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="INACTIVE">
                              <div className="flex items-center gap-2">
                                <UserX className="size-4 text-slate-400" />
                                <span className="font-medium">Inactive (Temporarily disabled)</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="SUSPENDED">
                              <div className="flex items-center gap-2">
                                <ShieldAlert className="size-4 text-amber-500" />
                                <span className="font-medium">Suspended (Access revoked)</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="LOCKED">
                              <div className="flex items-center gap-2">
                                <Lock className="size-4 text-rose-500" />
                                <span className="font-medium">Locked (Security lockdown)</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="ARCHIVED">
                              <div className="flex items-center gap-2">
                                <Archive className="size-4 text-zinc-400" />
                                <span className="font-medium">Archived (Offboarded/Historical)</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Resend Invite & Temporary Password Box */}
                <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <KeyRound className="size-3.5 text-primary" /> Credentials & Invitation
                      </span>
                      <p className="text-[11px] text-muted-foreground">
                        Regenerate credentials and invite the user with fresh temporary login details.
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleResetPassword}
                      disabled={isResettingPassword || isLoading}
                      className="gap-1.5 shrink-0"
                    >
                      {isResettingPassword ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" /> Generating...
                        </>
                      ) : (
                        <>
                          <Send className="size-3.5" /> Issue New Credentials
                        </>
                      )}
                    </Button>
                  </div>

                  {newTempPassword && (
                    <div className="p-3 rounded-lg bg-background border border-primary/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          New Temporary Password:
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyPassword}
                          className="h-7 text-xs gap-1 text-primary hover:text-primary"
                        >
                          {copiedPassword ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                          {copiedPassword ? "Copied!" : "Copy Full Details"}
                        </Button>
                      </div>
                      <div className="p-2 rounded bg-muted/40 font-mono text-sm font-bold text-center tracking-wider select-all">
                        {newTempPassword}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="p-6 pt-3 border-t mt-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="gap-1.5">
                {isLoading && <Loader2 className="size-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
