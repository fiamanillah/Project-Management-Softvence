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
import { api, handleFormApiError, extractFieldErrors } from "@/lib/api";
import { toast } from "sonner";
import type {
  ProjectItem,
  ProjectLookups,
  UpdateProjectDTO,
  ProjectStatusItem,
  ServiceLineItem,
  ClientItem,
  OrderSourceItem,
} from "@workspace/shared";
import {
  QuickCreateClientDialog,
  QuickCreateServiceLineDialog,
  QuickCreateStatusDialog,
  QuickCreateOrderSourceDialog,
} from "./quick-create";
import {
  ProjectClassificationFields,
  ProjectAccountClientFields,
  ProjectFinancialsFields,
  ProjectScheduleFields,
} from "./forms";
import {
  Briefcase,
  Loader2,
  Copy,
  Check,
  AlertCircle,
  Hash,
} from "lucide-react";

interface EditProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectItem | null;
  lookups: ProjectLookups | null;
  onSuccess: () => void;
  onRefreshLookups?: () => Promise<void>;
}

export function EditProjectModal({
  open,
  onOpenChange,
  project,
  lookups,
  onSuccess,
  onRefreshLookups,
}: EditProjectModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [generalError, setGeneralError] = React.useState<string | null>(null);
  const [copiedCode, setCopiedCode] = React.useState(false);

  // Form State
  const [orderId, setOrderId] = React.useState("");
  const [orderLink, setOrderLink] = React.useState("");
  const [service, setService] = React.useState("");
  const [parentId, setParentId] = React.useState<string>("");
  const [statusId, setStatusId] = React.useState("");
  const [serviceLineId, setServiceLineId] = React.useState("");
  const [orderSourceId, setOrderSourceId] = React.useState("");
  const [clientId, setClientId] = React.useState("");
  const [profileId, setProfileId] = React.useState("");
  const [amount, setAmount] = React.useState<number | string>("");
  const [percentage, setPercentage] = React.useState<number | string>("");
  const [remarks, setRemarks] = React.useState("");
  const [orderSheetUrl, setOrderSheetUrl] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [deliveryDate, setDeliveryDate] = React.useState("");

  // Quick Create Dialog States
  const [clientModalOpen, setClientModalOpen] = React.useState(false);
  const [serviceLineModalOpen, setServiceLineModalOpen] = React.useState(false);
  const [statusModalOpen, setStatusModalOpen] = React.useState(false);
  const [orderSourceModalOpen, setOrderSourceModalOpen] = React.useState(false);

  // Local lookups
  const [localLookups, setLocalLookups] = React.useState<ProjectLookups | null>(lookups);

  React.useEffect(() => {
    setLocalLookups(lookups);
  }, [lookups]);

  const caps = project?._capabilities;
  const canEditFinancials = caps?.canEditFinancials ?? false;
  const canViewClient = caps?.canViewClient ?? false;

  // Financial calculations
  const grossAmountNum = amount !== "" ? Number(amount) : 0;
  const platformChargePct = percentage !== "" ? Number(percentage) : 0;
  const calculatedNetValue = React.useMemo(() => {
    if (!grossAmountNum) return 0;
    const fee = (grossAmountNum * platformChargePct) / 100;
    return Math.max(0, grossAmountNum - fee);
  }, [grossAmountNum, platformChargePct]);

  React.useEffect(() => {
    if (open && project) {
      setOrderId(project.orderId || "");
      setOrderLink(project.orderLink || "");
      setService(project.service || "");
      setParentId(project.parentId || "");
      setStatusId(project.statusId || "");
      setServiceLineId(project.serviceLineId || "");
      setOrderSourceId(project.orderSourceId || "");
      setClientId(project.clientId || "");
      setProfileId(project.profileId || "");
      setAmount(project.amount !== null && project.amount !== undefined ? Number(project.amount) : "");
      setPercentage(project.percentage !== null && project.percentage !== undefined ? Number(project.percentage) : "");
      setRemarks(project.remarks || "");
      setOrderSheetUrl(project.orderSheetUrl || "");
      setStartDate(project.startDate ? String(project.startDate).split("T")[0] || "" : "");
      setDeliveryDate(project.deliveryDate ? String(project.deliveryDate).split("T")[0] || "" : "");
      setFieldErrors({});
      setGeneralError(null);
    }
  }, [open, project]);

  const handleCopyCode = () => {
    if (!project?.projectName) return;
    navigator.clipboard.writeText(project.projectName);
    setCopiedCode(true);
    toast.success("Project Code copied to clipboard");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    setLoading(true);
    setFieldErrors({});
    setGeneralError(null);

    try {
      const payload: UpdateProjectDTO = {
        orderId: orderId.trim(),
        orderLink: orderLink.trim() || null,
        service: service.trim() || null,
        parentId: parentId && parentId !== "none" ? parentId : null,
        statusId: statusId || undefined,
        serviceLineId: serviceLineId || null,
        orderSourceId: orderSourceId || null,
        profileId: profileId || undefined,
        remarks: remarks.trim() || null,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        deliveryDate: deliveryDate ? new Date(deliveryDate).toISOString() : null,
      };

      if (canViewClient && clientId) {
        payload.clientId = clientId;
      }

      if (canEditFinancials) {
        payload.value = calculatedNetValue;
        payload.amount = amount !== "" ? Number(amount) : null;
        payload.percentage = percentage !== "" ? Number(percentage) : null;
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

  // Filter out self from eligible parent candidates
  const eligibleParentCandidates = React.useMemo(() => {
    if (!localLookups?.parentCandidates || !project) return [];
    return localLookups.parentCandidates.filter((p) => p.id !== project.id);
  }, [localLookups?.parentCandidates, project]);

  const customLookupsForClassification = React.useMemo(() => {
    if (!localLookups) return null;
    return {
      ...localLookups,
      parentCandidates: eligibleParentCandidates,
    };
  }, [localLookups, eligibleParentCandidates]);

  // Quick Create Callbacks
  const handleClientCreated = (newClient: ClientItem) => {
    setLocalLookups((prev) => (prev ? { ...prev, clients: [newClient, ...prev.clients] } : prev));
    setClientId(newClient.id);
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[94vw] sm:max-w-3xl md:min-w-[700px] lg:min-w-[820px] max-h-[92vh] p-0 gap-0 border shadow-2xl rounded-2xl overflow-hidden bg-background flex flex-col">
          {/* HEADER */}
          <DialogHeader className="p-5 pb-4 border-b bg-muted/20 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-2xs">
                  <Briefcase className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-foreground">
                    Edit Project
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <span>Identifier:</span>
                    <span className="font-mono font-bold text-foreground bg-muted px-1.5 py-0.5 rounded">
                      {project?.projectName}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="text-muted-foreground hover:text-foreground inline-flex items-center"
                      title="Copy Project Code"
                    >
                      {copiedCode ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                    </button>
                  </DialogDescription>
                </div>
              </div>
              <Badge variant="outline" className="hidden sm:flex text-[11px] font-mono gap-1 py-1">
                <Hash className="size-3 text-muted-foreground" />
                {project?.orderId || "ORDER-KEY"}
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

          {/* FORM BODY */}
          <form onSubmit={handleSubmit} id="edit-project-form" className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-[64vh] max-h-[calc(90vh-140px)]">
              <div className="p-5 sm:p-6 space-y-5">
                {/* SECTION 1: CLASSIFICATION */}
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
                  lookups={customLookupsForClassification}
                  fieldErrors={fieldErrors}
                  onNewStatusClick={() => setStatusModalOpen(true)}
                  onNewOrderSourceClick={() => setOrderSourceModalOpen(true)}
                  onNewServiceLineClick={() => setServiceLineModalOpen(true)}
                />

                {/* SECTION 2: PLATFORM PROFILE & CLIENT */}
                <ProjectAccountClientFields
                  profileId={profileId}
                  onProfileChange={(val) => setProfileId(val || "")}
                  clientId={clientId}
                  onClientChange={(val) => setClientId(val || "")}
                  lookups={localLookups}
                  canViewClient={canViewClient}
                  fieldErrors={fieldErrors}
                  showPlatformSelect={false}
                  onNewClientClick={() => setClientModalOpen(true)}
                />

                {/* SECTION 3: FINANCIALS */}
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

                {/* SECTION 4: SCHEDULE */}
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
              </div>
            </ScrollArea>

            {/* FOOTER */}
            <DialogFooter className="p-4 border-t bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-muted-foreground">
                <span className="font-mono">ID: {project?.id.slice(0, 8)}...</span>
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
                  Save Changes
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
