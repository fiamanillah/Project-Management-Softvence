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
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { UserSearchSelect } from "@/components/user-search-select";
import { UserCheck, Loader2, Calendar, Lock } from "lucide-react";
import { toast } from "sonner";
import { api, handleFormApiError } from "@/lib/api";
import { HelpTooltip } from "./HelpTooltip";
import type { UserSummary } from "../types";

const SCOPE_PRESETS = [
  { label: "* (All)", value: "*" },
  { label: "project.*", value: "project.*" },
  { label: "organization.*", value: "organization.*" },
];

const DURATION_PRESETS = [
  { label: "1 Day", hours: 24 },
  { label: "7 Days", hours: 24 * 7 },
  { label: "14 Days", hours: 24 * 14 },
  { label: "30 Days", hours: 24 * 30 },
];

const createDelegationFormSchema = z
  .object({
    delegatorId: z.string().min(1, "Please select a delegator"),
    delegateeId: z.string().min(1, "Please select a delegatee"),
    scope: z.string().min(1, "Scope is required"),
    validFrom: z.string().min(1, "Start date and time are required"),
    validUntil: z.string().min(1, "End date and time are required"),
  })
  .refine((data) => data.delegatorId !== data.delegateeId, {
    message: "Delegator and delegatee cannot be the same user",
    path: ["delegateeId"],
  })
  .refine(
    (data) => {
      const from = new Date(data.validFrom).getTime();
      const until = new Date(data.validUntil).getTime();
      return !isNaN(from) && !isNaN(until) && until >= from;
    },
    {
      message: "End date must be on or after start date",
      path: ["validUntil"],
    }
  );

type CreateDelegationFormValues = z.infer<typeof createDelegationFormSchema>;

interface CreateDelegationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: UserSummary[];
  onSuccess: () => void;
}

export function CreateDelegationModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateDelegationModalProps) {
  const getInitialDates = () => {
    const now = new Date();
    const until = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const format = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hoursStr = String(d.getHours()).padStart(2, "0");
      const minutesStr = String(d.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day}T${hoursStr}:${minutesStr}`;
    };
    return { from: format(now), until: format(until) };
  };

  const initialDates = React.useMemo(() => getInitialDates(), [open]);

  const form = useForm<CreateDelegationFormValues>({
    resolver: zodResolver(createDelegationFormSchema),
    defaultValues: {
      delegatorId: "",
      delegateeId: "",
      scope: "*",
      validFrom: initialDates.from,
      validUntil: initialDates.until,
    },
    mode: "onTouched",
  });

  React.useEffect(() => {
    if (open) {
      const dates = getInitialDates();
      form.setValue("validFrom", dates.from);
      form.setValue("validUntil", dates.until);
    }
  }, [open, form]);

  const handleApplyDurationPreset = (hours: number) => {
    const fromDate = form.getValues("validFrom")
      ? new Date(form.getValues("validFrom"))
      : new Date();
    const until = new Date(fromDate.getTime() + hours * 60 * 60 * 1000);
    const year = until.getFullYear();
    const month = String(until.getMonth() + 1).padStart(2, "0");
    const day = String(until.getDate()).padStart(2, "0");
    const hoursStr = String(until.getHours()).padStart(2, "0");
    const minutesStr = String(until.getMinutes()).padStart(2, "0");
    form.setValue("validUntil", `${year}-${month}-${day}T${hoursStr}:${minutesStr}`, {
      shouldValidate: true,
    });
  };

  const selectedDelegatorId = form.watch("delegatorId");

  const onSubmit = async (values: CreateDelegationFormValues) => {
    try {
      await api.post("/users/delegations", {
        delegatorId: values.delegatorId,
        delegateeId: values.delegateeId,
        scope: values.scope.trim() || "*",
        validFrom: new Date(values.validFrom).toISOString(),
        validUntil: new Date(values.validUntil).toISOString(),
      });

      toast.success("User delegation window created successfully");
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      handleFormApiError(err, form.setError);
      toast.error(err.message || "Failed to create delegation");
    }
  };

  const isLoading = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-xl sm:min-w-[580px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <UserCheck className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Create User Delegation
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Temporarily delegate operational permissions to another user for a time window.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <ScrollArea className="max-h-[60vh] h-[440px] w-full px-6 py-2">
              <div className="space-y-4 pr-2">
                {/* Delegator (Source) */}
                <FormField
                  control={form.control}
                  name="delegatorId"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-1.5">
                        <FormLabel>Delegator (Grantor User)</FormLabel>
                        <HelpTooltip text="The user whose permissions and designation role grants will be temporarily inherited." />
                      </div>
                      <FormControl>
                        <UserSearchSelect
                          value={field.value}
                          onValueChange={(val) => {
                            field.onChange(val);
                            // If delegatee is currently the same as new delegator, clear delegatee
                            if (form.getValues("delegateeId") === val) {
                              form.setValue("delegateeId", "");
                            }
                          }}
                          placeholder="Search and select grantor user..."
                          searchPlaceholder="Search delegator by name, email, or employee ID..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Delegatee (Recipient) */}
                <FormField
                  control={form.control}
                  name="delegateeId"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-1.5">
                        <FormLabel>Delegatee (Recipient User)</FormLabel>
                        <HelpTooltip text="The acting user who will execute actions on behalf of the delegator." />
                      </div>
                      <FormControl>
                        <UserSearchSelect
                          value={field.value}
                          onValueChange={(val) => field.onChange(val)}
                          excludeUserIds={selectedDelegatorId ? [selectedDelegatorId] : []}
                          placeholder="Search and select recipient user..."
                          searchPlaceholder="Search delegatee by name, email, or employee ID..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Scope Pattern & Quick Presets */}
                <FormField
                  control={form.control}
                  name="scope"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <FormLabel className="flex items-center gap-1.5">
                            <Lock className="size-3.5 text-muted-foreground" /> Delegation Scope Pattern
                          </FormLabel>
                          <HelpTooltip text="Wildcard pattern matching permission codes to delegate (e.g. '*' for full permissions, 'project:*' for all project operations)." />
                        </div>
                        <div className="flex items-center gap-1">
                          {SCOPE_PRESETS.map((preset) => (
                            <Button
                              key={preset.value}
                              type="button"
                              variant="ghost"
                              size="xs"
                              className="text-[11px] h-6 px-1.5"
                              onClick={() => field.onChange(preset.value)}
                            >
                              {preset.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <FormControl>
                        <Input
                          placeholder="e.g. project:* or project:approve or *"
                          className="font-mono text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Delegation Duration Window with Quick Presets */}
                <div className="space-y-3 rounded-xl border p-3 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold text-foreground">
                        Delegation Time Window
                      </span>
                      <HelpTooltip text="Active validity window. Permissions are automatically revoked outside this range." />
                    </div>
                    <div className="flex items-center gap-1">
                      {DURATION_PRESETS.map((preset) => (
                        <Button
                          key={preset.label}
                          type="button"
                          variant="ghost"
                          size="xs"
                          className="text-[11px] h-6 px-1.5"
                          onClick={() => handleApplyDurationPreset(preset.hours)}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="validFrom"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Start Date & Time</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" className="text-xs" {...field} />
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
                          <FormLabel className="text-xs">End Date & Time</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" className="text-xs" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
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
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Creating...
                  </>
                ) : (
                  "Create Delegation"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
