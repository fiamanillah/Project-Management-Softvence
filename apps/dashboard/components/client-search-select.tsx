"use client";

import * as React from "react";
import {
  SearchableSelect,
  type SearchableSelectCriteria,
} from "@workspace/ui/components/searchable-select";
import { Badge } from "@workspace/ui/components/badge";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { api } from "@/lib/api";
import type { ClientItem } from "@workspace/shared";
import {
  Building2,
  Briefcase,
  Mail,
  Globe,
  Layers,
  MapPin,
} from "lucide-react";

export interface ClientSearchSelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string, client: ClientItem | null) => void;
  clients?: ClientItem[];
  platformFilter?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  pageSize?: number;
  className?: string;
  triggerClassName?: string;
  popoverContentClassName?: string;
  id?: string;
  "aria-invalid"?: boolean;
  "data-invalid"?: boolean;
}

const CLIENT_CRITERIA: SearchableSelectCriteria[] = [
  { value: "all", label: "All", icon: Layers },
  { value: "name", label: "Client Name", icon: Building2 },
  { value: "company", label: "Company", icon: Briefcase },
  { value: "email", label: "Email", icon: Mail },
  { value: "country", label: "Country", icon: Globe },
];

export function ClientSearchSelect({
  value,
  defaultValue,
  onValueChange,
  clients: staticClients,
  platformFilter,
  placeholder = "Search and select client...",
  searchPlaceholder = "Search by client name, company, email...",
  disabled = false,
  pageSize = 8,
  className,
  triggerClassName,
  popoverContentClassName,
  id,
  "aria-invalid": ariaInvalid,
  "data-invalid": dataInvalid,
}: ClientSearchSelectProps) {
  // Remote fetcher for large client datasets
  const fetcher = React.useCallback(
    async (params: {
      query: string;
      criteria: string;
      page: number;
      pageSize: number;
      signal?: AbortSignal;
    }) => {
      const { query, criteria, page, pageSize: limit, signal } = params;

      const searchParams = new URLSearchParams();
      searchParams.set("page", String(page));
      searchParams.set("limit", String(limit));

      if (query.trim()) {
        searchParams.set("search", query.trim());
      }

      if (platformFilter) {
        searchParams.set("platformId", platformFilter);
      }

      try {
        const res = await api.get(`/projects/lookups/clients?${searchParams.toString()}`, {
          signal,
        });

        const clientList: ClientItem[] = Array.isArray(res)
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

        const total =
          typeof pagination?.total === "number" ? pagination.total : clientList.length;
        const totalPages =
          typeof pagination?.totalPages === "number"
            ? pagination.totalPages
            : Math.max(1, Math.ceil(total / limit));

        return {
          items: clientList,
          totalPages,
          totalItems: total,
        };
      } catch (err: any) {
        // Graceful fallback to static clients if provided
        if (staticClients && staticClients.length > 0) {
          let filtered = staticClients;
          if (platformFilter) {
            filtered = filtered.filter((c) => c.platformId === platformFilter);
          }
          if (query.trim()) {
            const q = query.toLowerCase().trim();
            if (criteria === "name") {
              filtered = filtered.filter((c) => c.name.toLowerCase().includes(q));
            } else if (criteria === "company") {
              filtered = filtered.filter((c) => c.company?.toLowerCase().includes(q));
            } else if (criteria === "email") {
              filtered = filtered.filter((c) => c.email?.toLowerCase().includes(q));
            } else if (criteria === "country") {
              filtered = filtered.filter((c) => c.country?.toLowerCase().includes(q));
            } else {
              filtered = filtered.filter(
                (c) =>
                  c.name.toLowerCase().includes(q) ||
                  c.company?.toLowerCase().includes(q) ||
                  c.email?.toLowerCase().includes(q) ||
                  c.country?.toLowerCase().includes(q)
              );
            }
          }

          const total = filtered.length;
          const totalPages = Math.max(1, Math.ceil(total / limit));
          const start = (page - 1) * limit;
          const pageItems = filtered.slice(start, start + limit);

          return {
            items: pageItems,
            totalPages,
            totalItems: total,
          };
        }

        throw err;
      }
    },
    [platformFilter, staticClients]
  );

  return (
    <SearchableSelect<ClientItem>
      id={id}
      value={value}
      defaultValue={defaultValue}
      onValueChange={(val, item) => {
        onValueChange?.(val, item);
      }}
      fetcher={fetcher}
      pageSize={pageSize}
      criteriaOptions={CLIENT_CRITERIA}
      defaultCriteria="all"
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyText="No clients found"
      loadingText="Searching client database..."
      disabled={disabled}
      clearable={true}
      className={className}
      triggerClassName={triggerClassName}
      popoverContentClassName={popoverContentClassName}
      aria-invalid={ariaInvalid}
      data-invalid={dataInvalid}
      getItemId={(c) => c.id}
      getItemLabel={(c) => c.name}
      getItemDescription={(c) => {
        const parts: string[] = [];
        if (c.company) parts.push(c.company);
        if (c.email) parts.push(c.email);
        if (c.country) parts.push(c.country);
        return parts.join(" • ");
      }}
      getItemAvatar={(c) => {
        const initial = c.name ? c.name.trim().charAt(0).toUpperCase() : "C";
        return {
          fallback: initial,
        };
      }}
      getItemBadge={(c) => {
        if (c.platform?.name) {
          return {
            text: c.platform.name,
            variant: "outline",
          };
        }
        return null;
      }}
      renderItem={(c, isSelected) => {
        const initial = c.name ? c.name.trim().charAt(0).toUpperCase() : "C";
        return (
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Avatar size="sm" className="size-7 shrink-0 rounded-lg">
              <AvatarFallback className="text-[11px] font-bold bg-primary/10 text-primary rounded-lg">
                {initial}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold truncate text-foreground">
                  {c.name}
                </span>
                {c.company && (
                  <span className="text-[10px] text-muted-foreground font-normal truncate">
                    ({c.company})
                  </span>
                )}
                {c.platform?.name && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-normal ml-auto">
                    {c.platform.name}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 text-[11px] text-muted-foreground truncate pt-0.5">
                {c.email && (
                  <span className="truncate flex items-center gap-1">
                    <Mail className="size-2.5 shrink-0 text-muted-foreground" />
                    {c.email}
                  </span>
                )}
                {c.country && (
                  <span className="truncate flex items-center gap-1">
                    <MapPin className="size-2.5 shrink-0 text-muted-foreground" />
                    {c.country}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      }}
    />
  );
}
