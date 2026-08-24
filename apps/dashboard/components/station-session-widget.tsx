"use client";

import * as React from "react";
import { useStationSession } from "@/lib/station/StationContext";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Radio,
  Briefcase,
  LogOut,
  ArrowRightLeft,
  ChevronDown,
  LayoutDashboard,
} from "lucide-react";
import { SelectStationModal } from "@/app/dashboard/stations/components/SelectStationModal";
import { useRouter } from "next/navigation";

export function StationSessionWidget() {
  const router = useRouter();
  const {
    activeContext,
    leaveStation,
    selectModalOpen,
    setSelectModalOpen,
  } = useStationSession();

  const activeStation = activeContext?.station;
  const activeProfiles = activeContext?.activeProfiles || [];

  return (
    <>
      {activeStation ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-2 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-xs font-medium px-2.5 transition-all"
              />
            }
          >
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
            </span>
            <span className="font-semibold text-foreground truncate max-w-[120px] sm:max-w-[160px]">
              {activeStation.name}
            </span>
            <Badge
              variant="secondary"
              className="h-4 px-1 text-[10px] font-mono bg-background/80"
            >
              {activeProfiles.length} Profiles
            </Badge>
            <ChevronDown className="size-3 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 p-1.5 shadow-xl">
            <DropdownMenuLabel className="p-2 pb-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  Active Workstation
                </span>
                <Badge variant="outline" className="text-[10px] font-mono py-0">
                  {activeStation.code}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground font-normal mt-0.5 truncate">
                {activeStation.name}
              </p>
            </DropdownMenuLabel>

            {activeProfiles.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <div className="p-2 space-y-1 max-h-36 overflow-y-auto">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                    Connected Profiles ({activeProfiles.length})
                  </span>
                  {activeProfiles.map((ap) => (
                    <div
                      key={ap.id}
                      className="flex items-center justify-between text-xs py-1 px-1.5 rounded bg-muted/40"
                    >
                      <span className="font-medium truncate text-foreground">
                        {ap.profile?.username || "Unnamed Profile"}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {ap.profile?.platform?.name || "Platform"}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setSelectModalOpen(true)}
              className="text-xs gap-2 cursor-pointer"
            >
              <ArrowRightLeft className="size-3.5 text-primary" />
              <span>Switch Workstation</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => router.push("/dashboard/stations")}
              className="text-xs gap-2 cursor-pointer"
            >
              <LayoutDashboard className="size-3.5" />
              <span>Manage Workstations</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => leaveStation()}
              className="text-xs gap-2 text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="size-3.5" />
              <span>End Shift / Disconnect</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectModalOpen(true)}
          className="h-8 gap-1.5 text-xs border-dashed text-muted-foreground hover:text-primary hover:border-primary/40 px-2.5 transition-all"
        >
          <Radio className="size-3.5 text-primary/70" />
          <span className="hidden sm:inline">Select Station</span>
        </Button>
      )}

      <SelectStationModal
        open={selectModalOpen}
        onOpenChange={setSelectModalOpen}
      />
    </>
  );
}
