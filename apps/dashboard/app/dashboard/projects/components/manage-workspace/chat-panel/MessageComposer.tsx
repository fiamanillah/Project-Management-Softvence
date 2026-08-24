"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover";
import { Badge } from "@workspace/ui/components/badge";
import { Input } from "@workspace/ui/components/input";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Progress } from "@workspace/ui/components/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import {
  Paperclip,
  SendHorizontal,
  Smile,
  Mic,
  FileText,
  Image as ImageIcon,
  ChevronDown,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  X,
  Check,
  Lock,
  UploadCloud,
  FileSpreadsheet,
  Archive,
  Eye,
  Trash2,
  AlertCircle,
  Loader2,
  Sparkles,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@workspace/ui/lib/utils";
import { api, getErrorMessage } from "@/lib/api";
import { MessageReplyPreview } from "./MessageReplyPreview";
import { OUTBOUND_THEMES, INBOUND_THEMES, getMessageTheme } from "../message-theme";
import {
  formatBytes,
  getFileExtension,
  getFileTypeConfig,
  isImageFile,
} from "./attachment-utils";
import type {
  ChatMessage,
  ChatAttachment,
  MessagePurpose,
  ClientMessageDirection,
  ClientMessageType,
  OutboundMessageType,
  ProjectCapabilities,
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
  projectId?: string;
  members?: Array<{ id: string; name: string; avatar?: string; designation?: string; role?: string }>;
  targetClientName: string;
  projectCapabilities?: ProjectCapabilities;
}

const EMOJI_LIST = ["👍", "❤️", "🚀", "🔥", "👏", "🎉", "💯", "👀", "🙌", "✨", "🎯", "💡", "⚡", "☕", "🤩", "🙏"];

