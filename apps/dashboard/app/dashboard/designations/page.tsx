"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { Plus, RefreshCw, Lock } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { DesignationTable, type DesignationItem } from "./components/DesignationTable";
import { CreateDesignationModal } from "./components/CreateDesignationModal";
import { EditDesignationModal } from "./components/EditDesignationModal";
import { DeleteDesignationDialog } from "./components/DeleteDesignationDialog";

export default function DesignationsPage() {
  const [designations, setDesignations] = React.useState<DesignationItem[]>([]);
  const [departments, setDepartments] = React.useState<{ id: string; name: string; code: string }[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Modals
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [editInitialTab, setEditInitialTab] = React.useState<"details" | "permissions">("details");
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedDesignation, setSelectedDesignation] = React.useState<DesignationItem | null>(null);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [resDesig, resDepts] = await Promise.all([
        api.get("/organization/designations"),
        api.get("/organization/departments"),
      ]);
      setDesignations(resDesig || []);
      setDepartments(resDepts || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load designations data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = (desig: DesignationItem, initialTab: "details" | "permissions" = "details") => {
    setSelectedDesignation(desig);
    setEditInitialTab(initialTab);
    setEditModalOpen(true);
  };

  const handleDelete = (desig: DesignationItem) => {
    setSelectedDesignation(desig);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Lock className="size-6 text-primary" /> Designations & Permission Matrix
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage organizational roles and configure fine-grained permission scope matrix assignments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchData()}>
            <RefreshCw className="mr-2 size-4" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setCreateModalOpen(true)}>
            <Plus className="mr-2 size-4" /> Add Designation
          </Button>
        </div>
      </div>

      {/* Designation Table */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center border rounded-xl bg-card">
          <RefreshCw className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <DesignationTable
          designations={designations}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Create Designation Modal */}
      <CreateDesignationModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        departments={departments}
        onSuccess={fetchData}
      />

      {/* Edit Designation Modal */}
      <EditDesignationModal
        designation={selectedDesignation}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        departments={departments}
        initialTab={editInitialTab}
        onSuccess={fetchData}
      />

      {/* Delete Designation Dialog */}
      <DeleteDesignationDialog
        designation={selectedDesignation}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onSuccess={fetchData}
      />
    </div>
  );
}
