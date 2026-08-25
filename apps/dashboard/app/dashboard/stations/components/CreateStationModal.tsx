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
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { Switch } from "@workspace/ui/components/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Badge } from "@workspace/ui/components/badge";
import { api, handleFormApiError } from "@/lib/api";
import { toast } from "sonner";
import {
  Monitor,
  Loader2,
  Plus,
  X,
  Building2,
  GitBranch,
  ShieldCheck,
  Radio,
  Cpu,
} from "lucide-react";
import type {
  StationTypeItem,
  StationStatusItem,
  BranchItem,
  DepartmentItem,
  StationScopeContext,
} from "@workspace/shared";
import {
  normalizeMacAddress,
  isValidMacAddress,
  isValidIpOrSubnet,
} from "@workspace/shared";
import { ScrollArea } from "@workspace/ui/components/scroll-area";

interface CreateStationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stationTypes: StationTypeItem[];
  stationStatuses: StationStatusItem[];
  branches: BranchItem[];
  departments: DepartmentItem[];
  onSuccess: () => void;
}

export function CreateStationModal({
  open,
  onOpenChange,
  stationTypes,
  stationStatuses,
  branches,
  departments,
  onSuccess,
}: CreateStationModalProps) {
  const [loading, setLoading] = React.useState(false);

  // Form State
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [stationTypeId, setStationTypeId] = React.useState<string>("");
  const [statusId, setStatusId] = React.useState<string>("");
  const [branchId, setBranchId] = React.useState<string>("none");
  const [departmentId, setDepartmentId] = React.useState<string>("none");
  const [maxConcurrentUsers, setMaxConcurrentUsers] = React.useState<number>(1);
  const [isActive, setIsActive] = React.useState(true);

  // IP Restriction & Whitelist
  const [isIpRestricted, setIsIpRestricted] = React.useState(false);
  const [ipInput, setIpInput] = React.useState("");
  const [ipWhitelist, setIpWhitelist] = React.useState<string[]>([]);

  // MAC Restriction & Whitelist
  const [isMacRestricted, setIsMacRestricted] = React.useState(false);
  const [macInput, setMacInput] = React.useState("");
  const [macWhitelist, setMacWhitelist] = React.useState<string[]>([]);

  // Permission Scope Context
  const [scopeContext, setScopeContext] = React.useState<StationScopeContext | null>(null);

  // Validation errors
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      setName("");
      setCode("");
      setDescription("");
      setBranchId("none");
      setDepartmentId("none");
      setMaxConcurrentUsers(1);
      setIsIpRestricted(false);
      setIpWhitelist([]);
      setIpInput("");
      setIsMacRestricted(false);
      setMacWhitelist([]);
      setMacInput("");
      setIsActive(true);
      setFieldErrors({});

      if (stationTypes.length > 0 && stationTypes[0]) {
        setStationTypeId(stationTypes[0].id);
      }
      if (stationStatuses.length > 0 && stationStatuses[0]) {
        setStatusId(stationStatuses[0].id);
      }

      // Fetch server-resolved scope context for workstation creation (Rule FE-3)
      api
        .get("/stations/lookups/scope-context")
        .then((res: any) => {
          const data: StationScopeContext = res?.data || res;
          if (data) {
            setScopeContext(data);
            if (data.defaultBranchId) {
              setBranchId(data.defaultBranchId);
            }
            if (data.defaultDepartmentId) {
              setDepartmentId(data.defaultDepartmentId);
            }
          }
        })
        .catch((err) => console.warn("Failed to load station scope context:", err));
    }
  }, [open, stationTypes, stationStatuses]);

  const effectiveBranches = scopeContext?.authorizedBranches || branches;
  const effectiveDepartments = scopeContext?.authorizedDepartments || departments;

  const filteredDepartments = React.useMemo(() => {
    if (!branchId || branchId === "none") {
      return effectiveDepartments;
    }
    return effectiveDepartments.filter((d) => !d.branchId || d.branchId === branchId);
  }, [effectiveDepartments, branchId]);

  const handleBranchChange = (newBranchId: string | null) => {
    if (!newBranchId) return;
    setBranchId(newBranchId);
    if (newBranchId !== "none") {
      const allowedInNewBranch = effectiveDepartments.filter((d) => d.branchId === newBranchId);
      if (departmentId !== "none" && !allowedInNewBranch.some((d) => d.id === departmentId)) {
        setDepartmentId(
          allowedInNewBranch.length === 1 && allowedInNewBranch[0]
            ? allowedInNewBranch[0].id
            : "none",
        );
      }
    }
  };

  const handleAddIp = () => {
    const trimmed = ipInput.trim();
    if (!trimmed) return;
    const items = trimmed.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
    const updated = [...ipWhitelist];
    for (const item of items) {
      if (!isValidIpOrSubnet(item)) {
        toast.error(`Invalid IP address or subnet: "${item}" (e.g. 192.168.1.50 or 10.0.0.*)`);
        continue;
      }
      if (!updated.includes(item)) {
        updated.push(item);
      }
    }
    setIpWhitelist(updated);
    setIpInput("");
  };

  const handleRemoveIp = (ip: string) => {
    setIpWhitelist(ipWhitelist.filter((i) => i !== ip));
  };

  const handleAddMac = () => {
    const trimmed = macInput.trim();
    if (!trimmed) return;
    const items = trimmed.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
    const updated = [...macWhitelist];
    for (const item of items) {
      if (!isValidMacAddress(item)) {
        toast.error(`Invalid MAC address: "${item}" (e.g. 00:1A:2B:3C:4D:5E)`);
        continue;
      }
      const normalized = normalizeMacAddress(item);
      if (!updated.includes(normalized)) {
        updated.push(normalized);
      }
    }
    setMacWhitelist(updated);
    setMacInput("");
  };

  const handleRemoveMac = (mac: string) => {
    setMacWhitelist(macWhitelist.filter((m) => m !== mac));
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!code || code.startsWith("STN-")) {
      const generatedCode = `STN-${val
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 8)}`;
      setCode(generatedCode);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    if (!name.trim()) {
      setFieldErrors((prev) => ({ ...prev, name: "Station name is required" }));
      return;
    }
    if (!code.trim()) {
      setFieldErrors((prev) => ({ ...prev, code: "Station code is required" }));
      return;
    }
    if (!stationTypeId) {
      setFieldErrors((prev) => ({ ...prev, stationTypeId: "Station type is required" }));
      return;
    }
    if (!statusId) {
      setFieldErrors((prev) => ({ ...prev, statusId: "Station status is required" }));
      return;
    }

    setLoading(true);
    try {
      await api.post("/stations", {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
        stationTypeId,
        statusId,
        branchId: branchId !== "none" ? branchId : undefined,
        departmentId: departmentId !== "none" ? departmentId : undefined,
        maxConcurrentUsers: Number(maxConcurrentUsers) || 1,
        macAddress: macWhitelist[0] || null,
        isIpRestricted,
        ipWhitelist: isIpRestricted ? ipWhitelist : [],
        isMacRestricted,
        macWhitelist: isMacRestricted ? macWhitelist : [],
        isActive,
      });

      toast.success(`Workstation "${name.trim()}" created successfully.`);
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      const msg = handleFormApiError(err, (field, errObj) => {
        setFieldErrors((prev) => ({ ...prev, [field]: errObj.message }));
      });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full min-w-[min(100vw-2rem,44rem)] sm:min-w-[620px] md:min-w-[700px] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Monitor className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Create New Workstation
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Register a new physical or virtual sales workstation, configure shift limits, and assign organizational units.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 max-h-[calc(90vh-140px)] px-6 py-5">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="stn-name" className="text-xs font-semibold">
                    Station Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="stn-name"
                    placeholder="e.g. Sales Desk Alpha - US West"
                    value={name}
                    onChange={handleNameChange}
                    className={fieldErrors.name ? "border-destructive" : ""}
                  />
                  {fieldErrors.name && (
                    <p className="text-[11px] text-destructive">{fieldErrors.name}</p>
                  )}
                </div>

                {/* Code */}
                <div className="space-y-1.5">
                  <Label htmlFor="stn-code" className="text-xs font-semibold">
                    Station Code <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="stn-code"
                    placeholder="e.g. STN-SALES01"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className={`font-mono ${fieldErrors.code ? "border-destructive" : ""}`}
                  />
                  {fieldErrors.code && (
                    <p className="text-[11px] text-destructive">{fieldErrors.code}</p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="stn-desc" className="text-xs font-semibold">
                  Description / Location Notes
                </Label>
                <Textarea
                  id="stn-desc"
                  rows={2}
                  placeholder="Provide workstation location, equipment specs, or purpose..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Station Type */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Station Type <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={stationTypeId}
                    onValueChange={(val: string | null) => {
                      if (val) setStationTypeId(val);
                    }}
                  >
                    <SelectTrigger className="w-full h-9 text-xs">
                      <SelectValue placeholder="Select type">
                        {stationTypes.find((t) => t.id === stationTypeId)?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {stationTypes.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} {t.isSales ? "(Sales)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.stationTypeId && (
                    <p className="text-[11px] text-destructive">{fieldErrors.stationTypeId}</p>
                  )}
                </div>

                {/* Station Status */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Initial Status <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={statusId}
                    onValueChange={(val: string | null) => {
                      if (val) setStatusId(val);
                    }}
                  >
                    <SelectTrigger className="w-full h-9 text-xs">
                      <SelectValue placeholder="Select status">
                        {stationStatuses.find((s) => s.id === statusId)?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {stationStatuses.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="flex items-center gap-2">
                            <span
                              className="size-2 rounded-full"
                              style={{ backgroundColor: s.color || "#10b981" }}
                            />
                            {s.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.statusId && (
                    <p className="text-[11px] text-destructive">{fieldErrors.statusId}</p>
                  )}
                </div>
              </div>

              <div
                className={
                  scopeContext && !scopeContext.canSelectBranch
                    ? "grid grid-cols-1 gap-4"
                    : "grid grid-cols-1 sm:grid-cols-2 gap-4"
                }
              >
                {/* Physical Branch (Hidden if user's scope is restricted to their own department) */}
                {(!scopeContext || scopeContext.canSelectBranch) && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Physical Branch</Label>
                    <Select value={branchId} onValueChange={handleBranchChange}>
                      <SelectTrigger className="w-full h-9 text-xs">
                        <SelectValue placeholder="Select branch (Optional)">
                          {branchId === "none"
                            ? "None (Headquarters / Remote)"
                            : effectiveBranches.find((b) => b.id === branchId)?.name}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (Headquarters / Remote)</SelectItem>
                        {effectiveBranches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Department Unit (Nested under selected branch) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Department Unit</Label>
                    {branchId !== "none" && (
                      <span className="text-[10px] text-muted-foreground">
                        Filtered by branch
                      </span>
                    )}
                  </div>
                  <Select
                    value={departmentId}
                    onValueChange={(val: string | null) => {
                      if (val) setDepartmentId(val);
                    }}
                    disabled={scopeContext ? !scopeContext.canSelectDepartment : false}
                  >
                    <SelectTrigger className="w-full h-9 text-xs">
                      <SelectValue placeholder="Select department (Optional)">
                        {departmentId === "none"
                          ? "None (Global)"
                          : filteredDepartments.find((d) => d.id === departmentId)?.name ||
                            effectiveDepartments.find((d) => d.id === departmentId)?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Global)</SelectItem>
                      {filteredDepartments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Max Concurrent Users */}
              <div className="space-y-1.5">
                <Label htmlFor="stn-max-users" className="text-xs font-semibold">
                  Max Concurrent Operators
                </Label>
                <Input
                  id="stn-max-users"
                  type="number"
                  min={1}
                  max={50}
                  value={maxConcurrentUsers}
                  onChange={(e) => setMaxConcurrentUsers(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full"
                />
                <p className="text-[10px] text-muted-foreground">
                  Number of active operator sessions allowed at the same time on this workstation.
                </p>
              </div>

              {/* IP Whitelist & Access Restriction */}
              <div className="space-y-3 pt-3 border-t">
                <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/20">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="size-4 text-primary" />
                      Validate with IP / Enforce Network Restriction
                    </Label>
                    <p className="text-[10px] text-muted-foreground">
                      {isIpRestricted
                        ? "Restricted: Operators can only access this workstation from the whitelisted IP addresses below."
                        : "Open Access: Operators can access this workstation from any network / IP address."}
                    </p>
                  </div>
                  <Switch checked={isIpRestricted} onCheckedChange={setIsIpRestricted} />
                </div>

                {isIpRestricted && (
                  <div className="space-y-2 p-3 rounded-xl border bg-card/60 animate-in fade-in-50 duration-200">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground">
                        Allowed Network IPs ({ipWhitelist.length})
                      </Label>
                      <span className="text-[10px] text-muted-foreground">
                        Supports single IPs (e.g. 192.168.1.50) or subnets (10.0.0.*)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="e.g. 192.168.1.100, 10.0.0.*"
                        value={ipInput}
                        onChange={(e) => setIpInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddIp();
                          }
                        }}
                        className="font-mono text-xs"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleAddIp}
                        className="shrink-0 text-xs"
                      >
                        Add IP
                      </Button>
                    </div>

                    {ipWhitelist.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {ipWhitelist.map((ip) => (
                          <Badge
                            key={ip}
                            variant="secondary"
                            className="font-mono text-xs gap-1 py-0.5 px-2 bg-primary/10 text-primary border-primary/20"
                          >
                            {ip}
                            <X
                              className="size-3 cursor-pointer hover:text-destructive transition-colors"
                              onClick={() => handleRemoveIp(ip)}
                            />
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 italic">
                        Warning: Add at least one authorized IP, or non-admin operators will be blocked.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* MAC Whitelist & Hardware Restriction */}
              <div className="space-y-3 pt-3 border-t">
                <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/20">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <Cpu className="size-4 text-primary" />
                      Validate with MAC / Enforce Hardware Restriction
                    </Label>
                    <p className="text-[10px] text-muted-foreground">
                      {isMacRestricted
                        ? "Restricted: Operators can only access this workstation from the authorized device MACs below."
                        : "Open Device Access: Operators can connect from any terminal/device."}
                    </p>
                  </div>
                  <Switch checked={isMacRestricted} onCheckedChange={setIsMacRestricted} />
                </div>

                {isMacRestricted && (
                  <div className="space-y-2 p-3 rounded-xl border bg-card/60 animate-in fade-in-50 duration-200">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground">
                        Allowed MAC Addresses ({macWhitelist.length})
                      </Label>
                      <span className="text-[10px] text-muted-foreground">
                        Standard formats accepted (e.g. 00:1A:2B:3C:4D:5E or 00-1A-2B-3C-4D-5E)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="e.g. 00:1A:2B:3C:4D:5E, AA-BB-CC-DD-EE-FF"
                        value={macInput}
                        onChange={(e) => setMacInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddMac();
                          }
                        }}
                        className="font-mono text-xs uppercase"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleAddMac}
                        className="shrink-0 text-xs"
                      >
                        Add MAC
                      </Button>
                    </div>

                    {macWhitelist.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {macWhitelist.map((mac) => (
                          <Badge
                            key={mac}
                            variant="secondary"
                            className="font-mono text-xs gap-1 py-0.5 px-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                          >
                            {mac}
                            <X
                              className="size-3 cursor-pointer hover:text-destructive transition-colors"
                              onClick={() => handleRemoveMac(mac)}
                            />
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 italic">
                        Warning: Add at least one authorized MAC address, or non-admin operators will be blocked.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Active Switch */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold">Station Enabled</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Operators can join and operate this station when enabled.
                  </p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-4 border-t gap-2 sm:gap-0 bg-muted/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-1.5">
              {loading && <Loader2 className="size-4 animate-spin" />}
              Create Workstation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
