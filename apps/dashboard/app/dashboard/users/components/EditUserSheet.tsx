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
  FormDescription,
} from "@workspace/ui/components/form";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Button } from "@workspace/ui/components/button";
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
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { api, handleFormApiError } from "@/lib/api";
import type { AdminUser, UserStatus } from "./UserTable";

const editUserFormSchema = z.object({
  systemRole: z.enum(["SuperAdmin", "Admin", "Staff"]),
  designationId: z.string().min(1, "Please select a designation"),
  status: z.enum(["INVITED", "ACTIVE", "INACTIVE", "SUSPENDED", "LOCKED", "ARCHIVED"]),
});

type EditUserFormValues = z.infer<typeof editUserFormSchema>;

interface EditUserSheetProps {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  designations: { id: string; name: string; code: string }[];
  onSuccess: () => void;
}

export function EditUserSheet({
  user,
  open,
  onOpenChange,
  designations,
  onSuccess,
}: EditUserSheetProps) {
  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserFormSchema),
    defaultValues: {
      systemRole: "Staff",
      designationId: "",
      status: "ACTIVE",
    },
    mode: "onTouched",
  });

  React.useEffect(() => {
    if (user) {
      const defaultStatus: UserStatus =
        user.status ||
        (user.isActive ? "ACTIVE" : "INACTIVE");

      form.reset({
        systemRole: user.systemRole,
        designationId: user.designationId || user.designation?.id || "",
        status: defaultStatus,
      });
    }
  }, [user, form]);

  const onSubmit = async (values: EditUserFormValues) => {
    if (!user) return;

    try {
      await api.patch(`/users/${user.id}`, {
        systemRole: values.systemRole,
        designationId: values.designationId || undefined,
        status: values.status,
      });

      toast.success("User profile and status updated successfully!");
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      const message = handleFormApiError(err, form.setError, "Failed to update user");
      toast.error(message);
    }
  };

  if (!user) return null;

  const isLoading = form.formState.isSubmitting;
  const currentWatchedStatus = form.watch("status");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit User Profile & Status</SheetTitle>
          <SheetDescription>
            Manage roles, designations, and account lifecycle states for{" "}
            <strong>{user.firstName} {user.lastName}</strong> ({user.email}).
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-6">
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
                        <SelectValue placeholder="Select system role" />
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
                  <FormLabel>Designation & Department</FormLabel>
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

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Status</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select account status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="INVITED">
                        <div className="flex items-center gap-2">
                          <Clock className="size-4 text-amber-600" />
                          <div>
                            <span className="font-medium text-amber-600">Invited</span>
                            <span className="text-[11px] text-muted-foreground ml-2">(Pending first login & password change)</span>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="ACTIVE">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="size-4 text-emerald-600" />
                          <div>
                            <span className="font-medium text-emerald-600">Active</span>
                            <span className="text-[11px] text-muted-foreground ml-2">(Fully operational access)</span>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="INACTIVE">
                        <div className="flex items-center gap-2">
                          <UserX className="size-4 text-slate-600" />
                          <div>
                            <span className="font-medium text-slate-600">Inactive</span>
                            <span className="text-[11px] text-muted-foreground ml-2">(Temporarily deactivated)</span>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="SUSPENDED">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="size-4 text-rose-600" />
                          <div>
                            <span className="font-medium text-rose-600">Suspended</span>
                            <span className="text-[11px] text-muted-foreground ml-2">(Disciplinary / security lock)</span>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="LOCKED">
                        <div className="flex items-center gap-2">
                          <Lock className="size-4 text-orange-600" />
                          <div>
                            <span className="font-medium text-orange-600">Locked</span>
                            <span className="text-[11px] text-muted-foreground ml-2">(Login attempts blocked)</span>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="ARCHIVED">
                        <div className="flex items-center gap-2">
                          <Archive className="size-4 text-zinc-600" />
                          <div>
                            <span className="font-medium text-zinc-600">Archived</span>
                            <span className="text-[11px] text-muted-foreground ml-2">(Offboarded historical user)</span>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    {currentWatchedStatus === "INVITED" && (
                      <span className="text-amber-600 flex items-center gap-1 mt-1">
                        <Info className="size-3.5" /> User can log in with temporary credentials to change password. Admins can assign them to departments and projects.
                      </span>
                    )}
                    {currentWatchedStatus === "ACTIVE" && (
                      <span className="text-emerald-600 flex items-center gap-1 mt-1">
                        <Info className="size-3.5" /> User has full active access according to their role permissions.
                      </span>
                    )}
                    {["INACTIVE", "SUSPENDED", "LOCKED", "ARCHIVED"].includes(currentWatchedStatus) && (
                      <span className="text-rose-600 flex items-center gap-1 mt-1">
                        <Info className="size-3.5" /> User will be immediately logged out of all active sessions and denied login access.
                      </span>
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
