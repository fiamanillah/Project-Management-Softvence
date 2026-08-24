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
} from "lucide-react";
import type {
  StationTypeItem,
  StationStatusItem,
  BranchItem,
  DepartmentItem,
} from "@workspace/shared";

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
  const [macAddress, setMacAddress] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);

  // IP Whitelist tagger
  const [ipInput, setIpInput] = React.useState("");
  const [ipWhitelist, setIpWhitelist] = React.useState<string[]>([]);

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
      setMacAddress("");
      setIpWhitelist([]);
      setIpInput("");
      setIsActive(true);
      setFieldErrors({});

      if (stationTypes.length > 0 && stationTypes[0]) {
        setStationTypeId(stationTypes[0].id);
      }
      if (stationStatuses.length > 0 && stationStatuses[0]) {
        setStatusId(stationStatuses[0].id);
      }
    }
  }, [open, stationTypes, stationStatuses]);

  const handleAddIp = () => {
    const trimmed = ipInput.trim();
    if (!trimmed) return;
    if (!ipWhitelist.includes(trimmed)) {
      setIpWhitelist([...ipWhitelist, trimmed]);
    }
    setIpInput("");
  };

  const handleRemoveIp = (ip: string) => {
    setIpWhitelist(ipWhitelist.filter((i) => i !== ip));
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
        macAddress: macAddress.trim() || undefined,
        ipWhitelist,
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
      <DialogContent className="w-full max-w-2xl min-w-[min(100vw-2rem,600px)] sm:min-w-[640px] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl">
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
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
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
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
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Department */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Department Unit</Label>
              <Select
                value={departmentId}
                onValueChange={(val: string | null) => {
                  if (val) setDepartmentId(val);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department (Optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Global)</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Branch */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Physical Branch</Label>
              <Select
                value={branchId}
                onValueChange={(val: string | null) => {
                  if (val) setBranchId(val);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select branch (Optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Headquarters / Remote)</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Max Concurrent Users */}
            <div className="space-y-1.5">
              <Label htmlFor="stn-max-users" className="text-xs font-semibold">
                Max Concurrent Operators
              </Label>
              <Input
                id="stn-max-users"
                type="number"
                min={1}
                max={20}
                value={maxConcurrentUsers}
                onChange={(e) => setMaxConcurrentUsers(Number(e.target.value) || 1)}
              />
              <p className="text-[10px] text-muted-foreground">
                Maximum active logins allowed concurrently on this station.
              </p>
            </div>

            {/* MAC Address */}
            <div className="space-y-1.5">
              <Label htmlFor="stn-mac" className="text-xs font-semibold">
                Hardware MAC Address
              </Label>
              <Input
                id="stn-mac"
                placeholder="e.g. 00:1A:2B:3C:4D:5E"
                value={macAddress}
                onChange={(e) => setMacAddress(e.target.value.toUpperCase())}
                className="font-mono text-xs"
              />
            </div>
          </div>

          {/* IP Whitelist */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Network IP Whitelist (Optional)
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. 192.168.1.100 or 10.0.0.1"
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
                variant="outline"
                size="sm"
                onClick={handleAddIp}
                className="gap-1 shrink-0"
              >
                <Plus className="size-3.5" />
                Add IP
              </Button>
            </div>
            {ipWhitelist.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {ipWhitelist.map((ip) => (
                  <Badge
                    key={ip}
                    variant="secondary"
                    className="font-mono text-xs gap-1 py-0.5 px-2"
                  >
                    {ip}
                    <X
                      className="size-3 cursor-pointer hover:text-destructive"
                      onClick={() => handleRemoveIp(ip)}
                    />
                  </Badge>
                ))}
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

          <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
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
