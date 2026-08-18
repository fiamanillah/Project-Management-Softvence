"use client";

import * as React from "react";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Calendar } from "lucide-react";

export interface ProjectScheduleFieldsProps {
  startDate: string;
  setStartDate: (val: string) => void;
  deliveryDate: string;
  setDeliveryDate: (val: string) => void;
  fieldErrors?: Record<string, string>;
}

export function ProjectScheduleFields({
  startDate,
  setStartDate,
  deliveryDate,
  setDeliveryDate,
  fieldErrors = {},
}: ProjectScheduleFieldsProps) {
  return (
    <div className="rounded-xl border bg-card/60 p-4 space-y-3.5 shadow-2xs">
      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Calendar className="size-3.5 text-purple-500" /> Schedule & Delivery Dates
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Start Date */}
        <div className="space-y-1.5 min-w-0">
          <Label htmlFor="startDate" className="text-xs font-semibold">
            Order / Start Date
          </Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="text-xs h-9"
          />
        </div>

        {/* Promised Delivery Date */}
        <div className="space-y-1.5 min-w-0">
          <Label htmlFor="deliveryDate" className="text-xs font-semibold">
            Promised Delivery Date
          </Label>
          <Input
            id="deliveryDate"
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            className="text-xs h-9"
          />
          {fieldErrors.deliveryDate && (
            <p className="text-[11px] text-destructive">{fieldErrors.deliveryDate}</p>
          )}
        </div>
      </div>
    </div>
  );
}
