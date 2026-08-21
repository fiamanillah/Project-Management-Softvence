"use client";

import * as React from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

interface FormattedMessageTextProps {
  text: string;
  isCurrentUser?: boolean;
  className?: string;
}

const URL_REGEX = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s]|www\.[^\s<]+[^<.,:;"')\]\s])/gi;

export function FormattedMessageText({
  text,
  isCurrentUser = false,
  className = "",
}: FormattedMessageTextProps) {
  if (!text) return null;

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Reset regex index
  URL_REGEX.lastIndex = 0;

  while ((match = URL_REGEX.exec(text)) !== null) {
    const matchIndex = match.index;
    const matchedUrl = match[0];

    // Push preceding text if any
    if (matchIndex > lastIndex) {
      elements.push(text.slice(lastIndex, matchIndex));
    }

    const href = matchedUrl.startsWith("http://") || matchedUrl.startsWith("https://")
      ? matchedUrl
      : `https://${matchedUrl}`;

    elements.push(
      <a
        key={`link-${matchIndex}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "inline-flex items-baseline gap-0.5 font-medium underline underline-offset-3 transition-all break-all cursor-pointer group/link",
          isCurrentUser
            ? "text-primary-foreground decoration-primary-foreground/70 hover:decoration-primary-foreground hover:opacity-95"
            : "text-primary dark:text-primary hover:text-primary/80 decoration-primary/40 hover:decoration-primary"
        )}
      >
        <span>{matchedUrl}</span>
        <ExternalLink className="size-2.5 shrink-0 opacity-70 group-hover/link:opacity-100 transition-opacity translate-y-0.5" />
      </a>
    );

    lastIndex = matchIndex + matchedUrl.length;
  }

  // Push remaining text
  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex));
  }

  return (
    <span className={cn("whitespace-pre-wrap leading-relaxed", className)}>
      {elements}
    </span>
  );
}
