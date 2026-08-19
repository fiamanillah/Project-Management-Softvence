"use client";

import * as React from "react";
import { Input } from "@workspace/ui/components/input";
import { Search, X } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

export type ProjectFilterCategory = "all" | "active" | "review" | "critical" | "delivered";

interface ProjectSearchFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: ProjectFilterCategory;
  onCategoryChange: (category: ProjectFilterCategory) => void;
  counts: Record<ProjectFilterCategory, number>;
}

export function ProjectSearchFilter({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  counts,
}: ProjectSearchFilterProps) {
  const categories: { key: ProjectFilterCategory; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "review", label: "In Review" },
    { key: "critical", label: "Urgent" },
    { key: "delivered", label: "Done" },
  ];

  return (
    <div className="space-y-2.5 p-3 pb-2 border-b border-border/50">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground/70" />
        <Input
          placeholder="Search by PRJ Code (e.g. PRJ-1048), client, name..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8.5 pl-8 pr-7 text-xs bg-muted/40 border-border/60 focus-visible:bg-background transition-colors rounded-lg font-mono placeholder:font-sans"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Filter Category Pills */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
        {categories.map(({ key, label }) => {
          const isSelected = selectedCategory === key;
          const count = counts[key] ?? 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onCategoryChange(key)}
              className={cn(
                "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium transition-all cursor-pointer select-none",
                isSelected
                  ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span>{label}</span>
              {count > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1 text-[9px] font-bold leading-none py-0.5",
                    isSelected
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted-foreground/15 text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
