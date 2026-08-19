"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  GitBranch,
  Plus,
  RefreshCw,
  CheckCircle2,
  UserCheck,
  Layers,
  Building2,
  LayoutList,
  Network,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { BranchItem } from "@workspace/shared";
import { RouteGuard } from "@/components/permission-gate/RouteGuard";
import { PermissionGate } from "@/components/permission-gate/PermissionGate";
import { DataTableToolbar } from "@/components/data-table";
import { BranchTable } from "./components/BranchTable";
import { BranchOrgChart } from "./components/BranchOrgChart";
import { CreateBranchModal } from "./components/CreateBranchModal";
import { EditBranchModal } from "./components/EditBranchModal";
import { AssignBranchManagerModal } from "./components/AssignBranchManagerModal";
import { DeleteBranchDialog } from "./components/DeleteBranchDialog";

export default function BranchesPage() {
  return (
    <RouteGuard code="auth.user.view">
      <BranchesContent />
    </RouteGuard>
  );
}

function BranchesContent() {
  const [branches, setBranches] = React.useState<BranchItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [viewMode, setViewMode] = React.useState<"tree" | "chart">("tree");

  // Modal States
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [selectedParentId, setSelectedParentId] = React.useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [assignModalOpen, setAssignModalOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  const [selectedBranch, setSelectedBranch] = React.useState<BranchItem | null>(null);

  const fetchBranches = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/organization/branches");
      const list: BranchItem[] = res || [];
      setBranches(list);
      setSelectedBranch((current) =>
        current ? list.find((b) => b.id === current.id) || current : null,
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to load branches");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const handleEdit = (branch: BranchItem) => {
    setSelectedBranch(branch);
    setEditModalOpen(true);
  };

  const handleAssignManager = (branch: BranchItem) => {
    setSelectedBranch(branch);
    setAssignModalOpen(true);
  };

  const handleAddSubBranch = (parentBranch: BranchItem) => {
    setSelectedParentId(parentBranch.id);
    setCreateModalOpen(true);
  };

  const handleOpenCreateRoot = () => {
    setSelectedParentId(null);
    setCreateModalOpen(true);
  };

  const handleDelete = (branch: BranchItem) => {
    setSelectedBranch(branch);
    setDeleteDialogOpen(true);
  };

  // Filter logic
  const filteredBranches = React.useMemo(() => {
    return branches.filter((branch) => {
      const matchesSearch =
        branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        branch.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (branch.description && branch.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
            ? branch.isActive
            : !branch.isActive;

      return matchesSearch && matchesStatus;
    });
  }, [branches, searchQuery, statusFilter]);

  // Analytics counts
  const totalBranches = branches.length;
  const rootBranches = branches.filter((b) => !b.parentId).length;
  const subBranches = branches.filter((b) => Boolean(b.parentId)).length;
  const activeBranches = branches.filter((b) => b.isActive).length;
  const totalHostedDepartments = branches.reduce((acc, curr) => acc + (curr._count?.departments || 0), 0);
  const totalManagers = branches.filter((b) => b.managers && b.managers.some((m) => !m.unassignedAt)).length;

  return (
    <div className="space-y-6 min-w-0 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <GitBranch className="size-6 text-primary" /> Branches & Subsidiaries
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage Betopia Group corporate branches, nested sub-hub hierarchies, leadership, and hosted units.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => fetchBranches()}>
            <RefreshCw className="mr-2 size-4" /> Refresh
          </Button>

          <PermissionGate code="organization.branch.manage">
            <Button size="sm" onClick={handleOpenCreateRoot}>
              <Plus className="mr-2 size-4" /> Add Branch
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Branches</p>
              <h3 className="text-2xl font-bold mt-1">{totalBranches}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {rootBranches} Primary &bull; {subBranches} Sub-Hubs
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <GitBranch className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Active Status</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{activeBranches}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {totalBranches - activeBranches} Inactive units
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Sub-Branches</p>
              <h3 className="text-2xl font-bold mt-1 text-purple-600 dark:text-purple-400">{subBranches}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Nested in {rootBranches} primary hubs
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Layers className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Hosted Departments</p>
              <h3 className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">{totalHostedDepartments}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Led by {totalManagers} managers
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Building2 className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area with Single Unified Toolbar */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center border rounded-xl bg-card">
          <RefreshCw className="size-6 animate-spin text-muted-foreground mb-2" />
          <span className="text-xs text-muted-foreground">Loading branches...</span>
        </div>
      ) : viewMode === "tree" ? (
        <BranchTable
          branches={filteredBranches}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          totalUnitsCount={totalBranches}
          activeUnitsCount={activeBranches}
          onEdit={handleEdit}
          onAssignManager={handleAssignManager}
          onAddSubBranch={handleAddSubBranch}
          onDelete={handleDelete}
        />
      ) : (
        <div className="space-y-4">
          {/* Unified Toolbar for Chart View */}
          <DataTableToolbar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search branch code, name, or purpose..."
            onReset={() => {
              setSearchQuery("");
              setStatusFilter("all");
            }}
            isFiltered={Boolean((searchQuery && searchQuery.trim() !== "") || statusFilter !== "all")}
            showViewOptions={false}
            actions={
              <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("tree")}
                  className="h-7 text-xs px-2.5 gap-1.5 text-muted-foreground"
                >
                  <LayoutList className="size-3.5" />
                  <span>Tree Table</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setViewMode("chart")}
                  className="h-7 text-xs px-2.5 gap-1.5 shadow-2xs font-semibold"
                >
                  <Network className="size-3.5" />
                  <span>Org Chart</span>
                </Button>
              </div>
            }
          >
            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
                className="h-8 text-xs"
              >
                All ({branches.length})
              </Button>
              <Button
                variant={statusFilter === "active" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("active")}
                className="h-8 text-xs"
              >
                Active ({activeBranches})
              </Button>
              <Button
                variant={statusFilter === "inactive" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("inactive")}
                className="h-8 text-xs"
              >
                Inactive ({totalBranches - activeBranches})
              </Button>
            </div>
          </DataTableToolbar>

          <BranchOrgChart
            branches={filteredBranches}
            onEdit={handleEdit}
            onAssignManager={handleAssignManager}
            onAddSubBranch={handleAddSubBranch}
            onDelete={handleDelete}
          />
        </div>
      )}

      {/* Create Branch Modal */}
      <CreateBranchModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        branches={branches}
        defaultParentId={selectedParentId}
        onSuccess={fetchBranches}
      />

      {/* Edit Branch Modal */}
      <EditBranchModal
        branch={selectedBranch}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        branches={branches}
        onSuccess={fetchBranches}
      />

      {/* Assign Manager Modal */}
      <AssignBranchManagerModal
        branch={selectedBranch}
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        onSuccess={fetchBranches}
      />

      {/* Delete Branch Dialog */}
      <DeleteBranchDialog
        branch={selectedBranch}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onSuccess={fetchBranches}
      />
    </div>
  );
}
