"use client";

import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover";
import { SmilePlus } from "lucide-react";
import { Button } from "@workspace/ui/components/button";

const POPULAR_EMOJIS = ["👍", "❤️", "🚀", "🔥", "👏", "🎉", "💯", "👀", "🙌", "✨"];

interface MessageReactionPickerProps {
  onSelectEmoji: (emoji: string) => void;
  children?: React.ReactNode;
}

export function MessageReactionPicker({ onSelectEmoji, children }: MessageReactionPickerProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (emoji: string) => {
    onSelectEmoji(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          children ? (
            (children as any)
          ) : (
            <Button
              size="icon-xs"
              variant="ghost"
              className="size-6 text-muted-foreground hover:text-foreground cursor-pointer rounded-full"
              title="Add reaction"
            >
              <SmilePlus className="size-3.5" />
            </Button>
          )
        }
      />
      <PopoverContent
        align="center"
        side="top"
        sideOffset={6}
        className="w-auto p-1.5 flex flex-row items-center gap-1 rounded-full shadow-xl border border-border/80 bg-background/95 backdrop-blur-md z-50"
      >
        {POPULAR_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => handleSelect(emoji)}
            className="size-7 flex items-center justify-center rounded-full text-base hover:scale-125 transition-transform hover:bg-muted/80 active:scale-95 cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
