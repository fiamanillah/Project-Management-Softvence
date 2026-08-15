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
    designationId: z.string().min(1, "Please select a designation"),
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

interface DesignationOption {
  id: string;
  name: string;
  code: string;
  department?: { id: string; name: string };
}

interface CreateUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  designations: DesignationOption[];
  onSuccess: () => void;
}

interface CreatedResult {
  email: string;
  employeeId?: string;
  firstName?: string;
  lastName?: string;
  systemRole: string;
  designationName?: string;
  departmentName?: string;
  temporaryPassword?: string;
}

export function CreateUserModal({
  open,
  onOpenChange,
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
      designationId: "",
      autoGeneratePassword: true,
      password: "",
      sendInviteEmail: true,
    },
    mode: "onTouched",
  });

  const autoGeneratePassword = form.watch("autoGeneratePassword");
  const selectedDesignationId = form.watch("designationId");
  const selectedSystemRole = form.watch("systemRole");

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
        designationId: values.designationId,
        sendInviteEmail: values.sendInviteEmail,
      };

      if (values.employeeId && values.employeeId.trim()) {
        payload.employeeId = values.employeeId.trim();
      }

      if (!values.autoGeneratePassword && values.password?.trim()) {
        payload.password = values.password.trim();
      }

      const res = await api.post("/users", payload);
      const targetDesig = designations.find((d) => d.id === values.designationId);

      setCreatedResult({
        email: res.email || values.email,
        employeeId: res.employeeId || values.employeeId,
        firstName: res.firstName || values.firstName,
        lastName: res.lastName || values.lastName,
        systemRole: res.systemRole || values.systemRole,
        designationName: res.designation?.name || targetDesig?.name,
        departmentName: res.designation?.department?.name || targetDesig?.department?.name,
        temporaryPassword: res.temporaryPassword || values.password,
      });

      toast.success("User account created!");
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
      createdResult.designationName ? `Designation: ${createdResult.designationName}` : "",
      createdResult.departmentName ? `Department: ${createdResult.departmentName}` : "",
      `Role: ${createdResult.systemRole}`,
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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        {createdResult ? (
          <div className="space-y-4 py-2">
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
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="size-5 text-primary" /> Create New User
              </DialogTitle>
              <DialogDescription>
                Fill in the details below. Temporary credentials will be generated.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
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
                              type="email"
                              placeholder="john.doe@company.com"
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

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="systemRole"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs flex items-center gap-1">
                          <Shield className="size-3.5 text-muted-foreground" /> System Role
                        </FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={isLoading}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select role">
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

                  <FormField
                    control={form.control}
                    name="designationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs flex items-center gap-1">
                          <Building2 className="size-3.5 text-muted-foreground" /> Designation
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

                {/* Password option */}
                <div className="p-3 rounded-xl border bg-muted/20 space-y-2.5">
                  <FormField
                    control={form.control}
                    name="autoGeneratePassword"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            id="autoPassword"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormLabel
                          htmlFor="autoPassword"
                          className="text-xs font-medium cursor-pointer font-normal"
                        >
                          Auto-generate temporary password
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  {!autoGeneratePassword && (
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Custom Temporary Password</FormLabel>
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

                <DialogFooter className="pt-2">
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
