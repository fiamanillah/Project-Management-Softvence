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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

const createDelegationFormSchema = z
  .object({
    delegatorId: z.string().min(1, "Please select a delegator"),
    delegateeId: z.string().min(1, "Please select a delegatee"),
    scope: z.string(),
    validFrom: z.string().min(1, "Valid start date is required"),
    validUntil: z.string().min(1, "Valid end date is required"),
  })
  .refine((data: { delegatorId: string; delegateeId: string }) => data.delegatorId !== data.delegateeId, {
    message: "Delegator and delegatee cannot be the same user",
    path: ["delegateeId"],
  })
  .refine((data: { validFrom: string; validUntil: string }) => new Date(data.validUntil) >= new Date(data.validFrom), {
    message: "Expiry date must be on or after start date",
    path: ["validUntil"],
  });

type CreateDelegationFormValues = z.infer<typeof createDelegationFormSchema>;

interface CreateDelegationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: { id: string; email: string; firstName?: string; lastName?: string }[];
  onSuccess: () => void;
}

export function CreateDelegationModal({
  open,
  onOpenChange,
  users,
  onSuccess,
}: CreateDelegationModalProps) {
  const form = useForm<CreateDelegationFormValues>({
    resolver: zodResolver(createDelegationFormSchema),
    defaultValues: {
      delegatorId: "",
      delegateeId: "",
      scope: "*",
      validFrom: "",
      validUntil: "",
    },
    mode: "onTouched",
  });

  const onSubmit = async (values: CreateDelegationFormValues) => {
    try {
      await api.post("/users/delegations", {
        delegatorId: values.delegatorId,
        delegateeId: values.delegateeId,
        scope: values.scope || "*",
        validFrom: new Date(values.validFrom).toISOString(),
        validUntil: new Date(values.validUntil).toISOString(),
      });

      toast.success("Delegation created successfully");
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to create delegation");
    }
  };

  const isLoading = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Delegation</DialogTitle>
          <DialogDescription>
            Temporarily delegate a user's permissions to another employee for a specific validity window.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="delegatorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delegator (Owner of permissions)</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select delegator" />
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
              name="delegateeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delegatee (Recipient)</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select delegatee" />
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
              name="scope"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scope Boundary</FormLabel>
                  <FormControl>
                    <Input placeholder="*" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="validFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valid From</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="validUntil"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valid Until</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                Create Delegation
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
