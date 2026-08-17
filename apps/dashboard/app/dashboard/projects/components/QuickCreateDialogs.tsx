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
import type {
  PlatformItem,
  CreateQuickClientDTO,
  CreateQuickProfileDTO,
  CreateQuickPlatformDTO,
  CreateQuickServiceLineDTO,
  CreateQuickStatusDTO,
} from "@workspace/shared";
import {
  Building2,
  Globe,
  Layers,
  Activity,
  Loader2,
  Plus,
  Sparkles,
} from "lucide-react";

// ============================================================================
// 1. QUICK CREATE CLIENT DIALOG
// ============================================================================
interface QuickCreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platforms: PlatformItem[];
  defaultPlatformId?: string;
  onSuccess: (newClient: any) => void;
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
  const [contactNotes, setContactNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      setName("");
      setPlatformId(defaultPlatformId || platforms[0]?.id || "");
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
      setFieldErrors({ platformId: "Platform is required" });
      return;
    }

    setLoading(true);
    setFieldErrors({});
    try {
      const payload: CreateQuickClientDTO = {
        name: name.trim(),
        platformId,
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
      <DialogContent className="sm:max-w-md p-5">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <Building2 className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Add New Client</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Register a new client account identity and contact reference
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Client Name / Organization <span className="text-destructive">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Global Inc."
              required
              className="h-9 text-xs"
              autoFocus
            />
            {fieldErrors.name && (
              <p className="text-[11px] text-destructive">{fieldErrors.name}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Origin Platform <span className="text-destructive">*</span></Label>
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

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Contact Details & Internal Notes</Label>
            <Textarea
              value={contactNotes}
              onChange={(e) => setContactNotes(e.target.value)}
              placeholder="Contact email, phone, Slack handle, timezone, etc."
              rows={3}
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

// ============================================================================
// 2. QUICK CREATE PROFILE DIALOG
// ============================================================================
interface QuickCreateProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platforms: PlatformItem[];
  defaultPlatformId?: string;
  onSuccess: (newProfile: any) => void;
}

export function QuickCreateProfileDialog({
  open,
  onOpenChange,
  platforms,
  defaultPlatformId,
  onSuccess,
}: QuickCreateProfileDialogProps) {
  const [username, setUsername] = React.useState("");
  const [platformId, setPlatformId] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      setUsername("");
      setPlatformId(defaultPlatformId || platforms[0]?.id || "");
      setFieldErrors({});
    }
  }, [open, defaultPlatformId, platforms]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setFieldErrors({ username: "Username / handle is required" });
      return;
    }
    if (!platformId) {
      setFieldErrors({ platformId: "Platform is required" });
      return;
    }

    setLoading(true);
    setFieldErrors({});
    try {
      const payload: CreateQuickProfileDTO = {
        username: username.trim(),
        platformId,
        isActive: true,
      };
      const res = await api.post("/projects/lookups/profiles", payload);
      const created = res?.data || res;
      toast.success(`Account Profile "${created.username}" registered`);
      onOpenChange(false);
      onSuccess(created);
    } catch (err: any) {
      const general = handleFormApiError(err, (field, errObj) => {
        setFieldErrors((prev) => ({ ...prev, [field]: errObj.message }));
      });
      toast.error(general || "Failed to create profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-5">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <Globe className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Add Account Profile</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Link an agency/freelancer seller profile on a platform
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Origin Platform <span className="text-destructive">*</span></Label>
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

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Profile Username / Handle <span className="text-destructive">*</span>
            </Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. Softvence_Upwork"
              required
              className="h-9 text-xs"
              autoFocus
            />
            {fieldErrors.username && (
              <p className="text-[11px] text-destructive">{fieldErrors.username}</p>
            )}
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
                "Save Profile"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 3. QUICK CREATE PLATFORM DIALOG
// ============================================================================
interface QuickCreatePlatformDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newPlatform: any) => void;
}

export function QuickCreatePlatformDialog({
  open,
  onOpenChange,
  onSuccess,
}: QuickCreatePlatformDialogProps) {
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      setName("");
      setCode("");
      setFieldErrors({});
    }
  }, [open]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    setCode(val.toUpperCase().replace(/[^A-Z0-9]/g, "_"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFieldErrors({ name: "Platform name is required" });
      return;
    }

    setLoading(true);
    setFieldErrors({});
    try {
      const payload: CreateQuickPlatformDTO = {
        name: name.trim(),
        code: code.trim() || undefined,
      };
      const res = await api.post("/projects/lookups/platforms", payload);
      const created = res?.data || res;
      toast.success(`Platform "${created.name}" created`);
      onOpenChange(false);
      onSuccess(created);
    } catch (err: any) {
      const general = handleFormApiError(err, (field, errObj) => {
        setFieldErrors((prev) => ({ ...prev, [field]: errObj.message }));
      });
      toast.error(general || "Failed to create platform");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-5">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
              <Globe className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Add Origin Platform</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Register a new client acquisition channel or marketplace
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Platform Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={name}
              onChange={handleNameChange}
              placeholder="e.g. LinkedIn Leads"
              required
              className="h-9 text-xs"
              autoFocus
            />
            {fieldErrors.name && (
              <p className="text-[11px] text-destructive">{fieldErrors.name}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Identifier Code</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. LINKEDIN_LEADS"
              className="h-9 text-xs font-mono"
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
                "Save Platform"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 4. QUICK CREATE SERVICE LINE DIALOG
// ============================================================================
interface QuickCreateServiceLineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newServiceLine: any) => void;
}

export function QuickCreateServiceLineDialog({
  open,
  onOpenChange,
  onSuccess,
}: QuickCreateServiceLineDialogProps) {
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      setName("");
      setSlug("");
      setFieldErrors({});
    }
  }, [open]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFieldErrors({ name: "Service line name is required" });
      return;
    }

    setLoading(true);
    setFieldErrors({});
    try {
      const payload: CreateQuickServiceLineDTO = {
        name: name.trim(),
        slug: slug.trim() || undefined,
      };
      const res = await api.post("/projects/lookups/service-lines", payload);
      const created = res?.data || res;
      toast.success(`Service Line "${created.name}" created`);
      onOpenChange(false);
      onSuccess(created);
    } catch (err: any) {
      const general = handleFormApiError(err, (field, errObj) => {
        setFieldErrors((prev) => ({ ...prev, [field]: errObj.message }));
      });
      toast.error(general || "Failed to create service line");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-5">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <Layers className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Add Service Line</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Categorize technical domain (e.g. AI Engineering, DevOps)
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Service Line Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={name}
              onChange={handleNameChange}
              placeholder="e.g. Cybersecurity Audit"
              required
              className="h-9 text-xs"
              autoFocus
            />
            {fieldErrors.name && (
              <p className="text-[11px] text-destructive">{fieldErrors.name}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Slug Identifier</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              placeholder="e.g. cybersecurity-audit"
              className="h-9 text-xs font-mono"
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
                "Save Service Line"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 5. QUICK CREATE PROJECT STATUS DIALOG
// ============================================================================
interface QuickCreateStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newStatus: any) => void;
}

export function QuickCreateStatusDialog({
  open,
  onOpenChange,
  onSuccess,
}: QuickCreateStatusDialogProps) {
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [color, setColor] = React.useState("#3b82f6");
  const [requiresAction, setRequiresAction] = React.useState(false);
  const [isTerminal, setIsTerminal] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      setName("");
      setCode("");
      setColor("#3b82f6");
      setRequiresAction(false);
      setIsTerminal(false);
      setFieldErrors({});
    }
  }, [open]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    setCode(val.toUpperCase().replace(/[^A-Z0-9]/g, "_"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFieldErrors({ name: "Status name is required" });
      return;
    }

    setLoading(true);
    setFieldErrors({});
    try {
      const payload: CreateQuickStatusDTO = {
        name: name.trim(),
        code: code.trim() || undefined,
        color,
        requiresAction,
        isTerminal,
      };
      const res = await api.post("/projects/lookups/statuses", payload);
      const created = res?.data || res;
      toast.success(`Project Status "${created.name}" created`);
      onOpenChange(false);
      onSuccess(created);
    } catch (err: any) {
      const general = handleFormApiError(err, (field, errObj) => {
        setFieldErrors((prev) => ({ ...prev, [field]: errObj.message }));
      });
      toast.error(general || "Failed to create status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-5">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
              <Activity className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Add Project Status</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Define a lifecycle status with behavioral flags
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Status Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={name}
              onChange={handleNameChange}
              placeholder="e.g. Under Client Review"
              required
              className="h-9 text-xs"
              autoFocus
            />
            {fieldErrors.name && (
              <p className="text-[11px] text-destructive">{fieldErrors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Code</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. CLIENT_REVIEW"
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Theme Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="size-9 rounded-md border cursor-pointer p-0.5"
                />
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t">
            <label className="flex items-center gap-2 p-2 rounded-lg border bg-muted/20 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={requiresAction}
                onChange={(e) => setRequiresAction(e.target.checked)}
                className="rounded border-input text-primary"
              />
              <span>Requires Action</span>
            </label>

            <label className="flex items-center gap-2 p-2 rounded-lg border bg-muted/20 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={isTerminal}
                onChange={(e) => setIsTerminal(e.target.checked)}
                className="rounded border-input text-primary"
              />
              <span>Terminal State</span>
            </label>
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
                "Save Status"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
