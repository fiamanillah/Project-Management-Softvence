"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Badge } from "@workspace/ui/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { api, handleFormApiError, extractFieldErrors } from "@/lib/api";
import { toast } from "sonner";
import type {
  ProjectItem,
  ProjectLookups,
  UpdateProjectDTO,
  ClientItem,
  ServiceLineItem,
  ProjectStatusItem,
} from "@workspace/shared";
import {
  QuickCreateClientDialog,
  QuickCreateServiceLineDialog,
  QuickCreateStatusDialog,
} from "./QuickCreateDialogs";
import {
  Edit2,
  Loader2,
  DollarSign,
  Lock,
  Calendar,
  Briefcase,
  Plus,
  Globe,
  Clock,
  Layers,
  Sparkles,
  AlertCircle,
  Hash,
} from "lucide-react";

interface EditProjectModalProps {
  project: ProjectItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lookups: ProjectLookups | null;
  onSuccess: () => void;
  onRefreshLookups?: () => Promise<void>;
}

export function EditProjectModal({
  project,
  open,
  onOpenChange,
  lookups,
  onSuccess,
  onRefreshLookups,
}: EditProjectModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [generalError, setGeneralError] = React.useState<string | null>(null);

  // Form State
  const [projectName, setProjectName] = React.useState("");
  const [orderId, setOrderId] = React.useState("");
  const [statusId, setStatusId] = React.useState("");
  const [serviceLineId, setServiceLineId] = React.useState("");
  const [clientId, setClientId] = React.useState("");
  const [profileId, setProfileId] = React.useState("");
  const [value, setValue] = React.useState<number | string>(0);
  const [orderSheetUrl, setOrderSheetUrl] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [deliveryDate, setDeliveryDate] = React.useState("");

  // Quick Create Dialog States
  const [clientModalOpen, setClientModalOpen] = React.useState(false);
  const [serviceLineModalOpen, setServiceLineModalOpen] = React.useState(false);
  const [statusModalOpen, setStatusModalOpen] = React.useState(false);

  // Local lookups
  const [localLookups, setLocalLookups] = React.useState<ProjectLookups | null>(lookups);

  React.useEffect(() => {
    setLocalLookups(lookups);
  }, [lookups]);

  const caps = project?._capabilities;
  const canEditFinancials = caps?.canEditFinancials ?? false;
  const canViewClient = caps?.canViewClient ?? false;

  React.useEffect(() => {
    if (open && project) {
      setProjectName(project.projectName || "");
      setOrderId(project.orderId || "");
      setStatusId(project.statusId || "");
      setServiceLineId(project.serviceLineId || "");
      setClientId(project.clientId || "");
      setProfileId(project.profileId || "");
      setValue(project.value !== null && project.value !== undefined ? Number(project.value) : 0);
      setOrderSheetUrl(project.orderSheetUrl || "");
      setStartDate(project.startDate ? String(project.startDate).split("T")[0] || "" : "");
      setDeliveryDate(project.deliveryDate ? String(project.deliveryDate).split("T")[0] || "" : "");
      setFieldErrors({});
      setGeneralError(null);
    }
  }, [open, project]);

  // Timeline duration in days
  const timelineDays = React.useMemo(() => {
    if (!startDate || !deliveryDate) return null;
    const start = new Date(startDate).getTime();
    const end = new Date(deliveryDate).getTime();
    if (isNaN(start) || isNaN(end) || end < start) return null;
    return Math.round((end - start) / (1000 * 60 * 60 * 24));
  }, [startDate, deliveryDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    setLoading(true);
    setFieldErrors({});
    setGeneralError(null);

    try {
      const payload: UpdateProjectDTO = {
        projectName: projectName.trim(),
        orderId: orderId.trim(),
        statusId: statusId || undefined,
        serviceLineId: serviceLineId || null,
        profileId: profileId || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        deliveryDate: deliveryDate ? new Date(deliveryDate).toISOString() : null,
      };

      if (canViewClient && clientId) {
        payload.clientId = clientId;
      }

      if (canEditFinancials) {
        payload.value = Number(value);
        payload.orderSheetUrl = orderSheetUrl.trim() || null;
      }

      await api.patch(`/projects/${project.id}`, payload);
      toast.success("Project updated successfully");
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      const extracted = extractFieldErrors(err);
      if (Object.keys(extracted).length > 0) {
        setFieldErrors(extracted);
      }
      const generalMsg = handleFormApiError(err, (name, error) => {
        setFieldErrors((prev) => ({ ...prev, [name]: error.message || "Invalid value" }));
      });
      setGeneralError(generalMsg || "Failed to update project");
      toast.error(generalMsg || "Failed to update project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[92vw] sm:max-w-2xl md:min-w-[640px] max-h-[92vh] p-0 gap-0 border shadow-2xl rounded-2xl overflow-hidden bg-background flex flex-col">
          {/* HEADER */}
          <DialogHeader className="p-5 pb-4 border-b bg-muted/20 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-2xs">
                  <Edit2 className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-foreground">
                    Edit Project
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Update project milestones, status, deadlines, and parameters
                  </DialogDescription>
                </div>
              </div>
              <Badge variant="outline" className="hidden sm:flex text-[11px] font-mono gap-1 py-1">
                <Hash className="size-3 text-muted-foreground" />
                {orderId || project?.orderId}
              </Badge>
            </div>
          </DialogHeader>

          {/* GENERAL ERROR BANNER */}
          {generalError && (
            <div className="mx-6 mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2 shrink-0">
              <AlertCircle className="size-4 shrink-0" />
              <span>{generalError}</span>
            </div>
          )}

          {/* SCROLLABLE FORM */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-[62vh] max-h-[calc(90vh-140px)]">
              <div className="p-5 sm:p-6 space-y-4">
                {/* 1. CORE DETAILS */}
                <div className="rounded-xl border bg-card/60 p-4 space-y-3.5 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground pb-1 border-b">
                    <Sparkles className="size-3.5 text-primary" /> Core Project Identity
                  </div>

                  <div className="space-y-1.5 min-w-0">
                    <Label htmlFor="editProjectName" className="text-xs font-semibold">
                      Project Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="editProjectName"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      required
                      className={fieldErrors.projectName ? "border-destructive text-xs h-9" : "text-xs h-9"}
                    />
                    {fieldErrors.projectName && (
                      <p className="text-[11px] text-destructive">{fieldErrors.projectName}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5 min-w-0">
                      <Label htmlFor="editOrderId" className="text-xs font-semibold">
                        Order Key <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="editOrderId"
                        value={orderId}
                        onChange={(e) => setOrderId(e.target.value)}
                        required
                        className="font-mono text-xs h-9"
                      />
                    </div>

                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">Project Status</Label>
                        <button
                          type="button"
                          onClick={() => setStatusModalOpen(true)}
                          className="text-[11px] text-primary hover:underline flex items-center gap-0.5 font-medium"
                        >
                          <Plus className="size-3" /> New
                        </button>
                      </div>
                      <Select value={statusId} onValueChange={(val: string | null) => setStatusId(val || "")}>
                        <SelectTrigger className="w-full h-9 text-xs overflow-hidden">
                          <SelectValue placeholder="Select Status">
                            {(() => {
                              const st = localLookups?.statuses.find((s) => s.id === statusId);
                              if (!st) return undefined;
                              return (
                                <div className="flex items-center gap-2 truncate">
                                  <span
                                    className="size-2 rounded-full shrink-0"
                                    style={{ backgroundColor: st.color || "#3b82f6" }}
                                  />
                                  <span className="truncate">{st.name}</span>
                                </div>
                              );
                            })()}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {localLookups?.statuses.map((st) => (
                            <SelectItem key={st.id} value={st.id} className="text-xs">
                              <div className="flex items-center gap-2">
                                <span
                                  className="size-2 rounded-full"
                                  style={{ backgroundColor: st.color || "#3b82f6" }}
                                />
                                <span>{st.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5 min-w-0 pt-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Service Line Domain</Label>
                      <button
                        type="button"
                        onClick={() => setServiceLineModalOpen(true)}
                        className="text-[11px] text-primary hover:underline flex items-center gap-0.5 font-medium"
                      >
                        <Plus className="size-3" /> New Service
                      </button>
                    </div>
                    <Select value={serviceLineId} onValueChange={(val: string | null) => setServiceLineId(val || "")}>
                      <SelectTrigger className="w-full h-9 text-xs overflow-hidden">
                        <SelectValue placeholder="Select Service Line">
                          {localLookups?.serviceLines.find((sl) => sl.id === serviceLineId)?.name}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {localLookups?.serviceLines.map((sl) => (
                          <SelectItem key={sl.id} value={sl.id} className="text-xs">
                            {sl.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 2. CLIENT & PROFILE */}
                <div className="rounded-xl border bg-card/60 p-4 space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between pb-1 border-b">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <Globe className="size-3.5 text-blue-500" /> Account & Client Linkage
                    </div>
                    {!canViewClient && (
                      <Badge variant="outline" className="text-[10px] text-amber-600 bg-amber-500/10 border-amber-500/20 font-mono gap-1">
                        <Lock className="size-2.5" /> Restricted
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Profile */}
                    <div className="space-y-1.5 min-w-0">
                      <Label className="text-xs font-semibold">Account Profile</Label>
                      <Select value={profileId} onValueChange={(val: string | null) => setProfileId(val || "")}>
                        <SelectTrigger className="w-full h-9 text-xs overflow-hidden">
                          <SelectValue placeholder="Select Profile">
                            {(() => {
                              const prof = localLookups?.profiles.find((p) => p.id === profileId);
                              if (!prof) return undefined;
                              return (
                                <span className="truncate block font-medium">
                                  {prof.username} {prof.platform ? `(${prof.platform.name})` : ""}
                                </span>
                              );
                            })()}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {localLookups?.profiles.map((pr) => (
                            <SelectItem key={pr.id} value={pr.id} className="text-xs">
                              <div className="flex items-center justify-between gap-3 w-full">
                                <span className="truncate">{pr.username}</span>
                                {pr.platform && (
                                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                                    {pr.platform.name}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Client Identity */}
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">Client Identity</Label>
                        {canViewClient && (
                          <button
                            type="button"
                            onClick={() => setClientModalOpen(true)}
                            className="text-[11px] text-primary hover:underline flex items-center gap-0.5 font-medium"
                          >
                            <Plus className="size-3" /> New Client
                          </button>
                        )}
                      </div>
                      {canViewClient ? (
                        <Select value={clientId} onValueChange={(val: string | null) => setClientId(val || "")}>
                          <SelectTrigger className="w-full h-9 text-xs overflow-hidden">
                            <SelectValue placeholder="Select Client">
                              {(() => {
                                const cl = localLookups?.clients.find((c) => c.id === clientId);
                                if (!cl) return undefined;
                                return (
                                  <div className="flex items-center gap-2 truncate font-medium">
                                    <span className="truncate">{cl.name}</span>
                                    {cl.platform && (
                                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                                        {cl.platform.name}
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {localLookups?.clients.map((cl) => (
                              <SelectItem key={cl.id} value={cl.id} className="text-xs">
                                <div className="flex items-center justify-between gap-3 w-full">
                                  <span className="truncate">{cl.name}</span>
                                  {cl.platform && (
                                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                                      {cl.platform.name}
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input disabled value="Client identity is protected" className="bg-muted text-xs h-9" />
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. FINANCIALS & TIMELINE */}
                <div className="rounded-xl border bg-card/60 p-4 space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between pb-1 border-b">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <DollarSign className="size-3.5 text-emerald-500" /> Financials & Deadlines
                    </div>
                    {timelineDays !== null && (
                      <Badge variant="secondary" className="text-[11px] font-mono gap-1">
                        <Clock className="size-3 text-primary" /> {timelineDays} days duration
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5 min-w-0">
                      <Label htmlFor="editValue" className="text-xs font-semibold">
                        Contract Value ($ USD)
                      </Label>
                      {canEditFinancials ? (
                        <div className="relative">
                          <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground font-mono">$</span>
                          <Input
                            id="editValue"
                            type="number"
                            min="0"
                            step="0.01"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            className="pl-6 font-mono text-xs h-9"
                          />
                        </div>
                      ) : (
                        <Input disabled value="Restricted" className="bg-muted font-mono text-xs h-9" />
                      )}
                    </div>

                    <div className="space-y-1.5 min-w-0">
                      <Label htmlFor="editOrderSheetUrl" className="text-xs font-semibold">
                        Order Sheet URL
                      </Label>
                      {canEditFinancials ? (
                        <Input
                          id="editOrderSheetUrl"
                          type="url"
                          value={orderSheetUrl}
                          onChange={(e) => setOrderSheetUrl(e.target.value)}
                          placeholder="https://docs.google.com/spreadsheets/..."
                          className="text-xs h-9"
                        />
                      ) : (
                        <Input disabled value="Restricted" className="bg-muted text-xs h-9" />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                    <div className="space-y-1.5 min-w-0">
                      <Label htmlFor="editStartDate" className="text-xs font-semibold">
                        Start Date
                      </Label>
                      <Input
                        id="editStartDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="text-xs h-9"
                      />
                    </div>

                    <div className="space-y-1.5 min-w-0">
                      <Label htmlFor="editDeliveryDate" className="text-xs font-semibold">
                        Target Delivery Date
                      </Label>
                      <Input
                        id="editDeliveryDate"
                        type="date"
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        className="text-xs h-9"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* FOOTER */}
            <DialogFooter className="p-4 px-6 border-t bg-muted/10 shrink-0 flex flex-row items-center justify-between w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="text-xs h-9 gap-1.5 px-5">
                {loading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> Saving Changes...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* QUICK CREATE DIALOGS */}
      {localLookups && (
        <>
          <QuickCreateClientDialog
            open={clientModalOpen}
            onOpenChange={setClientModalOpen}
            platforms={localLookups.platforms}
            onSuccess={(newClient: ClientItem) => {
              setLocalLookups((prev) => (prev ? { ...prev, clients: [newClient, ...prev.clients] } : prev));
              setClientId(newClient.id);
              onRefreshLookups?.();
            }}
          />

          <QuickCreateServiceLineDialog
            open={serviceLineModalOpen}
            onOpenChange={setServiceLineModalOpen}
            onSuccess={(newServiceLine: ServiceLineItem) => {
              setLocalLookups((prev) =>
                prev ? { ...prev, serviceLines: [newServiceLine, ...prev.serviceLines] } : prev,
              );
              setServiceLineId(newServiceLine.id);
              onRefreshLookups?.();
            }}
          />

          <QuickCreateStatusDialog
            open={statusModalOpen}
            onOpenChange={setStatusModalOpen}
            onSuccess={(newStatus: ProjectStatusItem) => {
              setLocalLookups((prev) =>
                prev ? { ...prev, statuses: [...prev.statuses, newStatus] } : prev,
              );
              setStatusId(newStatus.id);
              onRefreshLookups?.();
            }}
          />
        </>
      )}
    </>
  );
}
