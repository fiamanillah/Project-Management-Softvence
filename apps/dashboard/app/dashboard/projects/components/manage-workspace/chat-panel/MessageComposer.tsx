"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover";
import { Badge } from "@workspace/ui/components/badge";
import { Input } from "@workspace/ui/components/input";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Paperclip,
  SendHorizontal,
  Smile,
  Mic,
  FileText,
  Image as ImageIcon,
  ChevronDown,
  Building2,
  Users,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  X,
  Check,
  Lock,
  Pipette,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@workspace/ui/lib/utils";
import { MessageReplyPreview } from "./MessageReplyPreview";
import { OUTBOUND_THEMES, INBOUND_THEMES, getMessageTheme } from "../message-theme";
import type {
  ChatMessage,
  ChatAttachment,
  MessagePurpose,
  ClientMessageDirection,
  ClientMessageType,
  OutboundMessageType,
} from "../types";

export interface MessageTypeOption {
  id: string;
  label: string;
  color: string; // Hex code (e.g. #10b981) or class name
  description: string;
}

const PRESET_COLORS = [
  { name: "Emerald", hex: "#10b981" },
  { name: "Amber", hex: "#f59e0b" },
  { name: "Indigo", hex: "#6366f1" },
  { name: "Cyan", hex: "#06b6d4" },
  { name: "Purple", hex: "#a855f7" },
  { name: "Rose", hex: "#f43f5e" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Orange", hex: "#f97316" },
  { name: "Teal", hex: "#14b8a6" },
  { name: "Pink", hex: "#ec4899" },
];

const DEFAULT_OUTBOUND_TYPES: MessageTypeOption[] = Object.values(OUTBOUND_THEMES).map((t) => ({
  id: t.id,
  label: t.label,
  color: t.colorHex,
  description: t.description,
}));

const DEFAULT_INBOUND_TYPES: MessageTypeOption[] = Object.values(INBOUND_THEMES).map((t) => ({
  id: t.id,
  label: t.label,
  color: t.colorHex,
  description: t.description,
}));

type ComposerStreamMode = "INTERNAL" | "CLIENT_OUTBOUND" | "CLIENT_INBOUND";

interface MessageComposerProps {
  replyingTo: ChatMessage | null;
  onCancelReply: () => void;
  onSendMessage: (payload: {
    text: string;
    purpose: MessagePurpose;
    clientDirection?: ClientMessageDirection;
    clientMessageType?: ClientMessageType;
    outboundType?: OutboundMessageType;
    replyTo?: { id: string; senderName: string; text: string };
    attachments?: ChatAttachment[];
  }) => void;
  targetClientName: string;
}

const EMOJI_LIST = ["👍", "❤️", "🚀", "🔥", "👏", "🎉", "💯", "👀", "🙌", "✨", "🎯", "💡", "⚡", "☕", "🤩", "🙏"];

export function MessageComposer({
  replyingTo,
  onCancelReply,
  onSendMessage,
  targetClientName,
}: MessageComposerProps) {
  const [text, setText] = React.useState("");
  
  // Single active composer stream mode
  const [streamMode, setStreamMode] = React.useState<ComposerStreamMode>("INTERNAL");
  
  // Outbound message types
  const [outboundTypes, setOutboundTypes] = React.useState<MessageTypeOption[]>(DEFAULT_OUTBOUND_TYPES);
  const [selectedOutboundTypeId, setSelectedOutboundTypeId] = React.useState<string>("DELIVERY");

  // Inbound message types
  const [inboundTypes, setInboundTypes] = React.useState<MessageTypeOption[]>(DEFAULT_INBOUND_TYPES);
  const [selectedInboundTypeId, setSelectedInboundTypeId] = React.useState<string>("CLIENT_FEEDBACK");
  
  // Custom type creation state
  const [isAddingCustomType, setIsAddingCustomType] = React.useState(false);
  const [customTypeLabel, setCustomTypeLabel] = React.useState("");
  const [customTypeColor, setCustomTypeColor] = React.useState("#10b981");

  const [attachments, setAttachments] = React.useState<ChatAttachment[]>([]);
  const [isRecordingVoice, setIsRecordingVoice] = React.useState(false);
  const [voiceSeconds, setVoiceSeconds] = React.useState(0);
  const [attachMenuOpen, setAttachMenuOpen] = React.useState(false);
  const [emojiMenuOpen, setEmojiMenuOpen] = React.useState(false);
  const [streamModeMenuOpen, setStreamModeMenuOpen] = React.useState(false);
  const [typeDropdownOpen, setTypeDropdownOpen] = React.useState(false);

  const colorInputRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Voice recording timer
  React.useEffect(() => {
    let interval: any;
    if (isRecordingVoice) {
      interval = setInterval(() => {
        setVoiceSeconds((s) => s + 1);
      }, 1000);
    } else {
      setVoiceSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecordingVoice]);

  // Adjust height on input
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  };

  const handleSend = () => {
    if (!text.trim() && attachments.length === 0) return;

    let purpose: MessagePurpose = "INTERNAL_DISCUSSION";
    let clientDirection: ClientMessageDirection | undefined = undefined;
    let chosenMessageType: ClientMessageType | undefined = undefined;

    if (streamMode === "CLIENT_OUTBOUND") {
      purpose = "CLIENT_COMMUNICATION";
      clientDirection = "OUTBOUND";
      chosenMessageType = (selectedOutboundTypeId as ClientMessageType) || "GENERAL_NOTICE";
    } else if (streamMode === "CLIENT_INBOUND") {
      purpose = "CLIENT_COMMUNICATION";
      clientDirection = "INBOUND";
      chosenMessageType = (selectedInboundTypeId as ClientMessageType) || "CLIENT_FEEDBACK";
    }

    onSendMessage({
      text: text.trim(),
      purpose,
      clientDirection,
      clientMessageType: chosenMessageType,
      outboundType: streamMode === "CLIENT_OUTBOUND" ? chosenMessageType : undefined,
      replyTo: replyingTo
        ? {
            id: replyingTo.id,
            senderName: replyingTo.senderName,
            text: replyingTo.text,
          }
        : undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    setText("");
    setAttachments([]);
    onCancelReply();

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAddSampleAttachment = (type: "file" | "image") => {
    if (type === "image") {
      setAttachments((prev) => [
        ...prev,
        {
          id: `att-${Date.now()}`,
          name: "Mobile_Design_Mockup_v5.png",
          type: "image",
          url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80",
          size: "3.1 MB",
          version: "v5.0",
        },
      ]);
      toast.success("Attached image mockup");
    } else if (type === "file") {
      setAttachments((prev) => [
        ...prev,
        {
          id: `att-${Date.now()}`,
          name: "Sprint_Deliverables_Summary.pdf",
          type: "file",
          size: "2.4 MB",
          version: "v1.2",
        },
      ]);
      toast.success("Attached PDF brief");
    }
    setAttachMenuOpen(false);
  };

  const handleRemoveAttachment = (attId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attId));
  };

  const handleInsertEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
    setEmojiMenuOpen(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Add a dynamically managed custom message type (Color-based, with native color picker)
  const handleCreateCustomType = () => {
    if (!customTypeLabel.trim()) return;
    const newId = customTypeLabel.trim().toUpperCase().replace(/\s+/g, "_");
    const newOption: MessageTypeOption = {
      id: newId,
      label: customTypeLabel.trim(),
      color: customTypeColor,
      description: `Custom ${streamMode === "CLIENT_OUTBOUND" ? "outbound" : "inbound"} type: ${customTypeLabel.trim()}`,
    };

    if (streamMode === "CLIENT_OUTBOUND") {
      setOutboundTypes((prev) => [...prev, newOption]);
      setSelectedOutboundTypeId(newId);
    } else {
      setInboundTypes((prev) => [...prev, newOption]);
      setSelectedInboundTypeId(newId);
    }

    setCustomTypeLabel("");
    setIsAddingCustomType(false);
    setTypeDropdownOpen(false);
    toast.success(`Created custom message type "${newOption.label}"`);
  };

  const activeOutboundTypeObj =
    outboundTypes.find((t) => t.id === selectedOutboundTypeId) || outboundTypes[0]!;
  const activeInboundTypeObj =
    inboundTypes.find((t) => t.id === selectedInboundTypeId) || inboundTypes[0]!;

  const currentTypeOptions = streamMode === "CLIENT_OUTBOUND" ? outboundTypes : inboundTypes;
  const currentSelectedTypeId = streamMode === "CLIENT_OUTBOUND" ? selectedOutboundTypeId : selectedInboundTypeId;
  const currentActiveTypeObj = streamMode === "CLIENT_OUTBOUND" ? activeOutboundTypeObj : activeInboundTypeObj;

  return (
    <div className="border-t border-border/60 bg-card/95 backdrop-blur-md p-2.5 select-none flex flex-col gap-1.5">
      {/* 1. Reply Preview Banner (Compact) */}
      {replyingTo && (
        <MessageReplyPreview replyTo={replyingTo} onCancel={onCancelReply} />
      )}

      {/* 2. Attachment Chips Preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-1.5 rounded-lg bg-muted/80 border border-border/60 px-2 py-0.5 text-xs text-foreground shadow-2xs group"
            >
              {att.type === "image" ? (
                <ImageIcon className="size-3 text-sky-500 shrink-0" />
              ) : (
                <FileText className="size-3 text-amber-500 shrink-0" />
              )}
              <span className="font-medium max-w-[140px] truncate text-[11px]">{att.name}</span>
              <span className="text-[9px] text-muted-foreground">({att.size})</span>
              <button
                type="button"
                onClick={() => handleRemoveAttachment(att.id)}
                className="size-3.5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors ml-0.5 cursor-pointer"
                title="Remove attachment"
              >
                <X className="size-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 3. Main Single Integrated Input Container (Zero wasted horizontal bars above) */}
      <div className="relative flex flex-col rounded-2xl border border-border/80 bg-background shadow-xs focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50 transition-all">
        {/* Voice recording overlay */}
        {isRecordingVoice ? (
          <div className="flex h-14 items-center justify-between px-4 bg-rose-500/10 rounded-2xl animate-pulse">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold text-xs">
              <span className="size-2 rounded-full bg-rose-500 animate-ping" />
              <span>Recording Voice Note ({voiceSeconds}s)...</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="xs"
                variant="ghost"
                onClick={() => setIsRecordingVoice(false)}
                className="h-6.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                size="xs"
                onClick={() => {
                  setIsRecordingVoice(false);
                  toast.success("Voice note attached");
                  setText((prev) => prev + (prev ? " " : "") + "[Voice Note]");
                }}
                className="h-6.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                Attach
              </Button>
            </div>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={
              streamMode === "INTERNAL"
                ? "Type internal discussion for the team (Enter to send)..."
                : streamMode === "CLIENT_OUTBOUND"
                ? `Draft ${activeOutboundTypeObj.label} to ${targetClientName}...`
                : `Record ${activeInboundTypeObj.label} from ${targetClientName}...`
            }
            className="w-full resize-none bg-transparent px-3.5 pt-2.5 pb-1 text-xs sm:text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden min-h-[38px] max-h-[140px]"
          />
        )}

        {/* 4. Bottom Integrated Toolbar (Everything fits compactly inside) */}
        <div className="flex items-center justify-between px-2.5 py-1.5 border-t border-border/40 bg-muted/15 rounded-b-2xl gap-2 flex-wrap sm:flex-nowrap">
          {/* Left Group: Stream Selector + Message Type Selector (Outbound & Inbound) + Attachments */}
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            {/* Stream Mode Dropdown Selector */}
            <Popover open={streamModeMenuOpen} onOpenChange={setStreamModeMenuOpen}>
              <PopoverTrigger
                render={
                  <Button
                    size="xs"
                    variant="outline"
                    className={cn(
                      "h-6.5 text-[11px] font-semibold gap-1 px-2 rounded-lg shadow-2xs cursor-pointer transition-colors shrink-0",
                      streamMode === "INTERNAL"
                        ? "bg-muted/80 border-border/60 text-foreground"
                        : streamMode === "CLIENT_OUTBOUND"
                        ? "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30 font-bold"
                        : "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 font-bold"
                    )}
                  >
                    {streamMode === "INTERNAL" ? (
                      <Lock className="size-3 text-muted-foreground shrink-0" />
                    ) : streamMode === "CLIENT_OUTBOUND" ? (
                      <ArrowUpRight className="size-3 text-sky-500 shrink-0" />
                    ) : (
                      <ArrowDownLeft className="size-3 text-purple-500 shrink-0" />
                    )}
                    <span>
                      {streamMode === "INTERNAL"
                        ? "Internal"
                        : streamMode === "CLIENT_OUTBOUND"
                        ? "Outbound"
                        : "Inbound"}
                    </span>
                    <ChevronDown className="size-2.5 opacity-50 ml-0.5" />
                  </Button>
                }
              />
              <PopoverContent side="top" align="start" className="w-56 p-1 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setStreamMode("INTERNAL");
                    setStreamModeMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-left text-xs transition-colors cursor-pointer",
                    streamMode === "INTERNAL"
                      ? "bg-primary/10 text-primary font-bold"
                      : "hover:bg-muted text-foreground/90"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Lock className="size-3.5 text-muted-foreground" />
                    <div>
                      <p className="font-semibold leading-tight">Internal Discussion</p>
                      <p className="text-[10px] text-muted-foreground">Visible to team only</p>
                    </div>
                  </div>
                  {streamMode === "INTERNAL" && <Check className="size-3 text-primary" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStreamMode("CLIENT_OUTBOUND");
                    setStreamModeMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-left text-xs transition-colors cursor-pointer",
                    streamMode === "CLIENT_OUTBOUND"
                      ? "bg-sky-500/15 text-sky-700 dark:text-sky-300 font-bold"
                      : "hover:bg-muted text-foreground/90"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="size-3.5 text-sky-500" />
                    <div>
                      <p className="font-semibold leading-tight">Client Outbound</p>
                      <p className="text-[10px] text-muted-foreground">Draft to send to client</p>
                    </div>
                  </div>
                  {streamMode === "CLIENT_OUTBOUND" && <Check className="size-3 text-sky-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStreamMode("CLIENT_INBOUND");
                    setStreamModeMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-left text-xs transition-colors cursor-pointer",
                    streamMode === "CLIENT_INBOUND"
                      ? "bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold"
                      : "hover:bg-muted text-foreground/90"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <ArrowDownLeft className="size-3.5 text-purple-500" />
                    <div>
                      <p className="font-semibold leading-tight">Client Inbound</p>
                      <p className="text-[10px] text-muted-foreground">Relay from client</p>
                    </div>
                  </div>
                  {streamMode === "CLIENT_INBOUND" && <Check className="size-3 text-purple-600" />}
                </button>
              </PopoverContent>
            </Popover>

            {/* Message Type Selector (Rendered for BOTH Client Outbound and Client Inbound) */}
            {streamMode !== "INTERNAL" && (() => {
              const activeTheme = getMessageTheme(
                currentSelectedTypeId as any,
                streamMode === "CLIENT_OUTBOUND" ? "OUTBOUND" : "INBOUND"
              );

              return (
                <Popover open={typeDropdownOpen} onOpenChange={setTypeDropdownOpen}>
                  <PopoverTrigger
                    render={
                      <Button
                        size="xs"
                        variant="outline"
                        className={cn(
                          "h-6.5 text-[11px] font-semibold gap-1.5 px-2 rounded-lg bg-background text-foreground hover:bg-muted/80 shadow-2xs cursor-pointer shrink-0 border",
                          activeTheme.cardBorderClass
                        )}
                      >
                        <span
                          className={cn("size-2 rounded-full shrink-0 shadow-xs", activeTheme.dotColorClass)}
                        />
                        <span className="truncate max-w-[110px]">{activeTheme.label}</span>
                        <ChevronDown className="size-2.5 opacity-50 ml-0.5" />
                      </Button>
                    }
                  />
                  <PopoverContent
                    side="top"
                    align="start"
                    className="w-72 p-2 space-y-1.5 bg-popover/95 backdrop-blur-md border-border/80 shadow-xl overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-1 pb-1 border-b border-border/50">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {streamMode === "CLIENT_OUTBOUND" ? "Outbound Message Type" : "Inbound Message Type"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {currentTypeOptions.length} options
                      </span>
                    </div>

                    {/* Shadcn ScrollArea with Custom Scrollbar for Message Types */}
                    <ScrollArea className="h-44 w-full">
                      <div className="space-y-0.5 pr-2">
                        {currentTypeOptions.map((typeObj) => {
                          const isSelected = currentSelectedTypeId === typeObj.id;
                          const itemTheme = getMessageTheme(
                            typeObj.id as any,
                            streamMode === "CLIENT_OUTBOUND" ? "OUTBOUND" : "INBOUND"
                          );

                          return (
                            <button
                              key={typeObj.id}
                              type="button"
                              onClick={() => {
                                if (streamMode === "CLIENT_OUTBOUND") {
                                  setSelectedOutboundTypeId(typeObj.id);
                                } else {
                                  setSelectedInboundTypeId(typeObj.id);
                                }
                                setTypeDropdownOpen(false);
                              }}
                              className={cn(
                                "w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer",
                                isSelected
                                  ? "bg-primary/10 text-primary font-bold"
                                  : "hover:bg-muted/70 text-foreground/90"
                              )}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={cn("size-2.5 rounded-full shrink-0 shadow-xs", itemTheme.dotColorClass)}
                                />
                                <div className="min-w-0">
                                  <p className="font-semibold text-xs leading-tight truncate">
                                    {itemTheme.label}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground truncate leading-tight">
                                    {itemTheme.description}
                                  </p>
                                </div>
                              </div>
                              {isSelected && <Check className="size-3.5 text-primary shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </ScrollArea>

                  {/* Custom Message Type Builder with Presets + Interactive Native Color Picker */}
                  {isAddingCustomType ? (
                    <div className="p-2 border-t border-border/50 space-y-2 bg-muted/40 rounded-lg">
                      <p className="text-[10px] font-bold text-foreground">
                        New {streamMode === "CLIENT_OUTBOUND" ? "Outbound" : "Inbound"} Type
                      </p>
                      
                      {/* Color Palette Selection + Full Color Picker */}
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground">Select or Pick Color:</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {PRESET_COLORS.map((color) => (
                            <button
                              key={color.name}
                              type="button"
                              onClick={() => setCustomTypeColor(color.hex)}
                              className={cn(
                                "size-4 rounded-full transition-transform cursor-pointer shadow-2xs",
                                customTypeColor.toLowerCase() === color.hex.toLowerCase()
                                  ? "ring-2 ring-foreground scale-110"
                                  : "opacity-85 hover:opacity-100"
                              )}
                              style={{ backgroundColor: color.hex }}
                              title={color.name}
                            />
                          ))}

                          {/* Interactive Native Color Picker Trigger */}
                          <label
                            htmlFor="custom-hex-color-picker"
                            className="relative size-4 rounded-full border border-border/80 flex items-center justify-center cursor-pointer overflow-hidden shadow-2xs hover:scale-110 transition-transform"
                            title="Open Color Picker"
                          >
                            <input
                              ref={colorInputRef}
                              id="custom-hex-color-picker"
                              type="color"
                              value={customTypeColor}
                              onChange={(e) => setCustomTypeColor(e.target.value)}
                              className="absolute -inset-2 size-8 opacity-0 cursor-pointer"
                            />
                            <span
                              className="size-full"
                              style={{ backgroundColor: customTypeColor }}
                            />
                          </label>

                          <span className="text-[9px] font-mono text-muted-foreground ml-1">
                            {customTypeColor}
                          </span>
                        </div>
                      </div>

                      <Input
                        value={customTypeLabel}
                        onChange={(e) => setCustomTypeLabel(e.target.value)}
                        placeholder="Type label (e.g. Contract Amendment)..."
                        className="h-7 text-xs bg-background"
                        autoFocus
                      />

                      <div className="flex items-center justify-end gap-1 pt-0.5">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => setIsAddingCustomType(false)}
                          className="h-6 text-[10px] px-2"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="xs"
                          onClick={handleCreateCustomType}
                          disabled={!customTypeLabel.trim()}
                          className="h-6 text-[10px] px-2.5 font-bold"
                        >
                          Add Type
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAddingCustomType(true)}
                      className="w-full flex items-center justify-center gap-1.5 py-1 text-[11px] font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer border border-dashed border-primary/30"
                    >
                      <Plus className="size-3" />
                      <span>
                        + Custom {streamMode === "CLIENT_OUTBOUND" ? "Outbound" : "Inbound"} Type
                      </span>
                    </button>
                  )}
                </PopoverContent>
              </Popover>
            );
          })()}

            {/* Attachments Trigger Popover */}
            <Popover open={attachMenuOpen} onOpenChange={setAttachMenuOpen}>
              <PopoverTrigger
                render={
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    className="size-6.5 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg hover:bg-muted/80"
                    title="Attach image or document"
                  >
                    <Paperclip className="size-3.5" />
                  </Button>
                }
              />
              <PopoverContent side="top" align="start" className="w-48 p-1">
                <div className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => handleAddSampleAttachment("image")}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted text-xs text-foreground cursor-pointer text-left"
                  >
                    <ImageIcon className="size-3.5 text-sky-500" />
                    <div>
                      <p className="font-semibold leading-tight text-xs">Image Mockup</p>
                      <p className="text-[10px] text-muted-foreground">PNG / JPG file</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddSampleAttachment("file")}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted text-xs text-foreground cursor-pointer text-left"
                  >
                    <FileText className="size-3.5 text-amber-500" />
                    <div>
                      <p className="font-semibold leading-tight text-xs">PDF Deliverable</p>
                      <p className="text-[10px] text-muted-foreground">Document file</p>
                    </div>
                  </button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Emoji Picker Popover */}
            <Popover open={emojiMenuOpen} onOpenChange={setEmojiMenuOpen}>
              <PopoverTrigger
                render={
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    className="size-6.5 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg hover:bg-muted/80"
                    title="Insert emoji"
                  >
                    <Smile className="size-3.5" />
                  </Button>
                }
              />
              <PopoverContent side="top" align="start" className="w-60 p-2">
                <div className="grid grid-cols-8 gap-1">
                  {EMOJI_LIST.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleInsertEmoji(emoji)}
                      className="size-6.5 flex items-center justify-center rounded hover:bg-muted text-sm cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Voice Recording Button */}
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={() => setIsRecordingVoice((prev) => !prev)}
              className={cn(
                "size-6.5 cursor-pointer rounded-lg hover:bg-muted/80",
                isRecordingVoice
                  ? "text-rose-600 bg-rose-500/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Record voice note"
            >
              <Mic className="size-3.5" />
            </Button>
          </div>

          {/* Right Group: Keyboard Tip + Send Button */}
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <span className="text-[10px] text-muted-foreground/60 hidden md:inline select-none">
              <kbd className="font-mono bg-muted px-1 py-0.5 rounded text-[9px]">Enter</kbd>
            </span>

            <Button
              size="xs"
              onClick={handleSend}
              disabled={!text.trim() && attachments.length === 0}
              className={cn(
                "h-6.5 px-3 rounded-lg font-bold gap-1 text-[11px] shadow-2xs cursor-pointer transition-all",
                streamMode === "CLIENT_OUTBOUND"
                  ? "bg-sky-600 hover:bg-sky-700 text-white"
                  : streamMode === "CLIENT_INBOUND"
                  ? "bg-purple-600 hover:bg-purple-700 text-white"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              <span>Send</span>
              <SendHorizontal className="size-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
