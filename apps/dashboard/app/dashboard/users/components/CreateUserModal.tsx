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
import { Checkbox } from "@workspace/ui/components/checkbox";
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
  CheckCircle2,
  Copy,
  Check,
  UserPlus,
  Mail,
  KeyRound,
  IdCard,
  Building2,
  Shield,
  ShieldCheck,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { api, handleFormApiError } from "@/lib/api";
import { HelpTooltip } from "@/components/HelpTooltip";

const createUserFormSchema = z
  .object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.string().email("Please enter a valid work email address"),
    employeeId: z.string().trim().optional(),
    systemRole: z.enum(["SuperAdmin", "Admin", "Staff"]),
    roleId: z.string().min(1, "Please select a security role"),
    designationId: z.string().optional(),
    autoGeneratePassword: z.boolean(),
    password: z.string().optional(),
    sendInviteEmail: z.boolean(),
  })
  .refine(
    (data: { autoGeneratePassword: boolean; password?: string }) => {
      if (!data.autoGeneratePassword) {
        return !!data.password && data.password.trim().length >= 8;
      }
      return true;
    },
    {
      message: "Custom password must be at least 8 characters",
      path: ["password"],
    },
  );

type CreateUserFormValues = z.infer<typeof createUserFormSchema>;

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

interface CreateUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: RoleOption[];
  designations: DesignationOption[];
  onSuccess: () => void;
}

interface CreatedResult {
  email: string;
  employeeId?: string;
  firstName?: string;
  lastName?: string;
  systemRole: string;
  roleName?: string;
  designationName?: string;
  departmentName?: string;
  temporaryPassword?: string;
}

