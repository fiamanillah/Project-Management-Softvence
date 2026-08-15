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
import { Textarea } from "@workspace/ui/components/textarea";
import { Switch } from "@workspace/ui/components/switch";
import { Badge } from "@workspace/ui/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { SearchableSelect } from "@workspace/ui/components/searchable-select";
import { UserSearchSelect } from "@/components/user-search-select";
import {
  ShieldAlert,
  ShieldCheck,
  Loader2,
  KeyRound,
  Calendar,
  Layers,
  Building2,
  Users2,
  FolderGit2,
  Code2,
} from "lucide-react";
import { toast } from "sonner";
import { api, handleFormApiError } from "@/lib/api";
import { HelpTooltip } from "./HelpTooltip";
import type {
  UserSummary,
  PermissionSummary,
  DepartmentSummary,
  TeamSummary,
  ProjectSummary,
} from "../types";

const createOverrideFormSchema = z.object({
  userId: z.string().min(1, "Please select a target user"),
  permissionId: z.string().min(1, "Please select a permission to override"),
  isDeny: z.boolean(),
  scopeType: z.enum(["GLOBAL", "DEPARTMENT", "TEAM", "PROJECT"]),
  departmentId: z.string().optional(),
  teamId: z.string().optional(),
  projectId: z.string().optional(),
  reason: z.string().optional(),
  expiresAt: z.string().optional(),
});

type CreateOverrideFormValues = z.infer<typeof createOverrideFormSchema>;

interface CreateOverrideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: UserSummary[];
  permissions: PermissionSummary[];
  departments?: DepartmentSummary[];
  teams?: TeamSummary[];
  projects?: ProjectSummary[];
  onSuccess: () => void;
}

