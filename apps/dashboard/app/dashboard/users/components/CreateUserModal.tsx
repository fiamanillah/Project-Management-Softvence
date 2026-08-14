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
import { Label } from "@workspace/ui/components/label";
import { Checkbox } from "@workspace/ui/components/checkbox";
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
  CheckCircle2,
  Copy,
  Check,
  UserPlus,
  Mail,
  KeyRound,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { api, handleFormApiError } from "@/lib/api";

const createUserFormSchema = z
  .object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.string().email("Please enter a valid work email address"),
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
}

interface CreateUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  designations: DesignationOption[];
  onSuccess: () => void;
}

interface CreatedResult {
  email: string;
  firstName?: string;
  lastName?: string;
  systemRole: string;
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
      systemRole: "Staff",
      designationId: "",
      autoGeneratePassword: true,
      password: "",
      sendInviteEmail: true,
    },
    mode: "onTouched",
  });

  const autoGeneratePassword = form.watch("autoGeneratePassword");

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
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
        systemRole: values.systemRole,
        designationId: values.designationId,
        sendInviteEmail: values.sendInviteEmail,
      };

      if (!values.autoGeneratePassword && values.password?.trim()) {
        payload.password = values.password.trim();
      }

      const res = await api.post("/users", payload);

      setCreatedResult({
        email: res.email || values.email,
        firstName: res.firstName || values.firstName,
        lastName: res.lastName || values.lastName,
        systemRole: res.systemRole || values.systemRole,
        temporaryPassword: res.temporaryPassword || values.password,
      });

      toast.success("User created and invitation generated!");
    } catch (err: any) {
      const message = handleFormApiError(err, form.setError, "Failed to create user");
      if (message.toLowerCase().includes("already exists")) {
        form.setError("email", { type: "server", message: "A user with this email already exists" });
      }
      toast.error(message);
    }
  };


  const handleCopyCredentials = () => {
    if (!createdResult) return;
    const creds = `Softvence Account Invitation\nEmail: ${createdResult.email}\nTemporary Password: ${createdResult.temporaryPassword}\nLogin URL: ${window.location.origin}/login`;
    navigator.clipboard.writeText(creds);
    setCopied(true);
    toast.success("Credentials copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const isLoading = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        {createdResult ? (
          <div className="space-y-5 py-2">
            <DialogHeader>
              <div className="mx-auto size-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1">
                <CheckCircle2 className="size-6" />
              </div>
              <DialogTitle className="text-center text-lg font-bold">
                User Invitation Generated
              </DialogTitle>
              <DialogDescription className="text-center text-xs">
                The account has been created with temporary credentials. The user will be required to change their password on first login.
              </DialogDescription>
            </DialogHeader>

            {/* Credential summary card */}
            <div className="p-4 rounded-xl border bg-muted/30 space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-border/50">
                <span className="text-muted-foreground font-medium">User:</span>
                <span className="font-semibold text-foreground">
                  {createdResult.firstName} {createdResult.lastName}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pb-2 border-b border-border/50">
                <span className="text-muted-foreground font-medium">Work Email:</span>
                <span className="font-semibold text-foreground">{createdResult.email}</span>
              </div>

              <div className="flex items-center justify-between text-xs pb-2 border-b border-border/50">
                <span className="text-muted-foreground font-medium">System Role:</span>
                <Badge variant="outline" className="text-[11px]">
                  {createdResult.systemRole}
                </Badge>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <KeyRound className="size-3.5 text-primary" /> Temporary Password
                  </span>
                  <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
                    One-time use
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-background border font-mono text-sm font-bold tracking-wide select-all">
                  <span>{createdResult.temporaryPassword}</span>
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
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs">
              <Send className="size-4 shrink-0" />
              <span>Invitation notification and login instructions have been dispatched.</span>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                className="w-full"
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
                <UserPlus className="size-5 text-primary" /> Invite New User
              </DialogTitle>
              <DialogDescription>
                Invite a new team member. Temporary login credentials will be generated for their first sign-in.
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
                        <FormLabel>First Name</FormLabel>
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
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work Email Address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                          <Input
                            type="email"
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

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="systemRole"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>System Role</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={isLoading}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Staff">Staff</SelectItem>
                            <SelectItem value="Admin">Admin</SelectItem>
                            <SelectItem value="SuperAdmin">SuperAdmin</SelectItem>
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
                        <FormLabel>Designation</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={isLoading}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select designation" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {designations.map((d) => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.name} ({d.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Password configuration */}
                <div className="p-3 rounded-xl border bg-muted/20 space-y-3">
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
                          Auto-generate secure temporary password
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
                          <FormLabel>Custom Temporary Password</FormLabel>
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

                  <FormField
                    control={form.control}
                    name="sendInviteEmail"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0 pt-1 border-t border-border/50">
                        <FormControl>
                          <Checkbox
                            id="sendInvite"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormLabel
                          htmlFor="sendInvite"
                          className="text-xs text-muted-foreground cursor-pointer font-normal"
                        >
                          Send invitation email with login credentials
                        </FormLabel>
                      </FormItem>
                    )}
                  />
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
                        <UserPlus className="size-4" /> Create & Invite User
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
