"use client";

import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { HelpCircle } from "lucide-react";

interface HelpTooltipProps {
  text: string;
  className?: string;
}

export function HelpTooltip({ text, className }: HelpTooltipProps) {
  return (
    <TooltipProvider delay={100}>
      <Tooltip>
        <TooltipTrigger
          type="button"
          tabIndex={-1}
          className={`inline-flex items-center text-muted-foreground/70 hover:text-foreground transition-colors cursor-help ${
            className || ""
          }`}
          onClick={(e) => e.preventDefault()}
        >
          <HelpCircle className="size-3.5" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs text-balance">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
