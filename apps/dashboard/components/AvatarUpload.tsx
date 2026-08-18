"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import { api, getErrorMessage } from "@/lib/api";
import { Camera, Loader2, Trash2, UploadCloud, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@workspace/ui/lib/utils";

export interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  fallbackName?: string;
  fallbackInitials?: string;
  size?: "sm" | "md" | "lg" | "xl";
  uploadEndpoint?: string;
  removeEndpoint?: string;
  onUpload?: (file: File) => Promise<string>;
  onRemove?: () => Promise<void>;
  onAvatarChange?: (newAvatarUrl: string | null) => void;
  disabled?: boolean;
  className?: string;
  showHelpText?: boolean;
}

const sizeClasses = {
  sm: "size-16",
  md: "size-24",
  lg: "size-32",
  xl: "size-40",
};

const textSizes = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-3xl",
  xl: "text-4xl",
};

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];

export function AvatarUpload({
  currentAvatarUrl,
  fallbackName = "User",
  fallbackInitials,
  size = "lg",
  uploadEndpoint = "/users/me/avatar",
  removeEndpoint = "/users/me/avatar",
  onUpload,
  onRemove,
  onAvatarChange,
  disabled = false,
  className,
  showHelpText = true,
}: AvatarUploadProps) {
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(currentAvatarUrl || null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isRemoving, setIsRemoving] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setAvatarUrl(currentAvatarUrl || null);
  }, [currentAvatarUrl]);

  const initials =
    fallbackInitials ||
    (fallbackName
      ? fallbackName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "U");

  const handleFile = async (file: File) => {
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Invalid file format", {
        description: "Please select a JPEG, PNG, WEBP, GIF, or SVG image.",
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error("File too large", {
        description: `Image size must be less than ${MAX_FILE_SIZE_MB}MB.`,
      });
      return;
    }

    setIsUploading(true);

    try {
      let newUrl: string;

      if (onUpload) {
        newUrl = await onUpload(file);
      } else {
        const formData = new FormData();
        formData.append("avatar", file);

        const res = await api.upload<{ avatarUrl: string; user?: any }>(
          uploadEndpoint,
          formData,
        );

        newUrl = res?.avatarUrl || (res as any)?.url;
      }

      if (newUrl) {
        setAvatarUrl(newUrl);
        if (onAvatarChange) onAvatarChange(newUrl);
        toast.success("Profile picture updated successfully");
      }
    } catch (err: any) {
      const msg = getErrorMessage(err, "Failed to upload avatar image");
      toast.error("Upload failed", { description: msg });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleRemove = async () => {
    if (disabled || isRemoving || !avatarUrl) return;

    setIsRemoving(true);
    try {
      if (onRemove) {
        await onRemove();
      } else {
        await api.delete(removeEndpoint);
      }

      setAvatarUrl(null);
      if (onAvatarChange) onAvatarChange(null);
      toast.success("Profile picture removed");
    } catch (err: any) {
      const msg = getErrorMessage(err, "Failed to remove avatar");
      toast.error("Action failed", { description: msg });
    } finally {
      setIsRemoving(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const triggerPicker = () => {
    if (!disabled && !isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={cn("flex flex-col sm:flex-row items-center gap-5", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
      />

      {/* Avatar Container with Hover Overlay & Drag-Drop */}
      <div
        className={cn(
          "relative group cursor-pointer rounded-full transition-all duration-300 ring-offset-background",
          sizeClasses[size],
          isDragging && "ring-4 ring-primary scale-105 shadow-lg",
          !disabled && "hover:ring-2 hover:ring-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          disabled && "opacity-70 cursor-not-allowed",
        )}
        onClick={triggerPicker}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-label="Upload profile picture"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            triggerPicker();
          }
        }}
      >
        <Avatar className={cn("size-full border-2 border-border/80 shadow-md bg-muted")}>
          {avatarUrl ? (
            <AvatarImage
              src={avatarUrl}
              alt={fallbackName}
              className="object-cover size-full"
            />
          ) : null}
          <AvatarFallback
            className={cn(
              "font-bold bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 text-primary tracking-wide",
              textSizes[size],
            )}
          >
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Hover / Loading Overlay */}
        <div
          className={cn(
            "absolute inset-0 rounded-full bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white transition-opacity duration-200",
            isUploading || isRemoving
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100",
            disabled && "hidden",
          )}
        >
          {isUploading || isRemoving ? (
            <Loader2 className="size-6 animate-spin text-white" />
          ) : (
            <>
              <Camera className="size-6 mb-1 drop-shadow-sm" />
              <span className="text-[10px] font-semibold tracking-wider uppercase">
                {avatarUrl ? "Change" : "Upload"}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Control Buttons & Info */}
      <div className="flex flex-col items-center sm:items-start gap-2 text-center sm:text-left">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={triggerPicker}
            disabled={disabled || isUploading || isRemoving}
            className="h-8 text-xs font-medium gap-1.5 shadow-2xs"
          >
            {isUploading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <UploadCloud className="size-3.5 text-primary" />
            )}
            <span>{avatarUrl ? "Change Avatar" : "Upload Picture"}</span>
          </Button>

          {avatarUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={disabled || isUploading || isRemoving}
              className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
            >
              {isRemoving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              <span>Remove</span>
            </Button>
          )}
        </div>

        {showHelpText && (
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <span>Supports JPG, PNG, WEBP, GIF, SVG up to 5MB.</span>
          </p>
        )}
      </div>
    </div>
  );
}
