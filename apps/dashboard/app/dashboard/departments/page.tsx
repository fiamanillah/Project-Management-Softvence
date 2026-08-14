"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Building2,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Shield,
  UserCheck,
  GitFork,
  LayoutList,
  Network,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { DepartmentItem } from "@workspace/shared";
import { RouteGuard } from "@/components/permission-gate/RouteGuard";
import { PermissionGate } from "@/components/permission-gate/PermissionGate";
import { DepartmentTable } from "./components/DepartmentTable";
import { DepartmentOrgChart } from "./components/DepartmentOrgChart";
import { CreateDepartmentModal } from "./components/CreateDepartmentModal";
import { EditDepartmentModal } from "./components/EditDepartmentModal";
import { AssignManagerModal } from "./components/AssignManagerModal";
import { DeleteDepartmentDialog } from "./components/DeleteDepartmentDialog";

export default function DepartmentsPage() {
  return (
    <RouteGuard code="organization.department.view">
      <DepartmentsContent />
    </RouteGuard>
  );
}

function DepartmentsContent() {
  const [departments, setDepartments] = React.useState<DepartmentItem[]>([]);
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

  const [selectedDepartment, setSelectedDepartment] = React.useState<DepartmentItem | null>(null);

  const fetchDepartments = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/organization/departments");
      setDepartments(res || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load departments");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleEdit = (dept: DepartmentItem) => {
    setSelectedDepartment(dept);
    setEditModalOpen(true);
  };

  const handleAssignManager = (dept: DepartmentItem) => {
    setSelectedDepartment(dept);
    setAssignModalOpen(true);
  };

  const handleAddSubDepartment = (parentDept: DepartmentItem) => {
    setSelectedParentId(parentDept.id);
    setCreateModalOpen(true);
  };

  const handleOpenCreateRoot = () => {
    setSelectedParentId(null);
    setCreateModalOpen(true);
  };

  const handleDelete = (dept: DepartmentItem) => {
    setSelectedDepartment(dept);
    setDeleteDialogOpen(true);
  };

  // Filter logic
  const filteredDepartments = React.useMemo(() => {
    return departments.filter((dept) => {
      const matchesSearch =
        dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dept.code.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
            ? dept.isActive
            : !dept.isActive;

      return matchesSearch && matchesStatus;
    });
  }, [departments, searchQuery, statusFilter]);

  // Analytics counts
  const totalDepts = departments.length;
  const rootDepts = departments.filter((d) => !d.parentId).length;
  const subDepts = departments.filter((d) => Boolean(d.parentId)).length;
  const activeDepts = departments.filter((d) => d.isActive).length;
  const totalDesignations = departments.reduce((acc, curr) => acc + (curr._count?.designations || 0), 0);
  const totalManagers = departments.filter((d) => d.managers && d.managers.some((m) => !m.unassignedAt)).length;

  return (
    <div className="space-y-6 min-w-0 max-w-full overflow-hidden">
      {/* Header */}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="size-6 text-primary" /> Department & Hierarchy
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage organizational root divisions, nested sub-departments, leadership, and operational units.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => fetchDepartments()}>
            <RefreshCw className="mr-2 size-4" /> Refresh
          </Button>

          <PermissionGate code="organization.department.manage">
            <Button size="sm" onClick={handleOpenCreateRoot}>
              <Plus className="mr-2 size-4" /> Add Department
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Units</p>
              <h3 className="text-2xl font-bold mt-1">{totalDepts}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {rootDepts} Root &bull; {subDepts} Sub-units
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <Building2 className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Active Status</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{activeDepts}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {totalDepts - activeDepts} Inactive units
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
              <p className="text-xs font-medium text-muted-foreground">Sub-Departments</p>
              <h3 className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">{subDepts}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Nested in {rootDepts} divisions
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <GitFork className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Leadership Assigned</p>
              <h3 className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">{totalManagers}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Across {totalDesignations} designations
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <UserCheck className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and View Switcher Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search code or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
              className="h-8 text-xs"
            >
              All ({departments.length})
            </Button>
            <Button
              variant={statusFilter === "active" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("active")}
              className="h-8 text-xs"
            >
              Active ({activeDepts})
            </Button>
            <Button
              variant={statusFilter === "inactive" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("inactive")}
              className="h-8 text-xs"
            >
              Inactive ({totalDepts - activeDepts})
            </Button>
          </div>

          <div className="h-4 w-px bg-border hidden sm:block" />

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
            <Button
              variant={viewMode === "tree" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("tree")}
              className={`h-7 text-xs px-2.5 gap-1.5 ${viewMode === "tree" ? "shadow-2xs font-semibold" : "text-muted-foreground"}`}
            >
              <LayoutList className="size-3.5" />
              <span>Tree Table</span>
            </Button>
            <Button
              variant={viewMode === "chart" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("chart")}
              className={`h-7 text-xs px-2.5 gap-1.5 ${viewMode === "chart" ? "shadow-2xs font-semibold" : "text-muted-foreground"}`}
            >
              <Network className="size-3.5" />
              <span>Org Chart</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center border rounded-xl bg-card">
          <RefreshCw className="size-6 animate-spin text-muted-foreground mb-2" />
          <span className="text-xs text-muted-foreground">Loading departments...</span>
        </div>
      ) : viewMode === "tree" ? (
        <DepartmentTable
          departments={filteredDepartments}
          onEdit={handleEdit}
          onAssignManager={handleAssignManager}
          onAddSubDepartment={handleAddSubDepartment}
          onDelete={handleDelete}
        />
      ) : (
        <DepartmentOrgChart
          departments={filteredDepartments}
          onEdit={handleEdit}
          onAssignManager={handleAssignManager}
          onAddSubDepartment={handleAddSubDepartment}
          onDelete={handleDelete}
        />
      )}

      {/* Create Department Modal */}
      <CreateDepartmentModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        departments={departments}
        defaultParentId={selectedParentId}
        onSuccess={fetchDepartments}
      />

      {/* Edit Department Modal */}
      <EditDepartmentModal
        department={selectedDepartment}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        departments={departments}
        onSuccess={fetchDepartments}
      />

      {/* Assign Manager Modal */}
      <AssignManagerModal
        department={selectedDepartment}
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        onSuccess={fetchDepartments}
      />

      {/* Delete Department Dialog */}
      <DeleteDepartmentDialog
        department={selectedDepartment}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onSuccess={fetchDepartments}
      />
    </div>
  );
}