export function CreateUserModal({
  open,
  onOpenChange,
  roles,
  designations,
  onSuccess,
}: CreateUserModalProps) {
  const [createdResult, setCreatedResult] = React.useState<CreatedResult | null>(null);
  const [copied, setCopied] = React.useState(false);

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      employeeId: "",
      systemRole: "Staff",
      roleId: "",
      designationId: "",
      autoGeneratePassword: true,
      password: "",
      sendInviteEmail: true,
    },
    mode: "onTouched",
  });

  const autoGeneratePassword = form.watch("autoGeneratePassword");
  const sendInviteEmail = form.watch("sendInviteEmail");
  const selectedRoleId = form.watch("roleId");
  const selectedDesignationId = form.watch("designationId");
  const selectedSystemRole = form.watch("systemRole");

  const activeRole = React.useMemo(() => {
    return roles.find((r) => r.id === selectedRoleId);
  }, [roles, selectedRoleId]);

  const activeDesignation = React.useMemo(() => {
    return designations.find((d) => d.id === selectedDesignationId);
  }, [designations, selectedDesignationId]);

  const resetAll = () => {
    form.reset();
    setCreatedResult(null);
    setCopied(false);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      if (createdResult) {
        onSuccess();
      }
      resetAll();
    }
    onOpenChange(isOpen);
  };

  const onSubmit = async (values: CreateUserFormValues) => {
    try {
      const payload: any = {
        email: values.email.trim(),
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        systemRole: values.systemRole,
        roleId: values.roleId,
        designationId: values.designationId === "NONE" || !values.designationId ? null : values.designationId,
        sendInviteEmail: values.sendInviteEmail,
      };

      if (values.employeeId && values.employeeId.trim()) {
        payload.employeeId = values.employeeId.trim();
      }

      if (!values.autoGeneratePassword && values.password?.trim()) {
        payload.password = values.password.trim();
      }

      const res = await api.post("/users", payload);
      const targetRole = roles.find((r) => r.id === values.roleId);
      const targetDesig = designations.find((d) => d.id === values.designationId);

      setCreatedResult({
        email: res.email || values.email,
        employeeId: res.employeeId || values.employeeId,
        firstName: res.firstName || values.firstName,
        lastName: res.lastName || values.lastName,
        systemRole: res.systemRole || values.systemRole,
        roleName: res.role?.name || targetRole?.name,
        designationName: res.designation?.name || targetDesig?.name,
        departmentName: res.role?.department?.name || res.designation?.department?.name || targetRole?.department?.name,
        temporaryPassword: res.temporaryPassword || values.password,
      });

      toast.success("User account created successfully!");
    } catch (err: any) {
      const message = handleFormApiError(err, form.setError, "Failed to create user");
      if (message.toLowerCase().includes("email already exists")) {
        form.setError("email", { type: "server", message: "A user with this email already exists" });
      }
      if (message.toLowerCase().includes("employee id")) {
        form.setError("employeeId", { type: "server", message: "A user with this Employee ID already exists" });
      }
      toast.error(message);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdResult) return;
    const lines = [
      "==================================",
      " SOFTVENCE ACCOUNT INVITATION",
      "==================================",
      `Name: ${createdResult.firstName || ""} ${createdResult.lastName || ""}`.trim(),
      `Email: ${createdResult.email}`,
      createdResult.employeeId ? `Employee ID: ${createdResult.employeeId}` : "",
      createdResult.roleName ? `Role: ${createdResult.roleName}` : "",
      createdResult.designationName ? `Job Title: ${createdResult.designationName}` : "",
      createdResult.departmentName ? `Department: ${createdResult.departmentName}` : "",
      `System Role: ${createdResult.systemRole}`,
      `Temporary Password: ${createdResult.temporaryPassword || ""}`,
      `Login URL: ${window.location.origin}/login`,
      "Status: Invited (Pending First Login & Password Setup)",
      "",
      "Please log in at the portal with your temporary credentials to establish your permanent password.",
    ]
      .filter((l) => l !== "")
      .join("\n");

    navigator.clipboard.writeText(lines);
    setCopied(true);
    toast.success("Login info & password copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const isLoading = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] sm:max-w-xl sm:min-w-[620px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {createdResult ? (
          <div className="p-6 space-y-4">
            <DialogHeader>
              <div className="mx-auto size-11 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1">
                <CheckCircle2 className="size-6" />
              </div>
              <DialogTitle className="text-center text-lg font-bold">
                User Created Successfully
              </DialogTitle>
              <DialogDescription className="text-center text-xs">
                Copy credentials below to share with the user.
              </DialogDescription>
            </DialogHeader>

            <div className="p-3.5 rounded-xl border bg-muted/30 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-semibold text-foreground">
                  {createdResult.firstName} {createdResult.lastName}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-semibold text-foreground">{createdResult.email}</span>
              </div>

              {createdResult.employeeId && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Employee ID:</span>
                  <span className="font-mono font-medium text-foreground">{createdResult.employeeId}</span>
                </div>
              )}

              {createdResult.roleName && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Security Role:</span>
                  <span className="font-semibold text-primary">{createdResult.roleName}</span>
                </div>
              )}

              {createdResult.designationName && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Job Title / Designation:</span>
                  <span className="font-medium text-foreground">{createdResult.designationName}</span>
                </div>
              )}

              <div className="pt-2 border-t space-y-1.5">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <KeyRound className="size-3.5 text-primary" /> Temporary Password
                </span>
                <div className="p-2.5 rounded-lg bg-background border font-mono text-sm font-bold text-foreground select-all text-center tracking-wider">
                  {createdResult.temporaryPassword}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                className="w-full sm:w-1/2 gap-1.5"
                onClick={handleCopyCredentials}
              >
                {copied ? <Check className="size-4 text-emerald-300" /> : <Copy className="size-4" />}
                {copied ? "Copied!" : "Copy Credentials"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-1/2"
                onClick={() => handleClose(false)}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <DialogHeader className="p-6 pb-2">
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <UserPlus className="size-5 text-primary" /> Create New User
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Provision a user account with security authorization roles and corporate job titles.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
                <ScrollArea className="max-h-[60vh] h-[450px] w-full px-6 py-2">
                  <div className="space-y-4 pr-2">
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John" {...field} disabled={isLoading} />
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
                              <Input placeholder="Doe" {...field} disabled={isLoading} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Work Email</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                                <Input
                                  placeholder="john.doe@company.com"
                                  className="pl-9"
                                  {...field}
                                  disabled={isLoading}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="employeeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs flex items-center gap-1">
                              <IdCard className="size-3.5 text-muted-foreground" /> Employee ID
                              <HelpTooltip text="Optional. Leave empty to auto-generate." />
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. EMP-10023"
                                className="font-mono text-sm"
                                {...field}
                                disabled={isLoading}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Role and System Role */}
                    <div className="grid grid-cols-2 gap-3">
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
                                    {selectedSystemRole || undefined}
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

                    {/* Optional Designation (Job Title) */}
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
                              <SelectItem value="NONE" className="text-xs font-medium text-muted-foreground">
                                None / Unassigned (No HR Tag)
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

                    {/* Email Invitation Option */}
                    <FormField
                      control={form.control}
                      name="sendInviteEmail"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 bg-muted/20">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={isLoading}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-xs font-semibold cursor-pointer">
                              Send Invitation Email
                            </FormLabel>
                            <p className="text-[11px] text-muted-foreground">
                              An invitation with setup instructions will be sent automatically.
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />

                    {/* Manual Password Option */}
                    {!sendInviteEmail && (
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              Initial Password <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <KeyRound className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                                <Input
                                  type="password"
                                  placeholder="Min. 8 characters"
                                  className="pl-9 text-sm"
                                  {...field}
                                  disabled={isLoading}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </ScrollArea>

                <DialogFooter className="p-6 pt-3 border-t mt-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleClose(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading} className="gap-1.5">
                    {isLoading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Creating...
                      </>
                    ) : (
                      <>
                        <UserPlus className="size-4" /> Create User
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
