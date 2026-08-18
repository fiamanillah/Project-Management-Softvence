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
  GitFork,
  Copy,
  Check,
  Link,
  Mail,
  Percent,
  FileText,
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
  const [copiedCode, setCopiedCode] = React.useState(false);

  // Form State
  const [orderId, setOrderId] = React.useState("");
  const [orderLink, setOrderLink] = React.useState("");
  const [service, setService] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [parentId, setParentId] = React.useState<string>("");
  const [statusId, setStatusId] = React.useState("");
  const [serviceLineId, setServiceLineId] = React.useState("");
  const [clientId, setClientId] = React.useState("");
  const [profileId, setProfileId] = React.useState("");
  const [value, setValue] = React.useState<number | string>(0);
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
      setOrderId(project.orderId || "");
      setOrderLink(project.orderLink || "");
      setService(project.service || "");
      setEmail(project.email || "");
      setParentId(project.parentId || "");
      setStatusId(project.statusId || "");
      setServiceLineId(project.serviceLineId || "");
      setClientId(project.clientId || "");
      setProfileId(project.profileId || "");
      setValue(project.value !== null && project.value !== undefined ? Number(project.value) : 0);
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

  // Timeline duration in days
  const timelineDays = React.useMemo(() => {
    if (!startDate || !deliveryDate) return null;
    const start = new Date(startDate).getTime();
    const end = new Date(deliveryDate).getTime();
    if (isNaN(start) || isNaN(end) || end < start) return null;
    return Math.round((end - start) / (1000 * 60 * 60 * 24));
  }, [startDate, deliveryDate]);

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
        profileId: profileId || undefined,
        remarks: remarks.trim() || null,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        deliveryDate: deliveryDate ? new Date(deliveryDate).toISOString() : null,
      };

      if (canViewClient) {
        if (clientId) payload.clientId = clientId;
        payload.email = email.trim() || null;
      }

      if (canEditFinancials) {
        payload.value = Number(value);
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

  const eligibleParentCandidates = React.useMemo(() => {
    if (!localLookups?.parentCandidates) return [];
    return localLookups.parentCandidates.filter((cand) => cand.id !== project?.id);
  }, [localLookups?.parentCandidates, project?.id]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[94vw] sm:max-w-3xl md:min-w-[700px] lg:min-w-[820px] max-h-[92vh] p-0 gap-0 border shadow-2xl rounded-2xl overflow-hidden bg-background flex flex-col">
          {/* MODAL HEADER */}
          <DialogHeader className="p-5 pb-4 border-b bg-muted/20 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-2xs">
                  <Edit2 className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-foreground">
                    Edit Project & Master Order
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Update platform order link, operational financial parameters, milestones, and deliverable status
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

          {/* SCROLLABLE FORM BODY */}
          <form onSubmit={handleSubmit} id="edit-project-form" className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-[64vh] max-h-[calc(90vh-140px)]">
              <div className="p-5 sm:p-6 space-y-5">
                {/* AUTO-GENERATED CODE DISPLAY */}
                <div className="rounded-xl border border-border/60 bg-card/40 p-3.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-primary shrink-0" />
                    <div>
                      <span className="text-[11px] text-muted-foreground">Project System Identifier:</span>
                      <p className="font-mono text-sm font-bold text-primary">{project?.projectName}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyCode}
                    className="text-xs h-8 gap-1.5"
                  >
                    {copiedCode ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                    Copy Code
                  </Button>
                </div>

                {/* SECTION 1: ORDER ID, LINK & SERVICE DOMAIN */}
                <div className="rounded-xl border bg-card/60 p-4 space-y-3.5 shadow-2xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Hash className="size-3.5 text-primary" /> Platform Order & Service Domain
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                    {/* Order ID */}
                    <div className="sm:col-span-6 space-y-1.5 min-w-0">
                      <Label htmlFor="edit-orderId" className="text-xs font-semibold">
                        Platform Order ID <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="edit-orderId"
                        value={orderId}
                        onChange={(e) => {
                          setOrderId(e.target.value);
                          if (fieldErrors.orderId) {
                            setFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next.orderId;
                              return next;
                            });
                          }
                        }}
                        placeholder="e.g. #FO918234, ORD-100293"
                        required
                        className={fieldErrors.orderId ? "border-destructive font-mono text-xs h-9" : "font-mono text-xs h-9"}
                      />
                      {fieldErrors.orderId && (
                        <p className="text-[11px] text-destructive">{fieldErrors.orderId}</p>
                      )}
                    </div>

                    {/* Order Link */}
                    <div className="sm:col-span-6 space-y-1.5 min-w-0">
                      <Label htmlFor="edit-orderLink" className="text-xs font-semibold flex items-center gap-1">
                        <Link className="size-3 text-muted-foreground" /> Platform Order URL Link
                      </Label>
                      <Input
                        id="edit-orderLink"
                        type="url"
                        value={orderLink}
                        onChange={(e) => setOrderLink(e.target.value)}
                        placeholder="https://www.fiverr.com/orders/..."
                        className="text-xs h-9"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 pt-1">
                    {/* Service Description */}
                    <div className="sm:col-span-6 space-y-1.5 min-w-0">
                      <Label htmlFor="edit-service" className="text-xs font-semibold">
                        Service Title / Package
                      </Label>
                      <Input
                        id="edit-service"
                        value={service}
                        onChange={(e) => setService(e.target.value)}
                        placeholder="e.g. Full-Stack Web Development"
                        className="text-xs h-9"
                      />
                    </div>

                    {/* Parent Project Selector */}
                    <div className="sm:col-span-6 space-y-1.5 min-w-0">
                      <Label htmlFor="edit-parentId" className="text-xs font-semibold flex items-center gap-1">
                        <GitFork className="size-3 text-blue-500" /> Parent Project / Master Order
                      </Label>
                      <Select
                        value={parentId || "none"}
                        onValueChange={(val: string | null) => setParentId(val === "none" ? "" : (val || ""))}
                      >
                        <SelectTrigger className="w-full h-9 text-xs">
                          <SelectValue placeholder="Standalone Project (No Parent)">
                            {(() => {
                              if (!parentId || parentId === "none") return "Standalone (No Parent)";
                              const matched = eligibleParentCandidates.find((p) => p.id === parentId);
                              return matched ? `${matched.projectName} (${matched.orderId})` : "Standalone (No Parent)";
                            })()}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="text-xs">
                            Standalone Project (No Parent)
                          </SelectItem>
                          {eligibleParentCandidates.map((cand) => (
                            <SelectItem key={cand.id} value={cand.id} className="text-xs font-mono">
                              {cand.projectName} — Order: {cand.orderId}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                    {/* Status */}
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">Status</Label>
                        <button
                          type="button"
                          onClick={() => setStatusModalOpen(true)}
                          className="text-[11px] text-primary hover:underline flex items-center gap-0.5 font-medium"
                        >
                          <Plus className="size-3" /> New Status
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
                                  className="size-2 rounded-full shrink-0"
                                  style={{ backgroundColor: st.color || "#3b82f6" }}
                                />
                                <span>{st.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Service Line */}
                    <div className="space-y-1.5 min-w-0">
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
                </div>

                {/* SECTION 2: CLIENT & SELLER ACCOUNT */}
                <div className="rounded-xl border bg-card/60 p-4 space-y-3.5 shadow-2xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Globe className="size-3.5 text-blue-500" /> Platform Account & Client
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {/* Profile */}
                    <div className="space-y-1.5 min-w-0">
                      <Label className="text-xs font-semibold">Platform Profile</Label>
                      {canViewClient ? (
                        <Select value={profileId} onValueChange={(val: string | null) => setProfileId(val || "")}>
                          <SelectTrigger className="w-full h-9 text-xs overflow-hidden">
                            <SelectValue placeholder="Select Profile">
                              {localLookups?.profiles.find((p) => p.id === profileId)?.username}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {localLookups?.profiles.map((prof) => (
                              <SelectItem key={prof.id} value={prof.id} className="text-xs">
                                <span className="font-mono">{prof.username}</span>
                                <span className="text-[10px] text-muted-foreground ml-1.5">
                                  ({prof.platform?.name || "Platform"})
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="h-9 rounded-md border bg-muted/40 px-3 flex items-center text-xs text-muted-foreground gap-1.5">
                          <Lock className="size-3 text-muted-foreground" /> Protected Platform Profile
                        </div>
                      )}
                    </div>

                    {/* Client */}
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">Client Identity</Label>
                        {canViewClient && (
                          <button
                            type="button"
                            onClick={() => setClientModalOpen(true)}
                            className="text-[11px] text-primary hover:underline flex items-center gap-0.5 font-medium"
                          >
                            <Plus className="size-3" /> New
                          </button>
                        )}
                      </div>
                      {canViewClient ? (
                        <Select value={clientId} onValueChange={(val: string | null) => setClientId(val || "")}>
                          <SelectTrigger className="w-full h-9 text-xs overflow-hidden">
                            <SelectValue placeholder="Select Client">
                              {localLookups?.clients.find((c) => c.id === clientId)?.name}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {localLookups?.clients.map((cl) => (
                              <SelectItem key={cl.id} value={cl.id} className="text-xs">
                                {cl.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="h-9 rounded-md border bg-muted/40 px-3 flex items-center text-xs text-muted-foreground gap-1.5">
                          <Lock className="size-3 text-muted-foreground" /> Client Masked
                        </div>
                      )}
                    </div>

                    {/* Client Email */}
                    <div className="space-y-1.5 min-w-0">
                      <Label htmlFor="edit-email" className="text-xs font-semibold flex items-center gap-1">
                        <Mail className="size-3 text-muted-foreground" /> Client Email
                      </Label>
                      {canViewClient ? (
                        <Input
                          id="edit-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="client@company.com"
                          className="text-xs h-9"
                        />
                      ) : (
                        <div className="h-9 rounded-md border bg-muted/40 px-3 flex items-center text-xs text-muted-foreground gap-1.5">
                          <Lock className="size-3 text-muted-foreground" /> Email Masked
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* SECTION 3: FINANCIALS, PERCENTAGE & DEADLINES */}
                <div className="rounded-xl border bg-card/60 p-4 space-y-3.5 shadow-2xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <DollarSign className="size-3.5 text-emerald-500" /> Financials, Margins & Milestones
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {/* Contract Value */}
                    <div className="space-y-1.5 min-w-0">
                      <Label htmlFor="edit-value" className="text-xs font-semibold">
                        Contract Value ($)
                      </Label>
                      {canEditFinancials ? (
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-semibold">
                            $
                          </span>
                          <Input
                            id="edit-value"
                            type="number"
                            min="0"
                            step="any"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder="0.00"
                            className="pl-7 text-xs h-9 font-mono"
                          />
                        </div>
                      ) : (
                        <div className="h-9 rounded-md border bg-muted/40 px-3 flex items-center text-xs text-muted-foreground gap-1.5">
                          <Lock className="size-3 text-muted-foreground" /> Value Restricted
                        </div>
                      )}
                    </div>

                    {/* Net Amount */}
                    <div className="space-y-1.5 min-w-0">
                      <Label htmlFor="edit-amount" className="text-xs font-semibold">
                        Net Amount ($)
                      </Label>
                      {canEditFinancials ? (
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-semibold">
                            $
                          </span>
                          <Input
                            id="edit-amount"
                            type="number"
                            min="0"
                            step="any"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Net payout / amount"
                            className="pl-7 text-xs h-9 font-mono"
                          />
                        </div>
                      ) : (
                        <div className="h-9 rounded-md border bg-muted/40 px-3 flex items-center text-xs text-muted-foreground gap-1.5">
                          <Lock className="size-3 text-muted-foreground" /> Amount Restricted
                        </div>
                      )}
                    </div>

                    {/* Margin / Percentage */}
                    <div className="space-y-1.5 min-w-0">
                      <Label htmlFor="edit-percentage" className="text-xs font-semibold flex items-center gap-1">
                        <Percent className="size-3 text-muted-foreground" /> Share / Margin (%)
                      </Label>
                      {canEditFinancials ? (
                        <div className="relative">
                          <Input
                            id="edit-percentage"
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            value={percentage}
                            onChange={(e) => setPercentage(e.target.value)}
                            placeholder="e.g. 20"
                            className="text-xs h-9 font-mono pr-7"
                          />
                          <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-semibold">
                            %
                          </span>
                        </div>
                      ) : (
                        <div className="h-9 rounded-md border bg-muted/40 px-3 flex items-center text-xs text-muted-foreground gap-1.5">
                          <Lock className="size-3 text-muted-foreground" /> Percentage Restricted
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                    {/* Order Sheet URL */}
                    <div className="space-y-1.5 min-w-0 sm:col-span-3">
                      <Label htmlFor="edit-orderSheetUrl" className="text-xs font-semibold flex items-center gap-1">
                        <FileText className="size-3 text-muted-foreground" /> Order Sheet / Google Doc URL
                      </Label>
                      {canEditFinancials ? (
                        <Input
                          id="edit-orderSheetUrl"
                          type="url"
                          value={orderSheetUrl}
                          onChange={(e) => setOrderSheetUrl(e.target.value)}
                          placeholder="https://docs.google.com/spreadsheets/..."
                          className="text-xs h-9"
                        />
                      ) : (
                        <div className="h-9 rounded-md border bg-muted/40 px-3 flex items-center text-xs text-muted-foreground gap-1.5">
                          <Lock className="size-3 text-muted-foreground" /> Restricted
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                    {/* Start Date */}
                    <div className="space-y-1.5 min-w-0">
                      <Label htmlFor="edit-startDate" className="text-xs font-semibold flex items-center gap-1">
                        <Calendar className="size-3 text-muted-foreground" /> Order / Start Date
                      </Label>
                      <Input
                        id="edit-startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="text-xs h-9"
                      />
                    </div>

                    {/* Delivery Date */}
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="edit-deliveryDate" className="text-xs font-semibold flex items-center gap-1">
                          <Clock className="size-3 text-muted-foreground" /> Promised Delivery Deadline
                        </Label>
                        {timelineDays !== null && (
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {timelineDays} days duration
                          </span>
                        )}
                      </div>
                      <Input
                        id="edit-deliveryDate"
                        type="date"
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        className="text-xs h-9"
                      />
                    </div>
                  </div>

                  {/* Remarks */}
                  <div className="space-y-1.5 pt-1">
                    <Label htmlFor="edit-remarks" className="text-xs font-semibold">
                      Remarks / Operational Notes
                    </Label>
                    <Textarea
                      id="edit-remarks"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Special instructions, milestones, client preferences..."
                      rows={2}
                      className="text-xs resize-none"
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* MODAL FOOTER */}
            <DialogFooter className="p-4 border-t bg-muted/20 flex flex-col-reverse sm:flex-row items-center justify-between gap-2 shrink-0">
              <span className="text-[11px] text-muted-foreground">
                Changes will be audited with your user identity
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
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
        onSuccess={(newClient) => {
          setLocalLookups((prev) => (prev ? { ...prev, clients: [newClient, ...prev.clients] } : prev));
          setClientId(newClient.id);
          onRefreshLookups?.();
        }}
      />
      <QuickCreateServiceLineDialog
        open={serviceLineModalOpen}
        onOpenChange={setServiceLineModalOpen}
        onSuccess={(newServiceLine) => {
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
        onSuccess={(newStatus) => {
          setLocalLookups((prev) =>
            prev ? { ...prev, statuses: [...prev.statuses, newStatus] } : prev,
          );
          setStatusId(newStatus.id);
          onRefreshLookups?.();
        }}
      />
    </>
  );
}
