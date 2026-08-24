"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Badge } from "@workspace/ui/components/badge";
import { Switch } from "@workspace/ui/components/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import { api, handleFormApiError } from "@/lib/api";
import { toast } from "sonner";
import {
  Settings,
  Plus,
  Edit2,
  Loader2,
  CheckCircle2,
  XCircle,
  Tag,
  Shield,
  Layers,
} from "lucide-react";
import type {
  StationTypeItem,
  StationStatusItem,
  StationRoleItem,
} from "@workspace/shared";

interface StationLookupsManagerProps {
  stationTypes: StationTypeItem[];
  stationStatuses: StationStatusItem[];
  stationRoles: StationRoleItem[];
  onRefreshLookups: () => void;
}

export function StationLookupsManager({
  stationTypes,
  stationStatuses,
  stationRoles,
  onRefreshLookups,
}: StationLookupsManagerProps) {
  const [activeTab, setActiveTab] = React.useState("types");

  // Modal State
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalMode, setModalMode] = React.useState<"create" | "edit">("create");
  const [submitting, setSubmitting] = React.useState(false);

  // Editing items
  const [editingId, setEditingId] = React.useState<string | null>(null);

  // Common Form Fields
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState(0);
  const [isActive, setIsActive] = React.useState(true);

  // Type-specific
  const [isSales, setIsSales] = React.useState(true);

  // Status-specific
  const [isOperational, setIsOperational] = React.useState(true);
  const [isMaintenance, setIsMaintenance] = React.useState(false);
  const [color, setColor] = React.useState("#10b981");

  // Role-specific
  const [canManageProfiles, setCanManageProfiles] = React.useState(false);
  const [canOperate, setCanOperate] = React.useState(true);

  const openCreateModal = () => {
    setModalMode("create");
    setEditingId(null);
    setCode("");
    setName("");
    setDescription("");
    setSortOrder(0);
    setIsActive(true);
    setIsSales(true);
    setIsOperational(true);
    setIsMaintenance(false);
    setColor("#10b981");
    setCanManageProfiles(false);
    setCanOperate(true);
    setModalOpen(true);
  };

  const openEditModal = (item: any, type: "type" | "status" | "role") => {
    setModalMode("edit");
    setEditingId(item.id);
    setCode(item.code || "");
    setName(item.name || "");
    setDescription(item.description || "");
    setSortOrder(item.sortOrder || 0);
    setIsActive(item.isActive ?? true);

    if (type === "type") {
      setIsSales(item.isSales ?? true);
    } else if (type === "status") {
      setIsOperational(item.isOperational ?? true);
      setIsMaintenance(item.isMaintenance ?? false);
      setColor(item.color || "#10b981");
    } else if (type === "role") {
      setCanManageProfiles(item.canManageProfiles ?? false);
      setCanOperate(item.canOperate ?? true);
    }

    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (modalMode === "create" && !code.trim()) {
      toast.error("Code is required");
      return;
    }

    setSubmitting(true);
    try {
      if (activeTab === "types") {
        if (modalMode === "create") {
          await api.post("/stations/lookups/types", {
            code: code.trim().toUpperCase(),
            name: name.trim(),
            description: description.trim() || undefined,
            isSales,
            sortOrder: Number(sortOrder) || 0,
            isActive,
          });
        } else {
          await api.patch(`/stations/lookups/types/${editingId}`, {
            name: name.trim(),
            description: description.trim() || undefined,
            isSales,
            sortOrder: Number(sortOrder) || 0,
            isActive,
          });
        }
      } else if (activeTab === "statuses") {
        if (modalMode === "create") {
          await api.post("/stations/lookups/statuses", {
            code: code.trim().toUpperCase(),
            name: name.trim(),
            isOperational,
            isMaintenance,
            color,
            sortOrder: Number(sortOrder) || 0,
            isActive,
          });
        } else {
          await api.patch(`/stations/lookups/statuses/${editingId}`, {
            name: name.trim(),
            isOperational,
            isMaintenance,
            color,
            sortOrder: Number(sortOrder) || 0,
            isActive,
          });
        }
      } else if (activeTab === "roles") {
        if (modalMode === "create") {
          await api.post("/stations/lookups/roles", {
            code: code.trim().toUpperCase(),
            name: name.trim(),
            canManageProfiles,
            canOperate,
            isActive,
          });
        } else {
          await api.patch(`/stations/lookups/roles/${editingId}`, {
            name: name.trim(),
            canManageProfiles,
            canOperate,
            isActive,
          });
        }
      }

      toast.success("Lookup configuration updated successfully.");
      setModalOpen(false);
      onRefreshLookups();
    } catch (err: any) {
      const msg = handleFormApiError(err);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2">
            <Settings className="size-4 text-primary" />
            Dynamic Lookup Tables
          </h3>
          <p className="text-xs text-muted-foreground">
            Manage dynamic workstation types, operational statuses, and operator roles with behavioral flags (Rule BE-11 / FE-12).
          </p>
        </div>

        <Button onClick={openCreateModal} size="sm" className="gap-1.5 text-xs">
          <Plus className="size-3.5" />
          Add Configuration
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 w-full sm:w-[480px]">
          <TabsTrigger value="types" className="text-xs gap-1.5">
            <Layers className="size-3.5" />
            Station Types ({stationTypes.length})
          </TabsTrigger>
          <TabsTrigger value="statuses" className="text-xs gap-1.5">
            <Tag className="size-3.5" />
            Statuses ({stationStatuses.length})
          </TabsTrigger>
          <TabsTrigger value="roles" className="text-xs gap-1.5">
            <Shield className="size-3.5" />
            Operator Roles ({stationRoles.length})
          </TabsTrigger>
        </TabsList>

        {/* 1. STATION TYPES */}
        <TabsContent value="types" className="pt-4">
          <div className="border rounded-xl bg-card overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>Type Name & Code</TableHead>
                  <TableHead>Behavioral Flag</TableHead>
                  <TableHead>Sort Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stationTypes.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{t.name}</span>
                          <Badge variant="outline" className="font-mono text-[10px] py-0">
                            {t.code}
                          </Badge>
                        </div>
                        {t.description && (
                          <p className="text-xs text-muted-foreground">{t.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {t.isSales ? (
                        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                          Sales Desk Mode
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          General
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{t.sortOrder}</TableCell>
                    <TableCell>
                      {t.isActive ? (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 text-[10px]">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground text-[10px]">
                          Disabled
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => openEditModal(t, "type")}
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* 2. STATION STATUSES */}
        <TabsContent value="statuses" className="pt-4">
          <div className="border rounded-xl bg-card overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>Status Name & Code</TableHead>
                  <TableHead>Operational Flags</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stationStatuses.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: s.color || "#10b981" }}
                        />
                        <span className="font-semibold text-sm">{s.name}</span>
                        <Badge variant="outline" className="font-mono text-[10px] py-0">
                          {s.code}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {s.isOperational ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                            isOperational
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-destructive border-destructive/30 text-[10px]">
                            Offline
                          </Badge>
                        )}
                        {s.isMaintenance && (
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                            isMaintenance
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <span
                          className="size-3 rounded border"
                          style={{ backgroundColor: s.color || "#10b981" }}
                        />
                        {s.color || "Default"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {s.isActive ? (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 text-[10px]">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground text-[10px]">
                          Disabled
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => openEditModal(s, "status")}
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* 3. OPERATOR ROLES */}
        <TabsContent value="roles" className="pt-4">
          <div className="border rounded-xl bg-card overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>Role Name & Code</TableHead>
                  <TableHead>Permissions Flags</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stationRoles.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{r.name}</span>
                        <Badge variant="outline" className="font-mono text-[10px] py-0">
                          {r.code}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {r.canOperate && (
                          <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-[10px]">
                            canOperate
                          </Badge>
                        )}
                        {r.canManageProfiles && (
                          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]">
                            canManageProfiles
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {r.isActive ? (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 text-[10px]">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground text-[10px]">
                          Disabled
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => openEditModal(r, "role")}
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Parameterized CRUD Modal (Rule FE-12) */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="w-full max-w-md p-0 gap-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-5 pb-3 border-b bg-muted/20">
            <DialogTitle className="text-base font-bold">
              {modalMode === "create" ? "Add New" : "Edit"}{" "}
              {activeTab === "types"
                ? "Station Type"
                : activeTab === "statuses"
                ? "Station Status"
                : "Operator Role"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Display Name"
                className="text-xs"
              />
            </div>

            {modalMode === "create" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Code *</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SALES_PRIMARY"
                  className="font-mono text-xs uppercase"
                />
              </div>
            )}

            {/* Type Specific Fields */}
            {activeTab === "types" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Description</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold">isSales Flag</Label>
                    <p className="text-[10px] text-muted-foreground">
                      Treat as active sales & outreach workstation
                    </p>
                  </div>
                  <Switch checked={isSales} onCheckedChange={setIsSales} />
                </div>
              </>
            )}

            {/* Status Specific Fields */}
            {activeTab === "statuses" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                    <Label className="text-xs font-semibold">isOperational</Label>
                    <Switch checked={isOperational} onCheckedChange={setIsOperational} />
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                    <Label className="text-xs font-semibold">isMaintenance</Label>
                    <Switch checked={isMaintenance} onCheckedChange={setIsMaintenance} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Color Hex</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="size-8 p-1 cursor-pointer"
                    />
                    <Input
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="font-mono text-xs flex-1"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Role Specific Fields */}
            {activeTab === "roles" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold">canOperate</Label>
                    <p className="text-[10px] text-muted-foreground">
                      Permit operator shift logins
                    </p>
                  </div>
                  <Switch checked={canOperate} onCheckedChange={setCanOperate} />
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold">canManageProfiles</Label>
                    <p className="text-[10px] text-muted-foreground">
                      Permit profile reassignment actions
                    </p>
                  </div>
                  <Switch checked={canManageProfiles} onCheckedChange={setCanManageProfiles} />
                </div>
              </div>
            )}

            {/* Active Toggle */}
            <div className="flex items-center justify-between pt-2 border-t">
              <Label className="text-xs font-semibold">Active Record</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <DialogFooter className="pt-3 border-t gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="gap-1.5">
                {submitting && <Loader2 className="size-3.5 animate-spin" />}
                {modalMode === "create" ? "Create Record" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
