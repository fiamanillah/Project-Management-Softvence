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
    <div className="space-y-2.5 px-3 py-2.5 border-b border-border/40 bg-card/40 backdrop-blur-xs">
      {/* Search Bar */}
      <div className="relative flex items-center">
        <Search className="absolute left-2.5 size-3.5 text-muted-foreground/60 pointer-events-none" />
        <Input
          placeholder="Search project, code, or client..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 pl-8 pr-7 text-xs bg-muted/40 hover:bg-muted/60 focus:bg-background border-border/50 focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all rounded-lg placeholder:text-muted-foreground/60"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-2 text-muted-foreground hover:text-foreground p-0.5 rounded-sm hover:bg-muted/80 cursor-pointer transition-colors"
            title="Clear search"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Filter Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
        {categories.map(({ key, label }) => {
          const isSelected = selectedCategory === key;
          const count = counts[key] ?? 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onCategoryChange(key)}
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-150 cursor-pointer select-none border",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary font-semibold shadow-2xs"
                  : "bg-muted/40 hover:bg-muted/70 text-muted-foreground hover:text-foreground border-border/40 hover:border-border/60"
              )}
            >
              <span>{label}</span>
              {count > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[9.5px] font-bold leading-none tracking-tight",
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
