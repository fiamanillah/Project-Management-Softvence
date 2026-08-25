"use client";

import * as React from "react";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { ClientSearchSelect } from "@/components/client-search-select";
import type { ProjectLookups, ProfileItem, ClientItem } from "@workspace/shared";
import { Building2, Plus, Lock } from "lucide-react";

export interface ProjectAccountClientFieldsProps {
  platformId?: string;
  onPlatformChange?: (platformId: string | null) => void;
  profileId: string;
  onProfileChange: (profileId: string | null) => void;
  clientId: string;
  onClientChange: (clientId: string, clientItem?: ClientItem | null) => void;
  lookups: ProjectLookups | null;
  filteredProfiles?: ProfileItem[];
  canViewClient?: boolean;
  fieldErrors: Record<string, string>;
  showPlatformSelect?: boolean;
  onNewPlatformClick?: () => void;
  onNewProfileClick?: () => void;
  onNewClientClick?: () => void;
}

export function ProjectAccountClientFields({
  platformId,
  onPlatformChange,
  profileId,
  onProfileChange,
  clientId,
  onClientChange,
  lookups,
  filteredProfiles,
  canViewClient = true,
  fieldErrors,
  showPlatformSelect = true,
  onNewPlatformClick,
  onNewProfileClick,
  onNewClientClick,
}: ProjectAccountClientFieldsProps) {
  const profilesToRender = filteredProfiles || lookups?.profiles || [];

  return (
    <div className="rounded-xl border bg-card/60 p-4 space-y-3.5 shadow-2xs">
      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Building2 className="size-3.5 text-blue-500" /> Platform Account & Client
      </h4>

      <div
        className={`grid grid-cols-1 ${
          showPlatformSelect ? "sm:grid-cols-3" : "sm:grid-cols-2"
        } gap-3.5`}
      >
        {/* Platform (if applicable) */}
        {showPlatformSelect && onPlatformChange && (
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Platform</Label>
              {onNewPlatformClick && (
                <button
                  type="button"
                  onClick={onNewPlatformClick}
                  className="text-[11px] text-primary hover:underline flex items-center gap-0.5 font-medium"
                >
                  <Plus className="size-3" /> New
                </button>
              )}
            </div>
            <Select value={platformId} onValueChange={onPlatformChange}>
              <SelectTrigger className="w-full h-9 text-xs overflow-hidden">
                <SelectValue placeholder="Platform">
                  {lookups?.platforms.find((p) => p.id === platformId)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {lookups?.platforms.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Profile */}
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">
              Profile <span className="text-destructive">*</span>
            </Label>
            {onNewProfileClick && (
              <button
                type="button"
                onClick={onNewProfileClick}
                className="text-[11px] text-primary hover:underline flex items-center gap-0.5 font-medium"
              >
                <Plus className="size-3" /> New
              </button>
            )}
          </div>
          <Select value={profileId} onValueChange={onProfileChange}>
            <SelectTrigger className="w-full h-9 text-xs overflow-hidden">
              <SelectValue placeholder="Select Profile">
                {(() => {
                  const prof =
                    profilesToRender.find((p) => p.id === profileId) ||
                    lookups?.profiles.find((p) => p.id === profileId);
                  if (!prof) return undefined;
                  return prof.platform?.name
                    ? `${prof.username} (${prof.platform.name})`
                    : prof.username;
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {profilesToRender.map((prof) => (
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
            {canViewClient && onNewClientClick && (
              <button
                type="button"
                onClick={onNewClientClick}
                className="text-[11px] text-primary hover:underline flex items-center gap-0.5 font-medium"
              >
                <Plus className="size-3" /> New
              </button>
            )}
          </div>
          {canViewClient ? (
            <ClientSearchSelect
              value={clientId}
              onValueChange={onClientChange}
              clients={lookups?.clients}
              placeholder="Search & select client..."
              className="w-full"
            />
          ) : (
            <div className="h-9 rounded-md border bg-muted/40 px-3 flex items-center text-xs text-muted-foreground gap-1.5">
              <Lock className="size-3 text-muted-foreground" /> Client Masked
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
