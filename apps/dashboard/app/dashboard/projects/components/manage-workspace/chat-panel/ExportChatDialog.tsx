"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { RadioGroup, RadioGroupItem } from "@workspace/ui/components/radio-group";
import { Label } from "@workspace/ui/components/label";
import { Download, FileSpreadsheet, FileCode, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface ExportChatDialogProps {
  projectId: string;
  projectCode: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportChatDialog({
  projectId,
  projectCode,
  open,
  onOpenChange,
}: ExportChatDialogProps) {
  const [format, setFormat] = React.useState<"csv" | "json" | "txt">("csv");
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await api.get<any>(`/projects/${projectId}/messages/export?format=${format}`);
      
      const content = typeof res === "string" ? res : typeof res?.data === "string" ? res.data : JSON.stringify(res, null, 2);
      const mimeTypes: Record<string, string> = {
        csv: "text/csv;charset=utf-8;",
        json: "application/json;charset=utf-8;",
        txt: "text/plain;charset=utf-8;",
      };

      const blob = new Blob([content], { type: mimeTypes[format] || "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${projectCode}-chat-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Chat history exported successfully as .${format.toUpperCase()}`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to export chat messages");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Download className="size-4 text-primary" />
            Export Conversation
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Download the complete message log and communication audit trail for{" "}
            <span className="font-semibold text-foreground">{projectCode}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="py-3">
          <RadioGroup
            value={format}
            onValueChange={(val) => setFormat(val as any)}
            className="grid gap-2.5"
          >
            {/* CSV Option */}
            <Label
              htmlFor="format-csv"
              className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
                format === "csv"
                  ? "border-primary bg-primary/5 shadow-xs"
                  : "border-border/60 hover:bg-muted/40"
              }`}
            >
              <RadioGroupItem value="csv" id="format-csv" className="mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 font-medium text-xs">
                  <FileSpreadsheet className="size-3.5 text-emerald-500" />
                  CSV Spreadsheet (.csv)
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  Compatible with Microsoft Excel and Google Sheets. Includes timestamps, senders, purposes, and attachment references.
                </p>
              </div>
            </Label>

            {/* JSON Option */}
            <Label
              htmlFor="format-json"
              className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
                format === "json"
                  ? "border-primary bg-primary/5 shadow-xs"
                  : "border-border/60 hover:bg-muted/40"
              }`}
            >
              <RadioGroupItem value="json" id="format-json" className="mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 font-medium text-xs">
                  <FileCode className="size-3.5 text-blue-500" />
                  JSON Data Object (.json)
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  Structured machine-readable format with full metadata, sender objects, and attachments.
                </p>
              </div>
            </Label>

            {/* TXT Option */}
            <Label
              htmlFor="format-txt"
              className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
                format === "txt"
                  ? "border-primary bg-primary/5 shadow-xs"
                  : "border-border/60 hover:bg-muted/40"
              }`}
            >
              <RadioGroupItem value="txt" id="format-txt" className="mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 font-medium text-xs">
                  <FileText className="size-3.5 text-amber-500" />
                  Plain Text Transcript (.txt)
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  Simple human-readable chat log format with chronological timestamps.
                </p>
              </div>
            </Label>
          </RadioGroup>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleExport}
            disabled={isExporting}
            className="gap-1.5"
          >
            {isExporting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="size-3.5" />
                Download .{format.toUpperCase()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
