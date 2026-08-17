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
import { Badge } from "@workspace/ui/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type {
  ProjectItem,
  ProjectLookups,
  CreateProjectComponentDTO,
} from "@workspace/shared";
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  CheckCircle2,
} from "lucide-react";

interface ManageComponentsModalProps {
  project: ProjectItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lookups: ProjectLookups | null;
  onSuccess: () => void;
}

export function ManageComponentsModal({
  project,
  open,
  onOpenChange,
  lookups,
  onSuccess,
}: ManageComponentsModalProps) {
  const [components, setComponents] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  // New component draft
  const [newName, setNewName] = React.useState("");
  const [newStatusId, setNewStatusId] = React.useState("");

  // Edit state
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editStatusId, setEditStatusId] = React.useState("");

  React.useEffect(() => {
    if (open && project) {
      setComponents(project.components || []);
      setNewName("");
      setNewStatusId(lookups?.statuses[0]?.id || "");
      setEditingId(null);
    }
  }, [open, project, lookups]);

  if (!project) return null;

  const handleAddComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setLoading(true);
    try {
      const payload: CreateProjectComponentDTO = {
        name: newName.trim(),
        statusId: newStatusId || lookups?.statuses[0]?.id || "",
      };

      const res = await api.post(`/projects/${project.id}/components`, payload);
      toast.success("Component added successfully");
      setNewName("");
      setComponents(res?.components || (res?.data?.components) || []);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to add component");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateComponent = async (componentId: string) => {
    if (!editName.trim()) return;

    setLoading(true);
    try {
      const res = await api.patch(`/projects/${project.id}/components/${componentId}`, {
        name: editName.trim(),
        statusId: editStatusId,
      });
      toast.success("Component updated");
      setEditingId(null);
      setComponents(res?.components || (res?.data?.components) || []);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to update component");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComponent = async (componentId: string) => {
    setLoading(true);
    try {
      const res = await api.delete(`/projects/${project.id}/components/${componentId}`);
      toast.success("Component removed");
      setComponents(res?.components || (res?.data?.components) || []);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete component");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <Layers className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Project Components</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Break down project deliverables into distinct components & sub-systems
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Add New Component Form */}
          <form onSubmit={handleAddComponent} className="p-3.5 bg-muted/30 rounded-xl border space-y-3">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Plus className="size-3.5 text-primary" /> Add New Component
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-7">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Component Name (e.g. Auth Service)"
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="sm:col-span-5 flex gap-2">
                <Select value={newStatusId} onValueChange={(val: string | null) => setNewStatusId(val || "")}>
                  <SelectTrigger className="h-9 text-xs flex-1">
                    <SelectValue placeholder="Status">
                      {lookups?.statuses.find((st) => st.id === newStatusId)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {lookups?.statuses.map((st) => (
                      <SelectItem key={st.id} value={st.id} className="text-xs">
                        {st.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button type="submit" disabled={loading || !newName.trim()} className="h-9 text-xs shrink-0">
                  <Plus className="size-3.5 mr-1" /> Add
                </Button>
              </div>
            </div>
          </form>

          {/* List of Components */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Existing Components ({components.length})
            </Label>

            {components.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto p-1 bg-muted/20 rounded-lg border">
                {components.map((comp) => {
                  const isEditing = editingId === comp.id;

                  if (isEditing) {
                    return (
                      <div
                        key={comp.id}
                        className="p-2.5 bg-card rounded-lg border space-y-2"
                      >
                        <div className="flex gap-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-8 text-xs flex-1"
                          />
                          <Select value={editStatusId} onValueChange={(val: string | null) => setEditStatusId(val || "")}>
                            <SelectTrigger className="h-8 text-xs w-32">
                              <SelectValue>
                                {lookups?.statuses.find((st) => st.id === editStatusId)?.name}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {lookups?.statuses.map((st) => (
                                <SelectItem key={st.id} value={st.id} className="text-xs">
                                  {st.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                            className="h-7 text-xs"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleUpdateComponent(comp.id)}
                            disabled={loading}
                            className="h-7 text-xs"
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={comp.id}
                      className="flex items-center justify-between p-2.5 bg-card rounded-lg border text-xs gap-2"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Layers className="size-3.5 text-primary shrink-0" />
                        <span className="font-medium text-foreground truncate">{comp.name}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-medium"
                          style={{
                            borderColor: comp.status?.color ? `${comp.status.color}40` : undefined,
                            backgroundColor: comp.status?.color ? `${comp.status.color}15` : undefined,
                            color: comp.status?.color || undefined,
                          }}
                        >
                          {comp.status?.name || "Status"}
                        </Badge>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingId(comp.id);
                            setEditName(comp.name);
                            setEditStatusId(comp.statusId);
                          }}
                          className="size-7 text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="size-3" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteComponent(comp.id)}
                          className="size-7 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic p-4 text-center bg-muted/10 rounded-lg border">
                No components created yet for this project.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="pt-3 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
