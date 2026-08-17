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
  RotateCw,
  AlertCircle,
  Hash,
} from "lucide-react";

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lookups: ProjectLookups | null;
  onSuccess: () => void;
  onRefreshLookups?: () => Promise<void>;
}

export function CreateProjectModal({
  open,
  onOpenChange,
  lookups,
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
  const [projectName, setProjectName] = React.useState("");
  const [orderId, setOrderId] = React.useState("");
  const [clientId, setClientId] = React.useState("");
  const [platformId, setPlatformId] = React.useState("");
  const [profileId, setProfileId] = React.useState("");
  const [serviceLineId, setServiceLineId] = React.useState("");
  const [statusId, setStatusId] = React.useState("");
  const [value, setValue] = React.useState<number | string>(0);
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

  // Local lookup extensions (to immediately reflect newly created items before parent re-fetch)
  const [localLookups, setLocalLookups] = React.useState<ProjectLookups | null>(lookups);

  React.useEffect(() => {
    setLocalLookups(lookups);
  }, [lookups]);

  // Generate random order ID
  const generateRandomOrderId = () => {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    setOrderId(`ORD-${randomNum}`);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.orderId;
      return next;
    });
  };

  // Initialize defaults on open
  React.useEffect(() => {
    if (open && localLookups) {
      setProjectName("");
      generateRandomOrderId();
      
      const initialPlatform = localLookups.platforms[0]?.id || "";
      setPlatformId(initialPlatform);

      // Find profile that belongs to initial platform or fallback to first profile
      const matchingProfile = localLookups.profiles.find((p) => p.platformId === initialPlatform) || localLookups.profiles[0];
      setProfileId(matchingProfile?.id || "");
      if (matchingProfile?.platformId) {
        setPlatformId(matchingProfile.platformId);
      }

      setClientId(localLookups.clients[0]?.id || "");
      setServiceLineId(localLookups.serviceLines[0]?.id || "");
      setStatusId(localLookups.statuses[0]?.id || "");
      setValue(0);
      setOrderSheetUrl("");
      setStartDate(new Date().toISOString().split("T")[0] || "");
      setDeliveryDate(new Date(Date.now() + 14 * 86400 * 1000).toISOString().split("T")[0] || "");
      setAssignedTeamId(localLookups.teams[0]?.id || "");
      setComponents([]);
      setNewComponentName("");
      setFieldErrors({});
      setGeneralError(null);
    }
  }, [open, localLookups]);

  // Filter profiles based on selected platform (with fallback to all if none match)
  const filteredProfiles = React.useMemo(() => {
    if (!localLookups?.profiles) return [];
    if (!platformId) return localLookups.profiles;
    const matching = localLookups.profiles.filter((p) => p.platformId === platformId);
    return matching.length > 0 ? matching : localLookups.profiles;
  }, [localLookups?.profiles, platformId]);

  // Calculate timeline duration in days
  const timelineDays = React.useMemo(() => {
    if (!startDate || !deliveryDate) return null;
    const start = new Date(startDate).getTime();
    const end = new Date(deliveryDate).getTime();
    if (isNaN(start) || isNaN(end) || end < start) return null;
    return Math.round((end - start) / (1000 * 60 * 60 * 24));
  }, [startDate, deliveryDate]);

  // Handle Platform Change
  const handlePlatformChange = (newPlatformId: string | null) => {
    if (!newPlatformId) return;
    setPlatformId(newPlatformId);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.platformId;
      return next;
    });

    // Auto-select first profile of this platform if current profile doesn't match
    const matchingProfiles = localLookups?.profiles.filter((p) => p.platformId === newPlatformId);
    if (matchingProfiles && matchingProfiles.length > 0) {
      if (!matchingProfiles.some((p) => p.id === profileId)) {
        setProfileId(matchingProfiles[0]?.id || "");
      }
    }
  };

  // Handle Profile Change
  const handleProfileChange = (newProfileId: string | null) => {
    if (!newProfileId) return;
    setProfileId(newProfileId);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.profileId;
      return next;
    });

    // Auto-sync platform to match selected profile
    const selected = localLookups?.profiles.find((p) => p.id === newProfileId);
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

    // Client-side required field check
    const errors: Record<string, string> = {};
    if (!projectName.trim()) errors.projectName = "Project name is required";
    if (!orderId.trim()) errors.orderId = "Order ID is required";
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
        projectName: projectName.trim(),
        orderId: orderId.trim(),
        clientId: clientId || localLookups?.clients[0]?.id || "",
        profileId: profileId || localLookups?.profiles[0]?.id || "",
        serviceLineId: serviceLineId || undefined,
        statusId: statusId || localLookups?.statuses[0]?.id || "",
        value: canEditFinancials ? Number(value) : 0,
        orderSheetUrl: canEditFinancials && orderSheetUrl.trim() ? orderSheetUrl.trim() : undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        deliveryDate: deliveryDate ? new Date(deliveryDate).toISOString() : undefined,
        assignedTeamIds: assignedTeamId ? [assignedTeamId] : [],
        initialComponents: components,
      };

      await api.post("/projects", payload);
      toast.success("Project created successfully");
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
        <DialogContent className="w-[92vw] sm:max-w-3xl md:min-w-[680px] lg:min-w-[760px] max-h-[92vh] p-0 gap-0 border shadow-2xl rounded-2xl overflow-hidden bg-background flex flex-col">
          {/* MODAL HEADER */}
          <DialogHeader className="p-5 pb-4 border-b bg-muted/20 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-2xs">
                  <Briefcase className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-foreground">
                    Create New Project
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Set up project identity, client link, milestones, and deliverables
                  </DialogDescription>
                </div>
              </div>
              <Badge variant="outline" className="hidden sm:flex text-[11px] font-mono gap-1 py-1">
                <Hash className="size-3 text-muted-foreground" />
                {orderId || "NO-KEY"}
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
            <ScrollArea className="h-[62vh] max-h-[calc(90vh-140px)]">
              <div className="p-5 sm:p-6 space-y-5">
                {/* SECTION 1: CORE IDENTITY */}
                <div className="rounded-xl border bg-card/60 p-4 space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-primary" /> Core Project Identity
                    </h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={generateRandomOrderId}
                      className="h-6 text-[11px] px-2 text-muted-foreground hover:text-primary gap-1"
                    >
                      <RotateCw className="size-3" /> Auto Key
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                    {/* Project Name */}
                    <div className="sm:col-span-7 space-y-1.5 min-w-0">
                      <Label htmlFor="projectName" className="text-xs font-semibold">
                        Project Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="projectName"
                        value={projectName}
                        onChange={(e) => {
                          setProjectName(e.target.value);
                          if (fieldErrors.projectName) {
                            setFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next.projectName;
                              return next;
                            });
                          }
                        }}
                        placeholder="e.g. NextGen FinTech Platform"
                        required
                        className={fieldErrors.projectName ? "border-destructive text-xs h-9" : "text-xs h-9"}
                        autoFocus
                      />
                      {fieldErrors.projectName && (
                        <p className="text-[11px] text-destructive">{fieldErrors.projectName}</p>
                      )}
                    </div>

                    {/* Order ID */}
                    <div className="sm:col-span-5 space-y-1.5 min-w-0">
                      <Label htmlFor="orderId" className="text-xs font-semibold">
                        Order ID / Key <span className="text-destructive">*</span>
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
                        placeholder="ORD-100293"
                        required
                        className={fieldErrors.orderId ? "border-destructive font-mono text-xs h-9" : "font-mono text-xs h-9"}
                      />
                      {fieldErrors.orderId && (
                        <p className="text-[11px] text-destructive">{fieldErrors.orderId}</p>
                      )}
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

                {/* SECTION 2: PLATFORM & CLIENT LINKAGE */}
                <div className="rounded-xl border bg-card/60 p-4 space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Building2 className="size-3.5 text-blue-500" /> Platform & Client Linkage
                    </h4>
                    {!canViewClient && (
                      <Badge variant="outline" className="text-[10px] text-amber-600 bg-amber-500/10 border-amber-500/20 font-mono gap-1">
                        <Lock className="size-2.5" /> Confidentiality Guard
                      </Badge>
                    )}
                  </div>

                  {/* 2-Column Row for Platform & Profile */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Platform */}
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">Origin Platform</Label>
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
                          <SelectValue placeholder="Select Platform">
                            {localLookups?.platforms.find((pl) => pl.id === platformId)?.name}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {localLookups?.platforms.map((pl) => (
                            <SelectItem key={pl.id} value={pl.id} className="text-xs">
                              {pl.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Profile */}
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">
                          Account Profile <span className="text-destructive">*</span>
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
                        <SelectTrigger className={fieldErrors.profileId ? "border-destructive w-full h-9 text-xs overflow-hidden" : "w-full h-9 text-xs overflow-hidden"}>
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
                          {filteredProfiles.map((pr) => (
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
                      {fieldErrors.profileId && (
                        <p className="text-[11px] text-destructive">{fieldErrors.profileId}</p>
                      )}
                    </div>
                  </div>

                  {/* Full Width Row for Client Identity */}
                  <div className="space-y-1.5 min-w-0 pt-1">
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
                          <SelectValue placeholder="Select Client Account">
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
                      <div className="h-9 bg-muted/40 rounded-md border flex items-center px-3 text-xs text-muted-foreground font-mono">
                        <Lock className="size-3 mr-1.5 text-amber-500 shrink-0" /> Client identity protected by permissions
                      </div>
                    )}
                  </div>
                </div>

                {/* SECTION 3: FINANCIALS & TIMELINE */}
                <div className="rounded-xl border bg-card/60 p-4 space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <DollarSign className="size-3.5 text-emerald-500" /> Financials & Timeline
                    </h4>
                    {timelineDays !== null && (
                      <Badge variant="secondary" className="text-[11px] font-mono gap-1">
                        <Clock className="size-3 text-primary" /> {timelineDays} days duration
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Contract Value */}
                    <div className="space-y-1.5 min-w-0">
                      <Label htmlFor="value" className="text-xs font-semibold">
                        Contract Value ($ USD)
                      </Label>
                      {canEditFinancials ? (
                        <div className="relative">
                          <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground font-mono">$</span>
                          <Input
                            id="value"
                            type="number"
                            min="0"
                            step="0.01"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder="0.00"
                            className="pl-6 font-mono text-xs h-9"
                          />
                        </div>
                      ) : (
                        <Input
                          disabled
                          value="Restricted by Permissions"
                          className="bg-muted text-muted-foreground font-mono text-xs h-9"
                        />
                      )}
                    </div>

                    {/* Order Sheet URL */}
                    <div className="space-y-1.5 min-w-0">
                      <Label htmlFor="orderSheetUrl" className="text-xs font-semibold">
                        Order / Spec Sheet URL
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
                        <Input
                          disabled
                          value="Restricted"
                          className="bg-muted text-muted-foreground text-xs h-9"
                        />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                    <div className="space-y-1.5 min-w-0">
                      <Label htmlFor="startDate" className="text-xs font-semibold">
                        Start Date
                      </Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="text-xs h-9"
                      />
                    </div>

                    <div className="space-y-1.5 min-w-0">
                      <Label htmlFor="deliveryDate" className="text-xs font-semibold">
                        Target Delivery Date
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
                </div>

                {/* SECTION 4: TEAM ALLOCATION & DELIVERABLES */}
                <div className="rounded-xl border bg-card/60 p-4 space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Layers className="size-3.5 text-purple-500" /> Team Allocation & Deliverables
                    </h4>
                    <Badge variant="outline" className="text-[10px]">
                      {components.length} Sub-deliverables
                    </Badge>
                  </div>

                  {/* Primary Allocated Team */}
                  <div className="space-y-1.5 min-w-0">
                    <Label className="text-xs font-semibold">Primary Allocated Team</Label>
                    <Select value={assignedTeamId} onValueChange={(val: string | null) => setAssignedTeamId(val || "")}>
                      <SelectTrigger className="w-full h-9 text-xs overflow-hidden">
                        <SelectValue placeholder="Select Primary Team">
                          {(() => {
                            const tm = localLookups?.teams.find((t) => t.id === assignedTeamId);
                            if (!tm) return undefined;
                            return (
                              <span className="truncate block font-medium">
                                {tm.name} {tm.department ? `(${tm.department.name})` : ""}
                              </span>
                            );
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {localLookups?.teams.map((t) => (
                          <SelectItem key={t.id} value={t.id} className="text-xs">
                            <span className="truncate">{t.name} ({t.department?.name})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Deliverables List Builder */}
                  <div className="space-y-2 pt-2 border-t">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Initial Deliverable Components (Optional)
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={newComponentName}
                        onChange={(e) => setNewComponentName(e.target.value)}
                        placeholder="e.g. Authentication Subsystem"
                        className="text-xs h-8"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddDraftComponent();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleAddDraftComponent}
                        className="text-xs h-8 shrink-0 gap-1"
                      >
                        <Plus className="size-3.5" /> Add
                      </Button>
                    </div>

                    {components.length > 0 && (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto p-1 bg-muted/20 rounded-lg border">
                        {components.map((comp, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-1.5 px-2.5 bg-card rounded text-xs border"
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                              <span className="truncate">{comp.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveDraftComponent(idx)}
                              className="text-muted-foreground hover:text-destructive p-0.5"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* MODAL FOOTER */}
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
              <Button
                type="submit"
                disabled={loading || !projectName.trim() || !orderId.trim() || !profileId}
                className="text-xs h-9 gap-1.5 shadow-sm px-5"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> Creating...
                  </>
                ) : (
                  "Create Project"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* QUICK-CREATE NESTED DIALOGS */}
      {localLookups && (
        <>
          <QuickCreateClientDialog
            open={clientModalOpen}
            onOpenChange={setClientModalOpen}
            platforms={localLookups.platforms}
            defaultPlatformId={platformId}
            onSuccess={handleClientCreated}
          />

          <QuickCreateProfileDialog
            open={profileModalOpen}
            onOpenChange={setProfileModalOpen}
            platforms={localLookups.platforms}
            defaultPlatformId={platformId}
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
      )}
    </>
  );
}
