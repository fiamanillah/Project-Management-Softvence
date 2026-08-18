"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { api, handleFormApiError } from "@/lib/api";
import { toast } from "sonner";
import type { PlatformItem, CreateQuickClientDTO, ClientItem } from "@workspace/shared";
import { Building2, Loader2 } from "lucide-react";

export interface QuickCreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platforms: PlatformItem[];
  defaultPlatformId?: string;
  onSuccess: (newClient: ClientItem) => void;
}

export function QuickCreateClientDialog({
  open,
  onOpenChange,
  platforms,
  defaultPlatformId,
  onSuccess,
}: QuickCreateClientDialogProps) {
  const [name, setName] = React.useState("");
  const [platformId, setPlatformId] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [contactNotes, setContactNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      setName("");
      setPlatformId(defaultPlatformId || platforms[0]?.id || "");
      setEmail("");
      setCompany("");
      setPhone("");
      setCountry("");
      setWebsite("");
      setContactNotes("");
      setFieldErrors({});
    }
  }, [open, defaultPlatformId, platforms]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFieldErrors({ name: "Client name is required" });
      return;
    }
    if (!platformId) {
      setFieldErrors({ platformId: "Origin platform is required" });
      return;
    }

    setLoading(true);
    setFieldErrors({});
    try {
      const payload: CreateQuickClientDTO = {
        name: name.trim(),
        platformId,
        email: email.trim() || undefined,
        company: company.trim() || undefined,
        phone: phone.trim() || undefined,
        country: country.trim() || undefined,
        website: website.trim() || undefined,
        contactNotes: contactNotes.trim() || undefined,
      };
      const res = await api.post("/projects/lookups/clients", payload);
      const created = res?.data || res;
      toast.success(`Client "${created.name}" created successfully`);
      onOpenChange(false);
      onSuccess(created);
    } catch (err: any) {
      const general = handleFormApiError(err, (field, errObj) => {
        setFieldErrors((prev) => ({ ...prev, [field]: errObj.message }));
      });
      toast.error(general || "Failed to create client");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-5">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <Building2 className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Add New Client Identity</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Client name & platform are required. Additional contact details are optional.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
          {/* Required: Client Name & Platform */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Client / Contact Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe, Sarah Connor"
                required
                className="h-9 text-xs"
                autoFocus
              />
              {fieldErrors.name && (
                <p className="text-[11px] text-destructive">{fieldErrors.name}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Origin Platform <span className="text-destructive">*</span>
              </Label>
              <Select value={platformId} onValueChange={(val: string | null) => setPlatformId(val || "")}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Platform">
                    {platforms.find((p) => p.id === platformId)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {platforms.map((pl) => (
                    <SelectItem key={pl.id} value={pl.id} className="text-xs">
                      {pl.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.platformId && (
                <p className="text-[11px] text-destructive">{fieldErrors.platformId}</p>
              )}
            </div>
          </div>

          {/* Optional: Email & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Client Email (Optional)
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
                className="h-9 text-xs"
              />
              {fieldErrors.email && (
                <p className="text-[11px] text-destructive">{fieldErrors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Phone / WhatsApp (Optional)
              </Label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Optional: Company & Country */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Company / Organization (Optional)
              </Label>
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Acme Corporation"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Country / Location (Optional)
              </Label>
              <Input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. United States, Germany..."
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Optional: Website */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">
              Website URL (Optional)
            </Label>
            <Input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://acme.com"
              className="h-9 text-xs"
            />
          </div>

          {/* Optional: Contact Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">
              Internal Notes & Preferences (Optional)
            </Label>
            <Textarea
              value={contactNotes}
              onChange={(e) => setContactNotes(e.target.value)}
              placeholder="Communication preferences, timezone, key stakeholders..."
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading} className="text-xs gap-1.5">
              {loading ? (
                <>
                  <Loader2 className="size-3 animate-spin" /> Creating...
                </>
              ) : (
                "Save Client"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
