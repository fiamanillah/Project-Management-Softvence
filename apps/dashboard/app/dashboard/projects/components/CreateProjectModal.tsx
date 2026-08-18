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
import { usePermissions, hasPermission } from "@/lib/permissions/PermissionContext";
import type {
  ProjectLookups,
  CreateProjectDTO,
  ProjectStatusItem,
  PlatformItem,
  ProfileItem,
  ServiceLineItem,
  ClientItem,
} from "@workspace/shared";
import {
  QuickCreateClientDialog,
  QuickCreateProfileDialog,
  QuickCreatePlatformDialog,
  QuickCreateServiceLineDialog,
  QuickCreateStatusDialog,
} from "./QuickCreateDialogs";
import {
  Briefcase,
  DollarSign,
  Building2,
  Calendar,
  Layers,
  Loader2,
  Lock,
  Plus,
  Trash2,
  Sparkles,
  Globe,
  Clock,
  CheckCircle2,
  AlertCircle,
  Hash,
  GitFork,
  Link,
  Mail,
  Percent,
  FileText,
} from "lucide-react";

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lookups: ProjectLookups | null;
  initialParentId?: string | null;
  onSuccess: () => void;
  onRefreshLookups?: () => Promise<void>;
}

export function CreateProjectModal({
  open,
  onOpenChange,
  lookups,
  initialParentId,
  onSuccess,
  onRefreshLookups,
}: CreateProjectModalProps) {
  const permissions = usePermissions();
  const canViewClient = hasPermission(permissions, "project.client.view");
  const canEditFinancials = hasPermission(permissions, "project.financial.edit");

  const [loading, setLoading] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [generalError, setGeneralError] = React.useState<string | null>(null);

  // Form State
  const [orderId, setOrderId] = React.useState("");
  const [orderLink, setOrderLink] = React.useState("");
  const [service, setService] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [parentId, setParentId] = React.useState<string>("");
  const [clientId, setClientId] = React.useState("");
  const [platformId, setPlatformId] = React.useState("");
  const [profileId, setProfileId] = React.useState("");
  const [serviceLineId, setServiceLineId] = React.useState("");
  const [statusId, setStatusId] = React.useState("");
  const [value, setValue] = React.useState<number | string>(0);
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

  // Local lookup extensions
  const [localLookups, setLocalLookups] = React.useState<ProjectLookups | null>(lookups);

  React.useEffect(() => {
    setLocalLookups(lookups);
  }, [lookups]);

  // Initialize defaults on open
  React.useEffect(() => {
    if (open && localLookups) {
      setOrderId("");
      setOrderLink("");
      setService("");
      setEmail("");
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
      setValue(0);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({});
    setGeneralError(null);

    const errors: Record<string, string> = {};
    if (!orderId.trim()) errors.orderId = "Platform Order ID is required";
    if (!profileId) errors.profileId = "Account profile is required";
    if (!statusId) errors.statusId = "Status is required";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      toast.error("Please fill in all required fields marked in red");
      return;
    }

    try {
      const payload: CreateProjectDTO = {
        orderId: orderId.trim(),
        orderLink: orderLink.trim() || undefined,
        service: service.trim() || undefined,
        email: canViewClient && email.trim() ? email.trim() : undefined,
        parentId: parentId && parentId !== "none" ? parentId : undefined,
        clientId: clientId || localLookups?.clients[0]?.id || "",
        profileId: profileId || localLookups?.profiles[0]?.id || "",
        serviceLineId: serviceLineId || undefined,
        statusId: statusId || localLookups?.statuses[0]?.id || "",
        value: canEditFinancials ? Number(value) : 0,
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

                {/* SECTION 1: ORDER ID, ORDER LINK & HIERARCHY */}
                <div className="rounded-xl border bg-card/60 p-4 space-y-3.5 shadow-2xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Hash className="size-3.5 text-primary" /> Platform Order & Service Domain
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                    {/* Platform Order ID */}
                    <div className="sm:col-span-6 space-y-1.5 min-w-0">
                      <Label htmlFor="orderId" className="text-xs font-semibold">
                        Platform Order ID <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="orderId"
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
                        placeholder="e.g. #FO918234, 38491024, or ORD-8832"
                        required
                        className={fieldErrors.orderId ? "border-destructive font-mono text-xs h-9" : "font-mono text-xs h-9"}
                        autoFocus
                      />
                      {fieldErrors.orderId && (
                        <p className="text-[11px] text-destructive">{fieldErrors.orderId}</p>
                      )}
                    </div>

                    {/* Platform Order Link */}
                    <div className="sm:col-span-6 space-y-1.5 min-w-0">
                      <Label htmlFor="orderLink" className="text-xs font-semibold flex items-center gap-1">
                        <Link className="size-3 text-muted-foreground" /> Platform Order URL Link
                      </Label>
                      <Input
                        id="orderLink"
                        type="url"
                        value={orderLink}
                        onChange={(e) => setOrderLink(e.target.value)}
                        placeholder="https://www.fiverr.com/orders/FO918234"
                        className="text-xs h-9"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 pt-1">
                    {/* Service Description */}
                    <div className="sm:col-span-6 space-y-1.5 min-w-0">
                      <Label htmlFor="service" className="text-xs font-semibold">
                        Service Title / Package
                      </Label>
                      <Input
                        id="service"
                        value={service}
                        onChange={(e) => setService(e.target.value)}
                        placeholder="e.g. Full-Stack Web Development, Figma UI/UX..."
                        className="text-xs h-9"
                      />
                    </div>

                    {/* Parent Project (Optional) */}
                    <div className="sm:col-span-6 space-y-1.5 min-w-0">
                      <Label htmlFor="parentId" className="text-xs font-semibold flex items-center gap-1">
                        <GitFork className="size-3 text-blue-500" /> Parent Project / Umbrella Order
                      </Label>
                      <Select
                        value={parentId || "none"}
                        onValueChange={(val: string | null) => setParentId(val === "none" ? "" : (val || ""))}
                      >
                        <SelectTrigger className="w-full h-9 text-xs">
                          <SelectValue placeholder="Standalone Project (No Parent)">
                            {(() => {
                              if (!parentId || parentId === "none") return "Standalone (No Parent)";
                              const matched = localLookups?.parentCandidates?.find((p) => p.id === parentId);
                              return matched ? `${matched.projectName} (${matched.orderId})` : "Standalone (No Parent)";
                            })()}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="text-xs">
                            Standalone Project (No Parent)
                          </SelectItem>
                          {localLookups?.parentCandidates?.map((cand) => (
                            <SelectItem key={cand.id} value={cand.id} className="text-xs font-mono">
                              {cand.projectName} — Order: {cand.orderId}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                    {/* Initial Status */}
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">
                          Initial Status <span className="text-destructive">*</span>
                        </Label>
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
                      {fieldErrors.statusId && (
                        <p className="text-[11px] text-destructive">{fieldErrors.statusId}</p>
                      )}
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

                {/* SECTION 2: CLIENT & PLATFORM SELLER ACCOUNT */}
                <div className="rounded-xl border bg-card/60 p-4 space-y-3.5 shadow-2xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-blue-500" /> Platform Account & Client
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {/* Platform */}
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">Platform</Label>
                        <button
                          type="button"
                          onClick={() => setPlatformModalOpen(true)}
                          className="text-[11px] text-primary hover:underline flex items-center gap-0.5 font-medium"
                        >
                          <Plus className="size-3" /> New
                        </button>
                      </div>
                      <Select value={platformId} onValueChange={handlePlatformChange}>
                        <SelectTrigger className="w-full h-9 text-xs overflow-hidden">
                          <SelectValue placeholder="Platform">
                            {localLookups?.platforms.find((p) => p.id === platformId)?.name}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {localLookups?.platforms.map((p) => (
                            <SelectItem key={p.id} value={p.id} className="text-xs">
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Profile */}
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">
                          Profile <span className="text-destructive">*</span>
                        </Label>
                        <button
                          type="button"
                          onClick={() => setProfileModalOpen(true)}
                          className="text-[11px] text-primary hover:underline flex items-center gap-0.5 font-medium"
                        >
                          <Plus className="size-3" /> New
                        </button>
                      </div>
                      <Select value={profileId} onValueChange={handleProfileChange}>
                        <SelectTrigger className="w-full h-9 text-xs overflow-hidden">
                          <SelectValue placeholder="Select Profile">
                            {localLookups?.profiles.find((p) => p.id === profileId)?.username}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {filteredProfiles.map((prof) => (
                            <SelectItem key={prof.id} value={prof.id} className="text-xs">
                              <span className="font-mono">{prof.username}</span>
                              <span className="text-[10px] text-muted-foreground ml-1.5">
                                ({prof.platform?.name || "Platform"})
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldErrors.profileId && (
                        <p className="text-[11px] text-destructive">{fieldErrors.profileId}</p>
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
                      <Label htmlFor="email" className="text-xs font-semibold flex items-center gap-1">
                        <Mail className="size-3 text-muted-foreground" /> Client Email
                      </Label>
                      {canViewClient ? (
                        <Input
                          id="email"
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
                    <DollarSign className="size-3.5 text-emerald-500" /> Financials, Margins & Deadlines
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {/* Contract Value */}
                    <div className="space-y-1.5 min-w-0">
                      <Label htmlFor="value" className="text-xs font-semibold">
                        Contract Value ($)
                      </Label>
                      {canEditFinancials ? (
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-semibold">
                            $
                          </span>
                          <Input
                            id="value"
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
                      <Label htmlFor="amount" className="text-xs font-semibold">
                        Net Amount ($)
                      </Label>
                      {canEditFinancials ? (
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-semibold">
                            $
                          </span>
                          <Input
                            id="amount"
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
                      <Label htmlFor="percentage" className="text-xs font-semibold flex items-center gap-1">
                        <Percent className="size-3 text-muted-foreground" /> Share / Margin (%)
                      </Label>
                      {canEditFinancials ? (
                        <div className="relative">
                          <Input
                            id="percentage"
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
                      <Label htmlFor="orderSheetUrl" className="text-xs font-semibold flex items-center gap-1">
                        <FileText className="size-3 text-muted-foreground" /> Order Sheet / Google Doc URL
                      </Label>
                      {canEditFinancials ? (
                        <Input
                          id="orderSheetUrl"
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
                      <Label htmlFor="startDate" className="text-xs font-semibold flex items-center gap-1">
                        <Calendar className="size-3 text-muted-foreground" /> Order / Start Date
                      </Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="text-xs h-9"
                      />
                    </div>

                    {/* Delivery Date */}
                    <div className="space-y-1.5 min-w-0">
                      <Label htmlFor="deliveryDate" className="text-xs font-semibold flex items-center gap-1">
                        <Clock className="size-3 text-muted-foreground" /> Promised Delivery Deadline
                      </Label>
                      <Input
                        id="deliveryDate"
                        type="date"
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        className="text-xs h-9"
                      />
                    </div>
                  </div>

                  {/* Remarks */}
                  <div className="space-y-1.5 pt-1">
                    <Label htmlFor="remarks" className="text-xs font-semibold">
                      Remarks / Operational Notes
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

                {/* SECTION 4: INITIAL ALLOCATIONS & DELIVERABLES */}
                <div className="rounded-xl border bg-card/60 p-4 space-y-3.5 shadow-2xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Layers className="size-3.5 text-primary" /> Primary Team & Deliverables
                  </h4>

                  {/* Primary Team */}
                  <div className="space-y-1.5 min-w-0">
                    <Label className="text-xs font-semibold">Primary Allocated Team</Label>
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

                  {/* Components / Sub-deliverables */}
                  <div className="space-y-2 pt-2 border-t border-border/40">
                    <Label className="text-xs font-semibold">Initial Deliverable Components</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newComponentName}
                        onChange={(e) => setNewComponentName(e.target.value)}
                        placeholder="e.g. Backend API Architecture, Figma Design..."
                        className="text-xs h-8 flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddDraftComponent();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={handleAddDraftComponent}
                        className="text-xs h-8"
                      >
                        <Plus className="size-3.5" /> Add
                      </Button>
                    </div>

                    {components.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1.5">
                        {components.map((comp, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="text-xs gap-1.5 py-1 px-2.5 bg-muted/60"
                          >
                            <span>{comp.name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveDraftComponent(idx)}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* MODAL FOOTER */}
            <DialogFooter className="p-4 border-t bg-muted/20 flex flex-col-reverse sm:flex-row items-center justify-between gap-2 shrink-0">
              <span className="text-[11px] text-muted-foreground">
                All fields marked <span className="text-destructive">*</span> are required
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
    </>
  );
}
