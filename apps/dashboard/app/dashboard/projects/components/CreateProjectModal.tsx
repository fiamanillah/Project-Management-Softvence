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
import { Badge } from "@workspace/ui/components/badge";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
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
  ProjectLookups,
  CreateProjectDTO,
  ProjectStatusItem,
  PlatformItem,
  ProfileItem,
  ServiceLineItem,
  ClientItem,
  OrderSourceItem,
} from "@workspace/shared";
import {
  QuickCreateClientDialog,
  QuickCreateProfileDialog,
  QuickCreatePlatformDialog,
  QuickCreateServiceLineDialog,
  QuickCreateStatusDialog,
  QuickCreateOrderSourceDialog,
} from "./quick-create";
import {
  ProjectClassificationFields,
  ProjectAccountClientFields,
  ProjectFinancialsFields,
  ProjectScheduleFields,
  ProjectDraftComponentsList,
} from "./forms";
import {
  Briefcase,
  Loader2,
  Sparkles,
  AlertCircle,
  Hash,
  Layers,
} from "lucide-react";

import { usePermissions, hasPermission } from "@/lib/permissions/PermissionContext";

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lookups: ProjectLookups | null;
  initialParentId?: string | null;
  onSuccess: () => void;
  onRefreshLookups?: () => Promise<void>;
  userPermissions?: Record<string, any>;
}

