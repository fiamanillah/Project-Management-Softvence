"use client";

import * as React from "react";
import {
  SearchableSelect,
  type SearchableSelectCriteria,
} from "@workspace/ui/components/searchable-select";
import { Badge } from "@workspace/ui/components/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { api } from "@/lib/api";
import {
  UsersRound,
  Building2,
  Layers,
  Clock,
} from "lucide-react";

export interface TeamItem {
  id: string;
  name: string;
  slug?: string;
  shift?: string | null;
  avatarUrl?: string | null;
  departmentId?: string | null;
  department?: {
    id: string;
    name: string;
    code?: string;
  };
  membersCount?: number;
  _count?: {
    members?: number;
  };
}

export interface TeamSearchSelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (teamId: string, team: TeamItem | null) => void;
  teams?: TeamItem[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  excludeTeamIds?: string[];
  departmentId?: string;
  pageSize?: number;
  className?: string;
  triggerClassName?: string;
  popoverContentClassName?: string;
  id?: string;
  "aria-invalid"?: boolean;
  "data-invalid"?: boolean;
}

const TEAM_CRITERIA: SearchableSelectCriteria[] = [
  { value: "all", label: "All", icon: Layers },
  { value: "name", label: "Team Name", icon: UsersRound },
  { value: "department", label: "Department", icon: Building2 },
];

export function TeamSearchSelect({
  value,
  defaultValue,
  onValueChange,
  teams: staticTeams,
  placeholder = "Search and select a team...",
  searchPlaceholder = "Search teams by name or department...",
  disabled = false,
  excludeTeamIds = [],
  departmentId,
  pageSize = 8,
  className,
  triggerClassName,
  popoverContentClassName,
  id,
  "aria-invalid": ariaInvalid,
  "data-invalid": dataInvalid,
}: TeamSearchSelectProps) {
  const fetcher = React.useCallback(
    async (params: {
      query: string;
      criteria: string;
      page: number;
      pageSize: number;
      signal?: AbortSignal;
    }) => {
      const { query, criteria, page, pageSize: limit, signal } = params;

      // If static list provided, filter in memory
      if (staticTeams && staticTeams.length > 0) {
        let filtered = staticTeams;
        if (departmentId) {
          filtered = filtered.filter((t) => t.departmentId === departmentId);
        }

        if (query.trim()) {
          const q = query.toLowerCase().trim();
          if (criteria === "name") {
            filtered = filtered.filter((t) => t.name.toLowerCase().includes(q));
          } else if (criteria === "department") {
            filtered = filtered.filter((t) => t.department?.name?.toLowerCase().includes(q));
          } else {
            filtered = filtered.filter(
              (t) =>
                t.name.toLowerCase().includes(q) ||
                t.department?.name?.toLowerCase().includes(q) ||
                t.shift?.toLowerCase().includes(q),
            );
          }
        }

        const start = (page - 1) * limit;
        const paged = filtered.slice(start, start + limit);
        return {
          items: paged,
          totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
          totalItems: filtered.length,
        };
      }

      // Otherwise fetch remotely from API
      const searchParams = new URLSearchParams();
      searchParams.set("page", String(page));
      searchParams.set("limit", String(limit));

      if (query.trim()) {
        searchParams.set("search", query.trim());
      }

      if (departmentId) {
        searchParams.set("departmentId", departmentId);
      }

      const res = await api.get(`/teams?${searchParams.toString()}`, { signal });

      const teamList: TeamItem[] = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.items)
        ? res.items
        : [];

      const pagination =
        (res as any)?.pagination ||
        (res as any)?.meta?.pagination ||
        res?.meta ||
        (res as any)?.data?.meta;

      const total = typeof pagination?.total === "number" ? pagination.total : teamList.length;
      const totalPages =
        typeof pagination?.totalPages === "number"
          ? pagination.totalPages
          : Math.max(1, Math.ceil(total / limit));

      let filtered = teamList;
      if (query.trim()) {
        const q = query.toLowerCase().trim();
        if (criteria === "name") {
          filtered = teamList.filter((t) => t.name.toLowerCase().includes(q));
        } else if (criteria === "department") {
          filtered = teamList.filter((t) => t.department?.name?.toLowerCase().includes(q));
        }
      }

      return {
        items: filtered,
        totalPages,
        totalItems: total,
      };
    },
    [staticTeams, departmentId],
  );

  return (
    <SearchableSelect<TeamItem>
      id={id}
      value={value}
      defaultValue={defaultValue}
      onValueChange={(val, item) => {
        onValueChange?.(val, item);
      }}
      fetcher={fetcher}
      pageSize={pageSize}
      criteriaOptions={TEAM_CRITERIA}
      defaultCriteria="all"
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyText="No teams found"
      loadingText="Searching teams..."
      disabled={disabled}
      clearable={true}
      className={className}
      triggerClassName={triggerClassName}
      popoverContentClassName={popoverContentClassName}
      aria-invalid={ariaInvalid}
      data-invalid={dataInvalid}
      getItemId={(t) => t.id}
      getItemLabel={(t) => t.name}
      getItemDescription={(t) => (
        <span className="flex items-center gap-2 text-muted-foreground text-[11px] truncate">
          <span>{t.department?.name || "General Department"}</span>
          {t.shift && <span className="font-mono opacity-70">({t.shift})</span>}
        </span>
      )}
      getItemAvatar={() => ({
        icon: <UsersRound className="size-3.5 text-primary" />,
      })}
      getItemBadge={(t) => {
        if (t.department?.name) {
          return {
            text: t.department.name,
            variant: "outline",
          };
        }
        return null;
      }}
      getItemDisabled={(t) => excludeTeamIds.includes(t.id)}
      renderTriggerValue={(t) => {
        if (!t) return null;
        const initials = t.name.slice(0, 2).toUpperCase();

        return (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Avatar className="size-5 shrink-0">
              {t.avatarUrl && <AvatarImage src={t.avatarUrl} alt={t.name} />}
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-[9px]">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="font-semibold truncate text-foreground text-xs">{t.name}</span>
            {t.department?.name && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 hidden sm:inline-flex text-muted-foreground">
                {t.department.name}
              </Badge>
            )}
            {t.shift && (
              <span className="text-[10px] text-muted-foreground hidden md:inline font-mono">
                ({t.shift})
              </span>
            )}
          </div>
        );
      }}
      renderItem={(t) => {
        const isExcluded = excludeTeamIds.includes(t.id);
        const count = t.membersCount ?? t._count?.members;
        const initials = t.name.slice(0, 2).toUpperCase();

        return (
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Avatar className="size-7 rounded-lg shrink-0">
              {t.avatarUrl && <AvatarImage src={t.avatarUrl} alt={t.name} className="rounded-lg object-cover" />}
              <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold text-[10px]">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold truncate text-foreground">
                  {t.name}
                </span>
                {t.department?.name && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-3.5 font-normal text-muted-foreground">
                    {t.department.name}
                  </Badge>
                )}
                {isExcluded && (
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-3.5 bg-primary/10 text-primary">
                    Allocated
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 text-[11px] text-muted-foreground truncate">
                {t.shift && (
                  <span className="flex items-center gap-0.5 opacity-80">
                    <Clock className="size-2.5" /> {t.shift}
                  </span>
                )}
                {typeof count === "number" && (
                  <span className="opacity-75">· {count} member{count !== 1 ? "s" : ""}</span>
                )}
              </div>
            </div>
          </div>
        );
      }}
    />
  );
}
