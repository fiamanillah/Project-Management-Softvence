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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

const createOverrideFormSchema = z.object({
  userId: z.string().min(1, "Please select a user"),
  permissionId: z.string().min(1, "Please select a permission to override"),
  isDeny: z.boolean(),
  reason: z.string().optional(),
  expiresAt: z.string().optional(),
});

type CreateOverrideFormValues = z.infer<typeof createOverrideFormSchema>;

interface CreateOverrideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: { id: string; email: string; firstName?: string; lastName?: string }[];
  permissions: { id: string; code: string; module: string; description: string }[];
  onSuccess: () => void;
}

export function CreateOverrideModal({
  open,
  onOpenChange,
  users,
  permissions,
  onSuccess,
}: CreateOverrideModalProps) {
  const form = useForm<CreateOverrideFormValues>({
    resolver: zodResolver(createOverrideFormSchema),
    defaultValues: {
      userId: "",
      permissionId: "",
      isDeny: false,
      reason: "",
      expiresAt: "",
    },
    mode: "onTouched",
  });

  const onSubmit = async (values: CreateOverrideFormValues) => {
    try {
      await api.post("/users/overrides", {
        userId: values.userId,
        permissionId: values.permissionId,
        isDeny: values.isDeny,
        reason: values.reason || undefined,
        expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : undefined,
      });

      toast.success(
        `User permission ${values.isDeny ? "DENIED" : "GRANTED"} override created successfully`,
      );
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to create override");
    }
  };

  const isLoading = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create User Override</DialogTitle>
          <DialogDescription>
            Hand-grant or explicitly deny a specific permission code for a user without changing their designation.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select User</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select target user" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.firstName || u.lastName
                            ? `${u.firstName || ""} ${u.lastName || ""}`
                            : u.email}{" "}
                          ({u.email})
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
              name="permissionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Permission Code</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select permission to override" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {permissions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.code} ({p.module})
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
              name="isDeny"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-xs bg-accent/20 space-y-0">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">Explicit Deny Flag (`is_deny`)</Label>
                    <p className="text-xs text-muted-foreground">
                      Deny overrides short-circuit and win over any existing designation grants.
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isLoading}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason / Note</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Temporary security revocation"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expiresAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiry Date (Optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
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
                Create Override
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
