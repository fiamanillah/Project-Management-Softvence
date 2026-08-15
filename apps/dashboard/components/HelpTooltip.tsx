"use client";

import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { HelpCircle } from "lucide-react";

interface HelpTooltipProps {
  text: string;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
}

export function HelpTooltip({ text, className, side = "top" }: HelpTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        tabIndex={-1}
        className={`inline-flex items-center text-muted-foreground/70 hover:text-foreground transition-colors cursor-help shrink-0 ${
          className || ""
        }`}
        onClick={(e) => e.preventDefault()}
      >
        <HelpCircle className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs text-xs leading-relaxed text-balance z-50">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