export function CreateProjectModal({
  open,
  onOpenChange,
  lookups,
  initialParentId,
  onSuccess,
  onRefreshLookups,
  userPermissions,
}: CreateProjectModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [generalError, setGeneralError] = React.useState<string | null>(null);

  const permissions = usePermissions();

  // Financial & Sensitive permission checks (Fail-closed: defaults to false if not granted)
  const canEditFinancials =
    userPermissions?.["project.financial.edit"] !== undefined
      ? Boolean(userPermissions["project.financial.edit"])
      : hasPermission(permissions, "project.financial.edit");
  const canViewClient =
    userPermissions?.["project.client.view"] !== undefined
      ? Boolean(userPermissions["project.client.view"])
      : hasPermission(permissions, "project.client.view");

  // Form State
  const [orderId, setOrderId] = React.useState("");
  const [orderLink, setOrderLink] = React.useState("");
  const [service, setService] = React.useState("");
  const [parentId, setParentId] = React.useState<string>("");
  const [platformId, setPlatformId] = React.useState("");
  const [profileId, setProfileId] = React.useState("");
  const [clientId, setClientId] = React.useState("");
  const [serviceLineId, setServiceLineId] = React.useState("");
  const [statusId, setStatusId] = React.useState("");
  const [orderSourceId, setOrderSourceId] = React.useState("");
  const [amount, setAmount] = React.useState<number | string>("");
  const [percentage, setPercentage] = React.useState<number | string>("");
  const [remarks, setRemarks] = React.useState("");
  const [orderSheetUrl, setOrderSheetUrl] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [deliveryDate, setDeliveryDate] = React.useState("");
  const [assignedTeamId, setAssignedTeamId] = React.useState("");

  // Sub-deliverable Components State
  const [components, setComponents] = React.useState<{ name: string; statusId: string }[]>([]);
  const [newComponentName, setNewComponentName] = React.useState("");

  // Quick Create Dialog States
  const [clientModalOpen, setClientModalOpen] = React.useState(false);
  const [profileModalOpen, setProfileModalOpen] = React.useState(false);
  const [platformModalOpen, setPlatformModalOpen] = React.useState(false);
  const [serviceLineModalOpen, setServiceLineModalOpen] = React.useState(false);
  const [statusModalOpen, setStatusModalOpen] = React.useState(false);
  const [orderSourceModalOpen, setOrderSourceModalOpen] = React.useState(false);

  // Local lookup extensions
  const [localLookups, setLocalLookups] = React.useState<ProjectLookups | null>(lookups);

  React.useEffect(() => {
    setLocalLookups(lookups);
  }, [lookups]);

  // Financial calculations
  const grossAmountNum = amount !== "" ? Number(amount) : 0;
  const platformChargePct = percentage !== "" ? Number(percentage) : 0;
  const calculatedNetValue = React.useMemo(() => {
    if (!grossAmountNum) return 0;
    const fee = (grossAmountNum * platformChargePct) / 100;
    return Math.max(0, grossAmountNum - fee);
  }, [grossAmountNum, platformChargePct]);

  // Initialize defaults on open
  React.useEffect(() => {
    if (open && localLookups) {
      setOrderId("");
      setOrderLink("");
      setService("");
      setParentId(initialParentId || "");

      const initialPlatform = localLookups.platforms[0]?.id || "";
      setPlatformId(initialPlatform);

      const matchingProfile =
        localLookups.profiles.find((p) => p.platformId === initialPlatform) || localLookups.profiles[0];
      setProfileId(matchingProfile?.id || "");
      if (matchingProfile?.platformId) {
        setPlatformId(matchingProfile.platformId);
      }

      setClientId(localLookups.clients[0]?.id || "");
      setServiceLineId(localLookups.serviceLines[0]?.id || "");
      setStatusId(localLookups.statuses[0]?.id || "");
      setOrderSourceId(localLookups.orderSources?.[0]?.id || "");
      setAmount("");
      setPercentage("");
      setRemarks("");
      setOrderSheetUrl("");
      setStartDate(new Date().toISOString().split("T")[0] || "");
      setDeliveryDate(new Date(Date.now() + 14 * 86400 * 1000).toISOString().split("T")[0] || "");
      setAssignedTeamId(localLookups.teams[0]?.id || "");
      setComponents([]);
      setNewComponentName("");
      setFieldErrors({});
      setGeneralError(null);
    }
  }, [open, localLookups, initialParentId]);

  // Filter profiles based on selected platform
  const filteredProfiles = React.useMemo(() => {
    if (!localLookups?.profiles) return [];
    if (!platformId) return localLookups.profiles;
    const matched = localLookups.profiles.filter((p) => p.platformId === platformId);
    return matched.length > 0 ? matched : localLookups.profiles;
  }, [localLookups?.profiles, platformId]);

  // Handle platform change
  const handlePlatformChange = (newPlatformId: string | null) => {
    const val = newPlatformId || "";
    setPlatformId(val);
    const firstMatchingProfile = localLookups?.profiles.find((p) => p.platformId === val);
    if (firstMatchingProfile) {
      setProfileId(firstMatchingProfile.id);
    }
  };

  // Handle profile change
  const handleProfileChange = (newProfileId: string | null) => {
    const val = newProfileId || "";
    setProfileId(val);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.profileId;
      return next;
    });

    const selected = localLookups?.profiles.find((p) => p.id === val);
    if (selected && selected.platformId && selected.platformId !== platformId) {
      setPlatformId(selected.platformId);
    }
  };

  // Handle addition of draft component
  const handleAddDraftComponent = () => {
    if (!newComponentName.trim()) return;
    setComponents((prev) => [
      ...prev,
      {
        name: newComponentName.trim(),
        statusId: statusId || localLookups?.statuses[0]?.id || "",
      },
    ]);
    setNewComponentName("");
  };

  const handleRemoveDraftComponent = (index: number) => {
    setComponents((prev) => prev.filter((_, i) => i !== index));
  };

  // Quick-create callbacks
  const handleClientCreated = (newClient: ClientItem) => {
    setLocalLookups((prev) => (prev ? { ...prev, clients: [newClient, ...prev.clients] } : prev));
    setClientId(newClient.id);
    if (newClient.platformId) setPlatformId(newClient.platformId);
    onRefreshLookups?.();
  };

  const handleProfileCreated = (newProfile: ProfileItem) => {
    setLocalLookups((prev) => (prev ? { ...prev, profiles: [newProfile, ...prev.profiles] } : prev));
    setProfileId(newProfile.id);
    if (newProfile.platformId) setPlatformId(newProfile.platformId);
    onRefreshLookups?.();
  };

  const handlePlatformCreated = (newPlatform: PlatformItem) => {
    setLocalLookups((prev) => (prev ? { ...prev, platforms: [newPlatform, ...prev.platforms] } : prev));
    setPlatformId(newPlatform.id);
    onRefreshLookups?.();
  };

  const handleServiceLineCreated = (newServiceLine: ServiceLineItem) => {
    setLocalLookups((prev) =>
      prev ? { ...prev, serviceLines: [newServiceLine, ...prev.serviceLines] } : prev,
    );
    setServiceLineId(newServiceLine.id);
    onRefreshLookups?.();
  };

  const handleStatusCreated = (newStatus: ProjectStatusItem) => {
    setLocalLookups((prev) =>
      prev ? { ...prev, statuses: [...prev.statuses, newStatus] } : prev,
    );
    setStatusId(newStatus.id);
    onRefreshLookups?.();
  };

  const handleOrderSourceCreated = (newSource: OrderSourceItem) => {
    setLocalLookups((prev) =>
      prev ? { ...prev, orderSources: [newSource, ...(prev.orderSources || [])] } : prev,
    );
    setOrderSourceId(newSource.id);
    onRefreshLookups?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({});
    setGeneralError(null);

    try {
      if (!orderId.trim()) {
        setFieldErrors({ orderId: "Platform Order ID is required" });
        setLoading(false);
        return;
      }

      if (!profileId) {
        setFieldErrors({ profileId: "Profile is required" });
        setLoading(false);
        return;
      }

      const payload: CreateProjectDTO = {
        orderId: orderId.trim(),
        orderLink: orderLink.trim() || undefined,
        service: service.trim() || undefined,
        parentId: parentId && parentId !== "none" ? parentId : undefined,
        clientId: clientId || localLookups?.clients[0]?.id || "",
        profileId,
        serviceLineId: serviceLineId || null,
        orderSourceId: orderSourceId || null,
        statusId: statusId || localLookups?.statuses[0]?.id || "",
        value: canEditFinancials ? calculatedNetValue : 0,
        amount: canEditFinancials && amount !== "" ? Number(amount) : undefined,
        percentage: canEditFinancials && percentage !== "" ? Number(percentage) : undefined,
        remarks: remarks.trim() || undefined,
        orderSheetUrl: canEditFinancials && orderSheetUrl.trim() ? orderSheetUrl.trim() : undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        deliveryDate: deliveryDate ? new Date(deliveryDate).toISOString() : undefined,
        assignedTeamIds: assignedTeamId ? [assignedTeamId] : [],
        initialComponents: components,
      };

      await api.post("/projects", payload);
      toast.success("Project created successfully with auto-generated project code");
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
      setGeneralError(generalMsg || "Failed to create project");
      toast.error(generalMsg || "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[94vw] sm:max-w-3xl md:min-w-[700px] lg:min-w-[820px] max-h-[92vh] p-0 gap-0 border shadow-2xl rounded-2xl overflow-hidden bg-background flex flex-col">
          {/* MODAL HEADER */}
          <DialogHeader className="p-5 pb-4 border-b bg-muted/20 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-2xs">
                  <Briefcase className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-foreground">
                    Create New Project / Order
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Project code will be auto-generated. Link to platform order, financial parameters, and roster
                  </DialogDescription>
                </div>
              </div>
              <Badge variant="outline" className="hidden sm:flex text-[11px] font-mono gap-1 py-1">
                <Hash className="size-3 text-muted-foreground" />
                {orderId || "ORDER-KEY"}
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

          {/* SCROLLABLE FORM BODY */}
          <form onSubmit={handleSubmit} id="create-project-form" className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-[64vh] max-h-[calc(90vh-140px)]">
              <div className="p-5 sm:p-6 space-y-5">
                {/* AUTO-GENERATED CODE INFO BANNER */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-primary shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">Auto-Generated Project Code</p>
                      <p className="text-[11px] text-muted-foreground">
                        Standard unique code (e.g. <span className="font-mono text-primary font-bold">PRJ-202608-XXXX</span>) will be assigned automatically upon save.
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="font-mono text-[10px] shrink-0">
                    Auto-Assign Pattern
                  </Badge>
                </div>

                {/* SECTION 1: ORDER ID, ORDER LINK, SERVICE, HIERARCHY, STATUS, SOURCE & SERVICE LINE */}
                <ProjectClassificationFields
                  orderId={orderId}
                  setOrderId={(val) => {
                    setOrderId(val);
                    if (fieldErrors.orderId) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.orderId;
                        return next;
                      });
                    }
                  }}
                  orderLink={orderLink}
                  setOrderLink={setOrderLink}
                  service={service}
                  setService={setService}
                  parentId={parentId}
                  setParentId={setParentId}
                  statusId={statusId}
                  setStatusId={setStatusId}
                  orderSourceId={orderSourceId}
                  setOrderSourceId={setOrderSourceId}
                  serviceLineId={serviceLineId}
                  setServiceLineId={setServiceLineId}
                  lookups={localLookups}
                  fieldErrors={fieldErrors}
                  onNewStatusClick={() => setStatusModalOpen(true)}
                  onNewOrderSourceClick={() => setOrderSourceModalOpen(true)}
                  onNewServiceLineClick={() => setServiceLineModalOpen(true)}
                />

                {/* SECTION 2: CLIENT & PLATFORM SELLER ACCOUNT */}
                <ProjectAccountClientFields
                  platformId={platformId}
                  onPlatformChange={handlePlatformChange}
                  profileId={profileId}
                  onProfileChange={handleProfileChange}
                  clientId={clientId}
                  onClientChange={(val, clientItem) => {
                    setClientId(val || "");
                    if (clientItem?.platformId && (!platformId || platformId !== clientItem.platformId)) {
                      handlePlatformChange(clientItem.platformId);
                    }
                  }}
                  lookups={localLookups}
                  filteredProfiles={filteredProfiles}
                  canViewClient={canViewClient}
                  fieldErrors={fieldErrors}
                  showPlatformSelect={true}
                  onNewPlatformClick={() => setPlatformModalOpen(true)}
                  onNewProfileClick={() => setProfileModalOpen(true)}
                  onNewClientClick={() => setClientModalOpen(true)}
                />

                {/* SECTION 3: FINANCIALS, PLATFORM CHARGE & NET VALUE */}
                <ProjectFinancialsFields
                  amount={amount}
                  setAmount={setAmount}
                  percentage={percentage}
                  setPercentage={setPercentage}
                  calculatedNetValue={calculatedNetValue}
                  orderSheetUrl={orderSheetUrl}
                  setOrderSheetUrl={setOrderSheetUrl}
                  canEditFinancials={canEditFinancials}
                  fieldErrors={fieldErrors}
                />

                {/* SECTION 4: SCHEDULE & DATES */}
                <ProjectScheduleFields
                  startDate={startDate}
                  setStartDate={setStartDate}
                  deliveryDate={deliveryDate}
                  setDeliveryDate={setDeliveryDate}
                  fieldErrors={fieldErrors}
                />

                {/* SECTION 5: REMARKS */}
                <div className="rounded-xl border bg-card/60 p-4 space-y-2 shadow-2xs">
                  <Label htmlFor="remarks" className="text-xs font-semibold">
                    Remarks / Operational Notes (Optional)
                  </Label>
                  <Textarea
                    id="remarks"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Special instructions, milestones, client preferences..."
                    rows={2}
                    className="text-xs resize-none"
                  />
                </div>

                {/* SECTION 6: PRIMARY TEAM ALLOCATION */}
                <div className="rounded-xl border bg-card/60 p-4 space-y-3 shadow-2xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Layers className="size-3.5 text-primary" /> Primary Team Allocation
                  </h4>
                  <div className="space-y-1.5 min-w-0">
                    <Label className="text-xs font-semibold">Allocated Team</Label>
                    <Select value={assignedTeamId} onValueChange={(val: string | null) => setAssignedTeamId(val || "")}>
                      <SelectTrigger className="w-full h-9 text-xs">
                        <SelectValue placeholder="Select Team">
                          {localLookups?.teams.find((t) => t.id === assignedTeamId)?.name}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {localLookups?.teams.map((team) => (
                          <SelectItem key={team.id} value={team.id} className="text-xs">
                            <span className="font-semibold">{team.name}</span>
                            <span className="text-[10px] text-muted-foreground ml-1.5">
                              ({team.department?.name || "General"})
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* SECTION 7: DRAFT SUB-DELIVERABLE COMPONENTS */}
                <ProjectDraftComponentsList
                  components={components}
                  newComponentName={newComponentName}
                  setNewComponentName={setNewComponentName}
                  onAdd={handleAddDraftComponent}
                  onRemove={handleRemoveDraftComponent}
                  statuses={localLookups?.statuses || []}
                />
              </div>
            </ScrollArea>

            {/* MODAL FOOTER */}
            <DialogFooter className="p-4 border-t bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span>Total Deliverables:</span>
                <Badge variant="outline" className="font-mono text-[11px] font-bold">
                  {components.length}
                </Badge>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                  className="text-xs h-9 w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={loading}
                  className="text-xs h-9 gap-1.5 w-full sm:w-auto shadow-xs"
                >
                  {loading && <Loader2 className="size-3.5 animate-spin" />}
                  Create Project
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* QUICK CREATE MODALS */}
      <QuickCreateClientDialog
        open={clientModalOpen}
        onOpenChange={setClientModalOpen}
        platforms={localLookups?.platforms || []}
        onSuccess={handleClientCreated}
      />
      <QuickCreateProfileDialog
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        platforms={localLookups?.platforms || []}
        onSuccess={handleProfileCreated}
      />
      <QuickCreatePlatformDialog
        open={platformModalOpen}
        onOpenChange={setPlatformModalOpen}
        onSuccess={handlePlatformCreated}
      />
      <QuickCreateServiceLineDialog
        open={serviceLineModalOpen}
        onOpenChange={setServiceLineModalOpen}
        onSuccess={handleServiceLineCreated}
      />
      <QuickCreateStatusDialog
        open={statusModalOpen}
        onOpenChange={setStatusModalOpen}
        onSuccess={handleStatusCreated}
      />
      <QuickCreateOrderSourceDialog
        open={orderSourceModalOpen}
        onOpenChange={setOrderSourceModalOpen}
        onSuccess={handleOrderSourceCreated}
      />
    </>
  );
}
