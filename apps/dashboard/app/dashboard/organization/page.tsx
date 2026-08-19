"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  GitBranch,
  Building2,
  Users,
  ShieldCheck,
  Plus,
  RefreshCw,
  LayoutList,
  Network,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { UnifiedOrgNode, OrgNodeType, OrganizationStructureResponse } from "@workspace/shared";
import { RouteGuard } from "@/components/permission-gate/RouteGuard";
import { PermissionGate } from "@/components/permission-gate/PermissionGate";
import { DataTableToolbar } from "@/components/data-table";
import { UnifiedOrgTable } from "./components/UnifiedOrgTable";
import { UnifiedOrgChart } from "./components/UnifiedOrgChart";
import {
  ContextualCreateModal,
  ContextualEditModal,
  ContextualAssignLeadModal,
  ContextualDeleteDialog,
} from "./components/modals";

export default function OrganizationPage() {
  return (
    <RouteGuard code="auth.user.view">
      <OrganizationContent />
    </RouteGuard>
  );
}

function OrganizationContent() {
  const [data, setData] = React.useState<OrganizationStructureResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<"all" | "BRANCH" | "DEPARTMENT" | "TEAM">("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [viewMode, setViewMode] = React.useState<"tree" | "chart">("tree");

  // Modal States
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [createTargetParent, setCreateTargetParent] = React.useState<UnifiedOrgNode | null>(null);
  const [createDefaultType, setCreateDefaultType] = React.useState<OrgNodeType>("BRANCH");

  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [assignLeadModalOpen, setAssignLeadModalOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedNode, setSelectedNode] = React.useState<UnifiedOrgNode | null>(null);

  const fetchStructure = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/organization/structure");
      setData(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to load organization structure");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchStructure();
  }, [fetchStructure]);

  // Contextual Modal Triggers
  const handleAddChild = (parentNode: UnifiedOrgNode, childType: OrgNodeType) => {
    setCreateTargetParent(parentNode);
    setCreateDefaultType(childType);
    setCreateModalOpen(true);
  };

  const handleOpenCreateRoot = () => {
    setCreateTargetParent(null);
    setCreateDefaultType("BRANCH");
    setCreateModalOpen(true);
  };

  const handleEdit = (node: UnifiedOrgNode) => {
    setSelectedNode(node);
    setEditModalOpen(true);
  };

  const handleAssignLeadership = (node: UnifiedOrgNode) => {
    setSelectedNode(node);
    setAssignLeadModalOpen(true);
  };

  const handleDelete = (node: UnifiedOrgNode) => {
    setSelectedNode(node);
    setDeleteDialogOpen(true);
  };

  // Filter tree nodes
  const filteredNodes = React.useMemo(() => {
    if (!data?.tree) return [];

    const filterNode = (node: UnifiedOrgNode): UnifiedOrgNode | null => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (node.description && node.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
            ? node.isActive
            : !node.isActive;

      const filteredChildren: UnifiedOrgNode[] = [];
      if (node.children) {
        node.children.forEach((c) => {
          const childFiltered = filterNode(c);
          if (childFiltered) filteredChildren.push(childFiltered);
        });
      }

      const matchesSelf = matchesSearch && matchesStatus;

      if (matchesSelf || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
        };
      }

      return null;
    };

    return data.tree.map(filterNode).filter(Boolean) as UnifiedOrgNode[];
  }, [data, searchQuery, statusFilter]);

  const summary = data?.summary || {
    totalBranches: 0,
    activeBranches: 0,
    totalDepartments: 0,
    activeDepartments: 0,
    totalTeams: 0,
    activeTeams: 0,
    totalLeadership: 0,
  };

  return (
    <div className="space-y-6 min-w-0 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Network className="size-6 text-primary" /> Organization Structure
          </h1>
          <p className="text-xs text-muted-foreground">
            Unified management of Betopia Group corporate branches, functional departments, squads, and leadership.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => fetchStructure()}>
            <RefreshCw className="mr-2 size-4" /> Refresh
          </Button>

          <PermissionGate code="organization.branch.manage">
            <Button size="sm" onClick={handleOpenCreateRoot}>
              <Plus className="mr-2 size-4" /> Add Unit
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Enterprise Branches</p>
              <h3 className="text-2xl font-bold mt-1 text-indigo-600 dark:text-indigo-400">{summary.totalBranches}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {summary.activeBranches} Active subsidiaries
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <GitBranch className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Departments</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{summary.totalDepartments}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {summary.activeDepartments} Active divisions
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Building2 className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Team Squads</p>
              <h3 className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">{summary.totalTeams}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {summary.activeTeams} Active operational squads
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Users className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Active Leadership</p>
              <h3 className="text-2xl font-bold mt-1 text-purple-600 dark:text-purple-400">{summary.totalLeadership}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Managers & Lead directors
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <ShieldCheck className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center border rounded-xl bg-card">
          <RefreshCw className="size-6 animate-spin text-muted-foreground mb-2" />
          <span className="text-xs text-muted-foreground">Loading enterprise structure...</span>
        </div>
      ) : viewMode === "tree" ? (
        <UnifiedOrgTable
          nodes={filteredNodes}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onAddChild={handleAddChild}
          onEdit={handleEdit}
          onAssignLeadership={handleAssignLeadership}
          onDelete={handleDelete}
        />
      ) : (
        <div className="space-y-4">
          {/* Unified Toolbar for Chart View */}
          <DataTableToolbar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search branches, departments, teams, or codes..."
            onReset={() => {
              setSearchQuery("");
              setTypeFilter("all");
              setStatusFilter("all");
            }}
            isFiltered={Boolean((searchQuery && searchQuery.trim() !== "") || typeFilter !== "all" || statusFilter !== "all")}
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
                All
              </Button>
              <Button
                variant={statusFilter === "active" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("active")}
                className="h-8 text-xs"
              >
                Active
              </Button>
              <Button
                variant={statusFilter === "inactive" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("inactive")}
                className="h-8 text-xs"
              >
                Inactive
              </Button>
            </div>
          </DataTableToolbar>

          <UnifiedOrgChart
            nodes={filteredNodes}
            onAddChild={handleAddChild}
            onEdit={handleEdit}
            onAssignLeadership={handleAssignLeadership}
            onDelete={handleDelete}
          />
        </div>
      )}

      {/* Contextual Create Modal */}
      <ContextualCreateModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        targetParentNode={createTargetParent}
        defaultType={createDefaultType}
        allNodes={data?.tree || []}
        onSuccess={fetchStructure}
      />

      {/* Contextual Edit Modal */}
      <ContextualEditModal
        node={selectedNode}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        allNodes={data?.tree || []}
        onSuccess={fetchStructure}
      />

      {/* Contextual Assign Leadership Modal */}
      <ContextualAssignLeadModal
        node={selectedNode}
        open={assignLeadModalOpen}
        onOpenChange={setAssignLeadModalOpen}
        onSuccess={fetchStructure}
      />

      {/* Contextual Delete Dialog */}
      <ContextualDeleteDialog
        node={selectedNode}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onSuccess={fetchStructure}
      />
    </div>
  );
}
