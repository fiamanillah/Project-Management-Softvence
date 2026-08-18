"use client";

import * as React from "react";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import type { ProjectLookups } from "@workspace/shared";
import { Briefcase, Link, Plus, GitFork } from "lucide-react";

export interface ProjectClassificationFieldsProps {
  orderId: string;
  setOrderId: (val: string) => void;
  orderLink: string;
  setOrderLink: (val: string) => void;
  service: string;
  setService: (val: string) => void;
  parentId: string;
  setParentId: (val: string) => void;
  statusId: string;
  setStatusId: (val: string) => void;
  orderSourceId: string;
  setOrderSourceId: (val: string) => void;
  serviceLineId: string;
  setServiceLineId: (val: string) => void;
  lookups: ProjectLookups | null;
  fieldErrors: Record<string, string>;
  onNewStatusClick: () => void;
  onNewOrderSourceClick: () => void;
  onNewServiceLineClick: () => void;
}

export function ProjectClassificationFields({
  orderId,
  setOrderId,
  orderLink,
  setOrderLink,
  service,
  setService,
  parentId,
  setParentId,
  statusId,
  setStatusId,
  orderSourceId,
  setOrderSourceId,
  serviceLineId,
  setServiceLineId,
  lookups,
  fieldErrors,
  onNewStatusClick,
  onNewOrderSourceClick,
  onNewServiceLineClick,
}: ProjectClassificationFieldsProps) {
  return (
    <div className="rounded-xl border bg-card/60 p-4 space-y-3.5 shadow-2xs">
      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Briefcase className="size-3.5 text-primary" /> Order Specification & Classification
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Order ID */}
        <div className="space-y-1.5 min-w-0">
          <Label htmlFor="orderId" className="text-xs font-semibold">
            Order ID <span className="text-destructive">*</span>
          </Label>
          <Input
            id="orderId"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="e.g. FO919AA7A39B2"
            required
            className="font-mono text-xs h-9"
          />
          {fieldErrors.orderId && (
            <p className="text-[11px] text-destructive">{fieldErrors.orderId}</p>
          )}
        </div>

        {/* Order Link */}
        <div className="space-y-1.5 min-w-0">
          <Label htmlFor="orderLink" className="text-xs font-semibold flex items-center gap-1">
            <Link className="size-3 text-muted-foreground" /> Order Link (Optional)
          </Label>
          <Input
            id="orderLink"
            type="url"
            value={orderLink}
            onChange={(e) => setOrderLink(e.target.value)}
            placeholder="https://www.fiverr.com/orders/..."
            className="text-xs h-9"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Service / Deliverable */}
        <div className="space-y-1.5 min-w-0">
          <Label htmlFor="service" className="text-xs font-semibold">
            Service / Title
          </Label>
          <Input
            id="service"
            value={service}
            onChange={(e) => setService(e.target.value)}
            placeholder="e.g. UI/UX Design System"
            className="text-xs h-9"
          />
        </div>

        {/* Parent / Umbrella Project */}
        <div className="space-y-1.5 min-w-0">
          <Label className="text-xs font-semibold flex items-center gap-1">
            <GitFork className="size-3 text-muted-foreground" /> Parent / Umbrella Project
          </Label>
          <Select value={parentId || "none"} onValueChange={(val: string | null) => setParentId(val || "none")}>
            <SelectTrigger className="w-full h-9 text-xs overflow-hidden">
              <SelectValue placeholder="Standalone (No Parent)">
                {(() => {
                  if (!parentId || parentId === "none") return "Standalone (No Parent)";
                  const matched = lookups?.parentCandidates?.find((p) => p.id === parentId);
                  return matched ? `${matched.projectName} (${matched.orderId})` : "Standalone (No Parent)";
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-xs">
                Standalone Project (No Parent)
              </SelectItem>
              {lookups?.parentCandidates?.map((cand) => (
                <SelectItem key={cand.id} value={cand.id} className="text-xs font-mono">
                  {cand.projectName} — Order: {cand.orderId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
        {/* Status */}
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">
              Status <span className="text-destructive">*</span>
            </Label>
            <button
              type="button"
              onClick={onNewStatusClick}
              className="text-[11px] text-primary hover:underline flex items-center gap-0.5 font-medium"
            >
              <Plus className="size-3" /> New Status
            </button>
          </div>
          <Select value={statusId} onValueChange={(val: string | null) => setStatusId(val || "")}>
            <SelectTrigger className="w-full h-9 text-xs overflow-hidden">
              <SelectValue placeholder="Select Status">
                {(() => {
                  const st = lookups?.statuses.find((s) => s.id === statusId);
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
              {lookups?.statuses.map((st) => (
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

        {/* Order Source */}
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">Order Source</Label>
            <button
              type="button"
              onClick={onNewOrderSourceClick}
              className="text-[11px] text-primary hover:underline flex items-center gap-0.5 font-medium"
            >
              <Plus className="size-3" /> New Source
            </button>
          </div>
          <Select value={orderSourceId} onValueChange={(val: string | null) => setOrderSourceId(val || "")}>
            <SelectTrigger className="w-full h-9 text-xs overflow-hidden">
              <SelectValue placeholder="Select Order Source">
                {lookups?.orderSources?.find((os) => os.id === orderSourceId)?.name || "Select Source"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {lookups?.orderSources?.map((os) => (
                <SelectItem key={os.id} value={os.id} className="text-xs">
                  {os.name}
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
              onClick={onNewServiceLineClick}
              className="text-[11px] text-primary hover:underline flex items-center gap-0.5 font-medium"
            >
              <Plus className="size-3" /> New Service
            </button>
          </div>
          <Select value={serviceLineId} onValueChange={(val: string | null) => setServiceLineId(val || "")}>
            <SelectTrigger className="w-full h-9 text-xs overflow-hidden">
              <SelectValue placeholder="Select Service Line">
                {lookups?.serviceLines.find((sl) => sl.id === serviceLineId)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {lookups?.serviceLines.map((sl) => (
                <SelectItem key={sl.id} value={sl.id} className="text-xs">
                  {sl.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
