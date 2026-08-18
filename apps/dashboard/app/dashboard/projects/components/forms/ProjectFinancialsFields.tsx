"use client";

import * as React from "react";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { DollarSign, Percent, FileText, Lock } from "lucide-react";

export interface ProjectFinancialsFieldsProps {
  amount: number | string;
  setAmount: (val: number | string) => void;
  percentage: number | string;
  setPercentage: (val: number | string) => void;
  calculatedNetValue: number;
  orderSheetUrl: string;
  setOrderSheetUrl: (val: string) => void;
  canEditFinancials?: boolean;
  fieldErrors?: Record<string, string>;
}

export function ProjectFinancialsFields({
  amount,
  setAmount,
  percentage,
  setPercentage,
  calculatedNetValue,
  orderSheetUrl,
  setOrderSheetUrl,
  canEditFinancials = true,
  fieldErrors = {},
}: ProjectFinancialsFieldsProps) {
  const grossAmountNum = amount !== "" ? Number(amount) : 0;
  const platformChargePct = percentage !== "" ? Number(percentage) : 0;
  const feeAmount = (grossAmountNum * platformChargePct) / 100;

  return (
    <div className="rounded-xl border bg-card/60 p-4 space-y-3.5 shadow-2xs">
      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <DollarSign className="size-3.5 text-emerald-500" /> Financials & Platform Margin
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Amount ($) */}
        <div className="space-y-1.5 min-w-0">
          <Label htmlFor="amount" className="text-xs font-semibold">
            Amount ($) <span className="text-muted-foreground font-normal">(Gross Project Amount)</span>
          </Label>
          {canEditFinancials ? (
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-semibold">
                $
              </span>
              <Input
                id="amount"
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="pl-7 font-mono text-xs h-9"
              />
            </div>
          ) : (
            <div className="h-9 rounded-md border bg-muted/40 px-3 flex items-center text-xs text-muted-foreground gap-1.5">
              <Lock className="size-3 text-muted-foreground" /> Hidden by Permission Scope
            </div>
          )}
          {fieldErrors.amount && (
            <p className="text-[11px] text-destructive">{fieldErrors.amount}</p>
          )}
        </div>

        {/* Platform Charge (%) */}
        <div className="space-y-1.5 min-w-0">
          <Label htmlFor="percentage" className="text-xs font-semibold flex items-center gap-1">
            <Percent className="size-3 text-muted-foreground" /> Platform Charge (%)
          </Label>
          {canEditFinancials ? (
            <div className="relative">
              <Input
                id="percentage"
                type="number"
                min="0"
                max="100"
                step="any"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                placeholder="e.g. 20"
                className="pr-7 font-mono text-xs h-9"
              />
              <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-semibold">
                %
              </span>
            </div>
          ) : (
            <div className="h-9 rounded-md border bg-muted/40 px-3 flex items-center text-xs text-muted-foreground gap-1.5">
              <Lock className="size-3 text-muted-foreground" /> Hidden
            </div>
          )}
          {fieldErrors.percentage && (
            <p className="text-[11px] text-destructive">{fieldErrors.percentage}</p>
          )}
        </div>
      </div>

      {/* Calculated Net Value Banner */}
      {canEditFinancials && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
              Calculated Value (Net Take-home)
            </span>
            <p className="text-[11px] text-muted-foreground">
              Gross Amount minus Platform Charge (
              {platformChargePct > 0 ? `-${platformChargePct}% = -$${feeAmount.toFixed(2)}` : "0% deduction"}
              )
            </p>
          </div>
          <span className="text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400">
            ${calculatedNetValue.toFixed(2)}
          </span>
        </div>
      )}

      {/* Order Sheet Spec URL */}
      <div className="space-y-1.5 min-w-0">
        <Label htmlFor="orderSheetUrl" className="text-xs font-semibold flex items-center gap-1">
          <FileText className="size-3 text-muted-foreground" /> Order Sheet Spec URL (Optional)
        </Label>
        {canEditFinancials ? (
          <Input
            id="orderSheetUrl"
            type="url"
            value={orderSheetUrl}
            onChange={(e) => setOrderSheetUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="text-xs h-9"
          />
        ) : (
          <div className="h-9 rounded-md border bg-muted/40 px-3 flex items-center text-xs text-muted-foreground gap-1.5">
            <Lock className="size-3 text-muted-foreground" /> Hidden
          </div>
        )}
      </div>
    </div>
  );
}