export function MessageComposer({
  projectId,
  members,
  replyingTo,
  onCancelReply,
  onSendMessage,
  targetClientName,
  projectCapabilities,
}: MessageComposerProps) {
  const [text, setText] = React.useState("");

  // Mention autocomplete state
  const [mentionQuery, setMentionQuery] = React.useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = React.useState<number>(0);

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

  // Attachments state
  const [attachments, setAttachments] = React.useState<ChatAttachment[]>([]);
  const [previewAttachment, setPreviewAttachment] = React.useState<ChatAttachment | null>(null);
  const [isDraggingOver, setIsDraggingOver] = React.useState(false);

  // Popover menus state
  const [isRecordingVoice, setIsRecordingVoice] = React.useState(false);
  const [voiceSeconds, setVoiceSeconds] = React.useState(0);
  const [attachMenuOpen, setAttachMenuOpen] = React.useState(false);
  const [emojiMenuOpen, setEmojiMenuOpen] = React.useState(false);
  const [streamModeMenuOpen, setStreamModeMenuOpen] = React.useState(false);
  const [typeDropdownOpen, setTypeDropdownOpen] = React.useState(false);

  const colorInputRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const docInputRef = React.useRef<HTMLInputElement>(null);

  // Track upload intervals and object URLs for cleanup
  const uploadIntervalsRef = React.useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const objectUrlsRef = React.useRef<Set<string>>(new Set());

  // Cleanup object URLs on unmount
  React.useEffect(() => {
    return () => {
      uploadIntervalsRef.current.forEach((interval) => clearInterval(interval));
      uploadIntervalsRef.current.clear();
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current.clear();
    };
  }, []);

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

  // Matching members for @mentions
  const matchingMembers = React.useMemo(() => {
    if (mentionQuery === null || !members) return [];
    return members
      .filter(
        (m) =>
          m.name.toLowerCase().includes(mentionQuery) ||
          (m.designation && m.designation.toLowerCase().includes(mentionQuery))
      )
      .slice(0, 6);
  }, [mentionQuery, members]);

  const handleSelectMention = (member: { id: string; name: string }) => {
    if (!textareaRef.current) return;
    const cursorPos = textareaRef.current.selectionStart || text.length;
    const textBeforeCursor = text.slice(0, cursorPos);
    const textAfterCursor = text.slice(cursorPos);
    const words = textBeforeCursor.split(/\s/);
    words[words.length - 1] = `@${member.name} `;
    const newText = words.join(" ") + textAfterCursor;
    setText(newText);
    setMentionQuery(null);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = (words.join(" ") + " ").length;
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 10);
  };

  // Adjust height on input & detect @mention
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }

    // Check for @mention trigger
    const cursorPos = e.target.selectionStart || val.length;
    const textBeforeCursor = val.slice(0, cursorPos);
    const words = textBeforeCursor.split(/\s/);
    const lastWord = words[words.length - 1] || "";

    if (lastWord.startsWith("@")) {
      setMentionQuery(lastWord.slice(1).toLowerCase());
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  };

  // Real file upload to backend storage
  const uploadFileViaStorage = async (attachmentId: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entityType", "chat_message");
      if (projectId) formData.append("entityId", projectId);
      formData.append("isPublic", "true");

      // Progressively update visual progress indicator
      setAttachments((prev) =>
        prev.map((att) =>
          att.id === attachmentId ? { ...att, status: "uploading", progress: 35 } : att
        )
      );

      const res = await api.upload<{
        file: {
          key: string;
          url: string;
          publicUrl?: string;
          contentType?: string;
          size?: number;
        };
      }>("/storage/upload", formData);

      const uploaded = res?.file || (res as any)?.data?.file || res;
      const realUrl = uploaded?.publicUrl || uploaded?.url || (uploaded?.key ? `/api/v1/storage/stream/${uploaded.key}` : "");

      setAttachments((prev) =>
        prev.map((att) => {
          if (att.id === attachmentId) {
            return {
              ...att,
              url: realUrl || att.url,
              thumbnailUrl: att.type === "image" ? realUrl || att.url : undefined,
              status: "ready",
              progress: 100,
              fileSizeBytes: uploaded?.size || file.size,
              mimeType: uploaded?.contentType || file.type,
            };
          }
          return att;
        })
      );
    } catch (err: any) {
      console.error("Attachment upload failed:", err);
      const errMsg = getErrorMessage(err, "Failed to upload file");
      toast.error(`Upload error: ${errMsg}`);

      setAttachments((prev) =>
        prev.map((att) =>
          att.id === attachmentId ? { ...att, status: "error", progress: 0 } : att
        )
      );
    }
  };

  // Handle file additions (from native input, drag & drop, or clipboard paste)
  const handleAddFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (!files.length) return;

    const newAttachments: ChatAttachment[] = [];

    for (const file of files) {
      // 50 MB max file size limit check
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`"${file.name}" exceeds the 50MB file size limit.`);
        continue;
      }

      const id = `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const isImg = isImageFile(file.name) || file.type.startsWith("image/");
      const objectUrl = URL.createObjectURL(file);
      objectUrlsRef.current.add(objectUrl);

      const ext = getFileExtension(file.name);
      const formattedSize = formatBytes(file.size);

      const attachmentItem: ChatAttachment = {
        id,
        name: file.name,
        type: isImg ? "image" : "file",
        url: objectUrl,
        size: formattedSize,
        fileSizeBytes: file.size,
        extension: ext,
        mimeType: file.type,
        status: "uploading",
        progress: 15,
        file,
      };

      newAttachments.push(attachmentItem);
    }

    if (newAttachments.length > 0) {
      setAttachments((prev) => [...prev, ...newAttachments]);
      setAttachMenuOpen(false);

      // Trigger real file uploads to StorageModule
      newAttachments.forEach((att) => {
        if (att.file) {
          uploadFileViaStorage(att.id, att.file);
        }
      });

      toast.info(
        newAttachments.length === 1
          ? `Uploading "${newAttachments[0]!.name}"...`
          : `Uploading ${newAttachments.length} attachments...`
      );
    }
  };



  // Remove individual attachment
  const handleRemoveAttachment = (attId: string) => {
    // Clear any running upload interval
    if (uploadIntervalsRef.current.has(attId)) {
      clearInterval(uploadIntervalsRef.current.get(attId));
      uploadIntervalsRef.current.delete(attId);
    }

    // Revoke object URL if exists
    const target = attachments.find((a) => a.id === attId);
    if (target?.url && objectUrlsRef.current.has(target.url)) {
      URL.revokeObjectURL(target.url);
      objectUrlsRef.current.delete(target.url);
    }

    setAttachments((prev) => prev.filter((a) => a.id !== attId));
  };

  // Clear all attachments
  const handleClearAllAttachments = () => {
    uploadIntervalsRef.current.forEach((interval) => clearInterval(interval));
    uploadIntervalsRef.current.clear();
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
    setAttachments([]);
    toast.info("Cleared all attachments");
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  // Clipboard Paste handler
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      e.preventDefault();
      handleAddFiles(e.clipboardData.files);
    }
  };

  // Check if any attachment is actively uploading
  const isUploadingAny = attachments.some((a) => a.status === "uploading");

  // Send message
  const handleSend = () => {
    if ((!text.trim() && attachments.length === 0) || isUploadingAny) return;

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

    // Only attach ready attachments
    const readyAttachments = attachments
      .filter((a) => a.status === "ready" || !a.status)
      .map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        url: a.url,
        size: a.size,
        extension: a.extension,
        fileSizeBytes: a.fileSizeBytes,
        mimeType: a.mimeType,
      }));

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
      attachments: readyAttachments.length > 0 ? readyAttachments : undefined,
    });

    setText("");
    setAttachments([]);
    onCancelReply();

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Keyboard navigation when mention popup is open
    if (mentionQuery !== null && matchingMembers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % matchingMembers.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((prev) => (prev - 1 + matchingMembers.length) % matchingMembers.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const selectedMember = matchingMembers[mentionIndex] || matchingMembers[0];
        if (selectedMember) {
          handleSelectMention(selectedMember);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInsertEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
    setEmojiMenuOpen(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Add a dynamically managed custom message type
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

  // Calculate total size of attachments
  const totalAttachmentBytes = attachments.reduce((sum, a) => sum + (a.fileSizeBytes || 0), 0);

  // View-only mode for users without project.chat.send permission
  if (projectCapabilities && projectCapabilities.canChatSend === false) {
    return (
      <div className="border-t border-border/60 bg-muted/20 p-3 select-none flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Lock className="size-3.5 text-muted-foreground/70" />
        <span>You have view-only access to this project conversation.</span>
      </div>
    );
  }

  const canSendClientMessage = projectCapabilities?.canSendClientMessage !== false;
  const canManageTypes = projectCapabilities?.canManageTypes !== false;

  return (
    <div
      className="border-t border-border/60 bg-card/95 backdrop-blur-md p-2.5 select-none flex flex-col gap-1.5 relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden Native File Inputs for Images and Documents */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml,image/bmp"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleAddFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={docInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.rtf,.txt,.xls,.xlsx,.csv,.ppt,.pptx,.key,.zip,.rar,.tar,.gz,.7z,.json,.md,.xml,.sql,.py,.js,.ts,.tsx"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleAddFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {/* 1. Reply Preview Banner */}
      {replyingTo && (
        <MessageReplyPreview
          replyTo={replyingTo}
          isComposer={true}
          onCancel={onCancelReply}
        />
      )}

      {/* 2. Small Previews Tray in Composer (High-density, interactive card previews) */}
      {attachments.length > 0 && (
        <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-muted/40 border border-border/60 backdrop-blur-xs">
          {/* Header Summary Bar */}
          <div className="flex items-center justify-between px-1 text-[10px] text-muted-foreground font-semibold">
            <div className="flex items-center gap-1.5">
              <Paperclip className="size-3 text-primary" />
              <span>
                {attachments.length} attachment{attachments.length > 1 ? "s" : ""}
                {totalAttachmentBytes > 0 && ` • ${formatBytes(totalAttachmentBytes)}`}
              </span>
              {isUploadingAny && (
                <span className="flex items-center gap-1 text-primary animate-pulse ml-1 font-bold">
                  <Loader2 className="size-2.5 animate-spin" />
                  Uploading...
                </span>
              )}
            </div>

            {attachments.length > 1 && (
              <button
                type="button"
                onClick={handleClearAllAttachments}
                className="text-[10px] text-muted-foreground hover:text-rose-500 font-medium transition-colors cursor-pointer flex items-center gap-0.5"
              >
                <Trash2 className="size-2.5" />
                <span>Clear all</span>
              </button>
            )}
          </div>

          {/* Attachment Preview Items Strip */}
          <ScrollArea className="w-full max-h-36">
            <div className="flex flex-wrap gap-2 py-0.5 pr-2">
              {attachments.map((att) => {
                const isImg = att.type === "image";
                const isUploading = att.status === "uploading";
                const fileConfig = getFileTypeConfig(att.name, att.mimeType);
                const DocIcon = fileConfig.icon;

                if (isImg) {
                  return (
                    <div
                      key={att.id}
                      className={cn(
                        "relative group/img-preview size-15 rounded-xl border border-border/80 bg-background overflow-hidden shadow-2xs shrink-0 transition-all",
                        isUploading ? "ring-2 ring-primary/40" : "hover:border-primary/50"
                      )}
                    >
                      {/* Image Thumbnail */}
                      <img
                        src={att.url}
                        alt={att.name}
                        className="size-full object-cover cursor-pointer"
                        onClick={() => !isUploading && setPreviewAttachment(att)}
                      />

                      {/* Uploading Overlay */}
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-2xs flex flex-col items-center justify-center text-white gap-1 p-1">
                          <Loader2 className="size-4 animate-spin text-primary-foreground" />
                          <span className="text-[9px] font-mono font-bold">
                            {att.progress || 0}%
                          </span>
                        </div>
                      )}

                      {/* Ready Hover Overlay */}
                      {!isUploading && (
                        <div
                          onClick={() => setPreviewAttachment(att)}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover/img-preview:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                        >
                          <Eye className="size-3.5 text-white" />
                        </div>
                      )}

                      {/* Remove Button Badge */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveAttachment(att.id);
                        }}
                        className="absolute top-1 right-1 size-4 rounded-full bg-background/90 text-foreground border border-border/80 shadow-xs flex items-center justify-center hover:bg-rose-600 hover:text-white transition-colors cursor-pointer z-10 opacity-80 group-hover/img-preview:opacity-100"
                        title="Remove image"
                      >
                        <X className="size-2.5" />
                      </button>

                      {/* Bottom Info Pill */}
                      <div className="absolute bottom-0 inset-x-0 bg-black/70 px-1 py-0.5 text-[8px] text-white font-mono truncate text-center">
                        {att.size}
                      </div>
                    </div>
                  );
                }

                // Document Preview Card
                return (
                  <div
                    key={att.id}
                    className={cn(
                      "relative group/doc-preview flex items-center gap-2.5 min-w-[200px] max-w-[250px] h-13 px-2.5 py-1.5 rounded-xl border border-border/70 bg-background/90 shadow-2xs backdrop-blur-xs transition-all hover:bg-muted/30 shrink-0",
                      isUploading ? "ring-2 ring-primary/40" : fileConfig.borderHoverClass
                    )}
                  >
                    {/* Document Icon in Color Box */}
                    <div
                      className={cn(
                        "flex size-8 items-center justify-center rounded-lg shrink-0 shadow-2xs",
                        fileConfig.iconBgClass
                      )}
                    >
                      {isUploading ? (
                        <Loader2 className="size-4 animate-spin text-primary" />
                      ) : (
                        <DocIcon className={cn("size-4", fileConfig.iconColorClass)} />
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p
                          className="truncate text-xs font-semibold text-foreground leading-tight"
                          title={att.name}
                        >
                          {att.name}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge
                          variant="outline"
                          className={cn("text-[8px] font-mono px-1 py-0 rounded", fileConfig.badgeClass)}
                        >
                          {fileConfig.badgeLabel}
                        </Badge>
                        <span className="text-[9px] text-muted-foreground font-mono">
                          {att.size}
                        </span>
                      </div>
                    </div>

                    {/* Remove Action Button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(att.id)}
                      className="size-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 cursor-pointer ml-auto"
                      title="Remove document"
                    >
                      <X className="size-3" />
                    </button>

                    {/* Bottom Progress Bar for Uploading State */}
                    {isUploading && (
                      <div className="absolute bottom-0 inset-x-2 pb-0.5">
                        <Progress value={att.progress || 0} className="h-1" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* 3. Main Single Integrated Input Container */}
      <div
        className={cn(
          "relative flex flex-col rounded-2xl border bg-background shadow-xs transition-all",
          isDraggingOver
            ? "border-dashed border-primary bg-primary/5 ring-4 ring-primary/20 scale-[1.005]"
            : "border-border/80 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50"
        )}
      >
        {/* Drag & Drop Overlay Indicator */}
        {isDraggingOver && (
          <div className="absolute inset-0 z-20 rounded-2xl bg-background/90 backdrop-blur-xs flex items-center justify-center gap-2 border-2 border-dashed border-primary animate-pulse pointer-events-none">
            <UploadCloud className="size-6 text-primary animate-bounce" />
            <span className="text-xs sm:text-sm font-bold text-primary">
              Drop images or documents to attach
            </span>
          </div>
        )}

        {/* Mention Suggestions Popup Card */}
        {mentionQuery !== null && matchingMembers.length > 0 && (
          <div className="absolute bottom-[calc(100%+8px)] left-2 z-50 w-64 rounded-xl border border-border/80 bg-popover/95 p-1 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40">
              Mention Member
            </div>
            <div className="py-1 space-y-0.5 max-h-48 overflow-y-auto">
              {matchingMembers.map((member, idx) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => handleSelectMention(member)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer",
                    idx === mentionIndex
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  <Avatar className="size-5 border border-border/40 shrink-0">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback className="text-[9px] font-bold">
                      {member.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium leading-tight">{member.name}</p>
                    {member.designation && (
                      <p
                        className={cn(
                          "text-[10px] truncate",
                          idx === mentionIndex ? "text-primary-foreground/80" : "text-muted-foreground"
                        )}
                      >
                        {member.designation}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

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
            onPaste={handlePaste}
            placeholder={
              streamMode === "INTERNAL"
                ? "Type internal discussion for the team (Enter to send, drop files or paste images)..."
                : streamMode === "CLIENT_OUTBOUND"
                ? `Draft ${activeOutboundTypeObj.label} to ${targetClientName}...`
                : `Record ${activeInboundTypeObj.label} from ${targetClientName}...`
            }
            className="w-full resize-none bg-transparent px-3.5 pt-2.5 pb-1 text-xs sm:text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden min-h-[38px] max-h-[140px]"
          />
        )}

        {/* 4. Bottom Integrated Toolbar */}
        <div className="flex items-center justify-between px-2.5 py-1.5 border-t border-border/40 bg-muted/15 rounded-b-2xl gap-2 flex-wrap sm:flex-nowrap">
          {/* Left Group: Stream Selector + Message Type Selector + Attachments + Emoji + Voice */}
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
                  disabled={!canSendClientMessage}
                  onClick={() => {
                    if (!canSendClientMessage) return;
                    setStreamMode("CLIENT_OUTBOUND");
                    setStreamModeMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-left text-xs transition-colors",
                    !canSendClientMessage
                      ? "opacity-50 cursor-not-allowed text-muted-foreground"
                      : streamMode === "CLIENT_OUTBOUND"
                      ? "bg-sky-500/15 text-sky-700 dark:text-sky-300 font-bold cursor-pointer"
                      : "hover:bg-muted text-foreground/90 cursor-pointer"
                  )}
                  title={!canSendClientMessage ? "Requires client message dispatch permission" : undefined}
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
                  disabled={!canSendClientMessage}
                  onClick={() => {
                    if (!canSendClientMessage) return;
                    setStreamMode("CLIENT_INBOUND");
                    setStreamModeMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-left text-xs transition-colors",
                    !canSendClientMessage
                      ? "opacity-50 cursor-not-allowed text-muted-foreground"
                      : streamMode === "CLIENT_INBOUND"
                      ? "bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold cursor-pointer"
                      : "hover:bg-muted text-foreground/90 cursor-pointer"
                  )}
                  title={!canSendClientMessage ? "Requires client message permission" : undefined}
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

            {/* Message Type Selector */}
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

                    {/* Custom Message Type Builder */}
                    {isAddingCustomType ? (
                      <div className="p-2 border-t border-border/50 space-y-2 bg-muted/40 rounded-lg">
                        <p className="text-[10px] font-bold text-foreground">
                          New {streamMode === "CLIENT_OUTBOUND" ? "Outbound" : "Inbound"} Type
                        </p>

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
                    ) : canManageTypes ? (
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
                    ) : null}
                  </PopoverContent>
                </Popover>
              );
            })()}

            {/* Attachments Dropdown Menu (Images & Documents) */}
            <Popover open={attachMenuOpen} onOpenChange={setAttachMenuOpen}>
              <PopoverTrigger
                render={
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    className={cn(
                      "size-6.5 cursor-pointer rounded-lg transition-colors",
                      attachments.length > 0
                        ? "text-primary bg-primary/10 hover:bg-primary/15 font-bold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                    )}
                    title="Attach image or document"
                  >
                    <Paperclip className="size-3.5" />
                  </Button>
                }
              />
              <PopoverContent side="top" align="start" className="w-64 p-1.5 space-y-1">
                <div className="px-2 py-1 border-b border-border/50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Attach Files
                  </p>
                </div>

                {/* Real File Upload Triggers */}
                <div className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      imageInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted text-xs text-foreground cursor-pointer text-left transition-colors"
                  >
                    <div className="flex size-7 items-center justify-center rounded-md bg-sky-500/15 text-sky-600 dark:text-sky-400 shrink-0">
                      <ImageIcon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs leading-tight">Upload Image(s)</p>
                      <p className="text-[10px] text-muted-foreground truncate">PNG, JPG, WebP, GIF, SVG</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      docInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted text-xs text-foreground cursor-pointer text-left transition-colors"
                  >
                    <div className="flex size-7 items-center justify-center rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                      <FileText className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs leading-tight">Upload Document(s)</p>
                      <p className="text-[10px] text-muted-foreground truncate">PDF, DOCX, XLSX, ZIP, TXT</p>
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
              disabled={(!text.trim() && attachments.length === 0) || isUploadingAny}
              className={cn(
                "h-6.5 px-3 rounded-lg font-bold gap-1 text-[11px] shadow-2xs cursor-pointer transition-all",
                isUploadingAny ? "opacity-60 cursor-not-allowed" : "",
                streamMode === "CLIENT_OUTBOUND"
                  ? "bg-sky-600 hover:bg-sky-700 text-white"
                  : streamMode === "CLIENT_INBOUND"
                  ? "bg-purple-600 hover:bg-purple-700 text-white"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {isUploadingAny ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <span>Send</span>
                  <SendHorizontal className="size-3" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 5. Pre-Send Image / Attachment Lightbox Modal */}
      {previewAttachment && (
        <Dialog open={!!previewAttachment} onOpenChange={() => setPreviewAttachment(null)}>
          <DialogContent className="min-w-[340px] xs:min-w-[460px] sm:min-w-[600px] md:min-w-[720px] lg:min-w-[820px] w-[92vw] sm:w-[84vw] md:w-[76vw] lg:w-[68vw] p-0 overflow-hidden bg-card/95 backdrop-blur-xl border border-border/80 shadow-2xl">
            <DialogHeader className="flex flex-row items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/30 pr-12 sm:pr-14">
              <div className="min-w-0 pr-4">
                <DialogTitle className="text-sm font-bold text-foreground truncate">
                  {previewAttachment.name}
                </DialogTitle>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                  {previewAttachment.size && <span>{previewAttachment.size}</span>}
                  {previewAttachment.extension && (
                    <>
                      <span>•</span>
                      <span className="uppercase font-mono font-semibold">
                        {previewAttachment.extension}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  size="xs"
                  variant="destructive"
                  className="h-7 text-xs gap-1.5 font-semibold cursor-pointer shadow-2xs"
                  onClick={() => {
                    handleRemoveAttachment(previewAttachment.id);
                    setPreviewAttachment(null);
                  }}
                >
                  <Trash2 className="size-3.5" />
                  <span>Remove</span>
                </Button>
              </div>
            </DialogHeader>

            <div className="flex items-center justify-center p-4 sm:p-6 bg-black/10 dark:bg-black/30 max-h-[75vh] overflow-auto">
              {previewAttachment.type === "image" ? (
                <img
                  src={previewAttachment.url}
                  alt={previewAttachment.name}
                  className="max-h-[68vh] w-auto max-w-full object-contain rounded-xl shadow-lg border border-border/40"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 p-8 rounded-2xl bg-card border border-border/80 text-center max-w-md shadow-lg">
                  {(() => {
                    const cfg = getFileTypeConfig(previewAttachment.name, previewAttachment.mimeType);
                    const IconComp = cfg.icon;
                    return (
                      <>
                        <div
                          className={cn(
                            "flex size-16 items-center justify-center rounded-2xl shadow-md",
                            cfg.iconBgClass
                          )}
                        >
                          <IconComp className={cn("size-8", cfg.iconColorClass)} />
                        </div>
                        <p className="font-bold text-sm text-foreground break-all">
                          {previewAttachment.name}
                        </p>
                        <Badge variant="outline" className={cn("font-mono text-xs", cfg.badgeClass)}>
                          {cfg.badgeLabel} • {previewAttachment.size}
                        </Badge>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