export function CreateOverrideModal({
  open,
  onOpenChange,
  permissions,
  departments = [],
  teams = [],
  projects = [],
  onSuccess,
}: CreateOverrideModalProps) {
  const form = useForm<CreateOverrideFormValues>({
    resolver: zodResolver(createOverrideFormSchema),
    defaultValues: {
      userId: "",
      permissionId: "",
      isDeny: false,
      scopeType: "GLOBAL",
      departmentId: "",
      teamId: "",
      projectId: "",
      reason: "",
      expiresAt: "",
    },
    mode: "onTouched",
  });

  const isDeny = form.watch("isDeny");
  const scopeType = form.watch("scopeType");

  const setExpiryPreset = (hours: number | null) => {
    if (hours === null) {
      form.setValue("expiresAt", "");
      return;
    }
    const d = new Date(Date.now() + hours * 60 * 60 * 1000);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hoursStr = String(d.getHours()).padStart(2, "0");
    const minutesStr = String(d.getMinutes()).padStart(2, "0");
    form.setValue("expiresAt", `${year}-${month}-${day}T${hoursStr}:${minutesStr}`);
  };

  const onSubmit = async (values: CreateOverrideFormValues) => {
    try {
      await api.post("/users/overrides", {
        userId: values.userId,
        permissionId: values.permissionId,
        isDeny: values.isDeny,
        departmentId:
          values.scopeType === "DEPARTMENT" && values.departmentId
            ? values.departmentId
            : undefined,
        teamId: values.scopeType === "TEAM" && values.teamId ? values.teamId : undefined,
        projectId:
          values.scopeType === "PROJECT" && values.projectId ? values.projectId : undefined,
        reason: values.reason?.trim() || undefined,
        expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : undefined,
      });

      toast.success(
        `User permission ${values.isDeny ? "DENIED" : "GRANTED"} override saved successfully`
      );
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      handleFormApiError(err, form.setError);
      toast.error(err.message || "Failed to create override");
    }
  };

  const isLoading = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <KeyRound className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                Create Permission Override
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Set custom hand-grants or explicit deny blocks for a specific user.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            {/* Override Policy Switch */}
            <FormField
              control={form.control}
              name="isDeny"
              render={({ field }) => (
                <FormItem className="rounded-xl border p-3 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <FormLabel className="text-sm font-semibold cursor-pointer">
                        Override Policy
                      </FormLabel>
                      <HelpTooltip
                        text={
                          field.value
                            ? "Explicit DENY short-circuits and blocks this permission regardless of role grants or active delegations."
                            : "Hand-GRANT elevates this user's access, allowing the action regardless of role designation limits."
                        }
                      />
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </div>
                  <div>
                    {field.value ? (
                      <Badge
                        variant="outline"
                        className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 gap-1.5 font-medium"
                      >
                        <ShieldAlert className="size-3.5" /> Explicit DENY (Hard Short-Circuit)
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1.5 font-medium"
                      >
                        <ShieldCheck className="size-3.5" /> Hand-GRANT (Elevated Access)
                      </Badge>
                    )}
                  </div>
                </FormItem>
              )}
            />

            {/* Target User (Search & Select) */}
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-1.5">
                    <FormLabel>Target User</FormLabel>
                    <HelpTooltip text="Search and select the user whose permissions will be overridden." />
                  </div>
                  <FormControl>
                    <UserSearchSelect
                      value={field.value}
                      onValueChange={(val) => field.onChange(val)}
                      placeholder="Search and select a user..."
                      searchPlaceholder="Search users by name, email, or employee ID..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Target Permission (Search & Select) */}
            <FormField
              control={form.control}
              name="permissionId"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-1.5">
                    <FormLabel>Permission Code</FormLabel>
                    <HelpTooltip text="Select the permission code to hand-grant or deny for this user." />
                  </div>
                  <FormControl>
                    <SearchableSelect<PermissionSummary>
                      value={field.value}
                      onValueChange={(val) => field.onChange(val)}
                      items={permissions}
                      getItemId={(p) => p.id}
                      getItemLabel={(p) => `${p.code} ${p.module || ""}`}
                      placeholder="Search and select a permission..."
                      searchPlaceholder="Search by code (e.g. project.view) or module..."
                      filterItem={(p, query) => {
                        const q = query.toLowerCase();
                        return (
                          p.code.toLowerCase().includes(q) ||
                          Boolean(p.module && p.module.toLowerCase().includes(q)) ||
                          Boolean(p.description && p.description.toLowerCase().includes(q))
                        );
                      }}
                      renderTriggerValue={(selected) =>
                        selected ? (
                          <div className="flex items-center gap-2 text-left truncate">
                            <Code2 className="size-3.5 text-muted-foreground shrink-0" />
                            <span className="font-mono text-xs font-semibold text-foreground truncate">
                              {selected.code}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                              {selected.module || "General"}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            Search and select a permission...
                          </span>
                        )
                      }
                      renderItem={(p) => (
                        <div className="flex flex-col gap-0.5 py-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-foreground">
                              {p.code}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {p.module || "General"}
                            </Badge>
                          </div>
                          {p.description && (
                            <span className="text-xs text-muted-foreground line-clamp-1">
                              {p.description}
                            </span>
                          )}
                        </div>
                      )}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Scope Anchor */}
            <FormField
              control={form.control}
              name="scopeType"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-1.5">
                    <FormLabel className="flex items-center gap-1.5">
                      <Layers className="size-3.5 text-muted-foreground" /> Scope Target
                    </FormLabel>
                    <HelpTooltip text="Choose whether this override applies globally to all resources, or is restricted to a specific department, team, or project." />
                  </div>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select scope target..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="GLOBAL">Global (All Resources)</SelectItem>
                      {departments.length > 0 && (
                        <SelectItem value="DEPARTMENT">Specific Department</SelectItem>
                      )}
                      {teams.length > 0 && (
                        <SelectItem value="TEAM">Specific Team</SelectItem>
                      )}
                      {projects.length > 0 && (
                        <SelectItem value="PROJECT">Specific Project</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Conditional Scope Selector: Department (Search & Select) */}
            {scopeType === "DEPARTMENT" && departments.length > 0 && (
              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-1.5">
                      <FormLabel>Target Department</FormLabel>
                      <HelpTooltip text="Override will only activate when operating on this department's resources." />
                    </div>
                    <FormControl>
                      <SearchableSelect<DepartmentSummary>
                        value={field.value}
                        onValueChange={(val) => field.onChange(val)}
                        items={departments}
                        getItemId={(d) => d.id}
                        getItemLabel={(d) => `${d.name} (${d.code})`}
                        placeholder="Search and select a department..."
                        searchPlaceholder="Search departments by name or code..."
                        renderTriggerValue={(selected) =>
                          selected ? (
                            <div className="flex items-center gap-2 truncate">
                              <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                              <span className="font-medium text-xs text-foreground truncate">
                                {selected.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({selected.code})
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              Select department...
                            </span>
                          )
                        }
                        renderItem={(d) => (
                          <div className="flex items-center justify-between gap-2 py-0.5 w-full">
                            <span className="font-medium text-xs text-foreground truncate">
                              {d.name}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                              {d.code}
                            </Badge>
                          </div>
                        )}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Conditional Scope Selector: Team (Search & Select) */}
            {scopeType === "TEAM" && teams.length > 0 && (
              <FormField
                control={form.control}
                name="teamId"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-1.5">
                      <FormLabel>Target Team</FormLabel>
                      <HelpTooltip text="Override will only activate when operating within this team context." />
                    </div>
                    <FormControl>
                      <SearchableSelect<TeamSummary>
                        value={field.value}
                        onValueChange={(val) => field.onChange(val)}
                        items={teams}
                        getItemId={(t) => t.id}
                        getItemLabel={(t) => t.name}
                        placeholder="Search and select a team..."
                        searchPlaceholder="Search teams by name..."
                        renderTriggerValue={(selected) =>
                          selected ? (
                            <div className="flex items-center gap-2 truncate">
                              <Users2 className="size-3.5 text-muted-foreground shrink-0" />
                              <span className="font-medium text-xs text-foreground truncate">
                                {selected.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              Select team...
                            </span>
                          )
                        }
                        renderItem={(t) => (
                          <span className="font-medium text-xs text-foreground truncate">
                            {t.name}
                          </span>
                        )}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Conditional Scope Selector: Project (Search & Select) */}
            {scopeType === "PROJECT" && projects.length > 0 && (
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-1.5">
                      <FormLabel>Target Project</FormLabel>
                      <HelpTooltip text="Override will only activate when operating on this project." />
                    </div>
                    <FormControl>
                      <SearchableSelect<ProjectSummary>
                        value={field.value}
                        onValueChange={(val) => field.onChange(val)}
                        items={projects}
                        getItemId={(p) => p.id}
                        getItemLabel={(p) => p.name}
                        placeholder="Search and select a project..."
                        searchPlaceholder="Search projects by name..."
                        renderTriggerValue={(selected) =>
                          selected ? (
                            <div className="flex items-center gap-2 truncate">
                              <FolderGit2 className="size-3.5 text-muted-foreground shrink-0" />
                              <span className="font-medium text-xs text-foreground truncate">
                                {selected.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              Select project...
                            </span>
                          )
                        }
                        renderItem={(p) => (
                          <span className="font-medium text-xs text-foreground truncate">
                            {p.name}
                          </span>
                        )}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Expiration Date with Quick Presets */}
            <FormField
              control={form.control}
              name="expiresAt"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <FormLabel className="flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-muted-foreground" /> Expiration Date
                      </FormLabel>
                      <HelpTooltip text="Overrides automatically deactivate after this date. Leave blank for a permanent override." />
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="text-[11px] h-6 px-1.5"
                        onClick={() => setExpiryPreset(24)}
                      >
                        +24h
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="text-[11px] h-6 px-1.5"
                        onClick={() => setExpiryPreset(24 * 7)}
                      >
                        +7d
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="text-[11px] h-6 px-1.5"
                        onClick={() => setExpiryPreset(24 * 30)}
                      >
                        +30d
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="text-[11px] h-6 px-1.5 text-muted-foreground"
                        onClick={() => setExpiryPreset(null)}
                      >
                        Permanent
                      </Button>
                    </div>
                  </div>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reason */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-1.5">
                    <FormLabel>Audit Reason / Justification</FormLabel>
                    <HelpTooltip text="State why this override is being configured. Logged in the security audit trail." />
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. Granted temporary emergency access for sprint deployment cover"
                      rows={2}
                      className="resize-none text-xs"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
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
                    <Loader2 className="size-4 animate-spin" /> Saving...
                  </>
                ) : (
                  "Save Override"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
