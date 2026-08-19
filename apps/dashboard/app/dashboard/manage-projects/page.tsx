"use client";

import * as React from "react";
import { RouteGuard } from "@/components/permission-gate/RouteGuard";
import { ManageProjectWorkspace } from "../projects/components/manage-workspace/ManageProjectWorkspace";
import { CreateProjectModal } from "../projects/components/CreateProjectModal";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import type { ProjectLookups } from "@workspace/shared";

export default function ManageProjectsPage() {
  return (
    <RouteGuard code="project.view">
      <React.Suspense fallback={<div className="p-6 text-xs text-muted-foreground">Loading workspace...</div>}>
        <ManageProjectsContent />
      </React.Suspense>
    </RouteGuard>
  );
}

function ManageProjectsContent() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get("projectId");
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [lookups, setLookups] = React.useState<ProjectLookups | null>(null);

  const fetchLookups = React.useCallback(async () => {
    try {
      const res = await api.get("/projects/lookups");
      setLookups(res?.data || res);
    } catch (err) {
      console.error("Failed to load lookups:", err);
    }
  }, []);

  React.useEffect(() => {
    fetchLookups();
  }, [fetchLookups]);

  return (
    <div className="-m-4 sm:-m-6 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden bg-background">
      <ManageProjectWorkspace
        initialProjectId={projectIdParam}
        onNewProject={() => setCreateModalOpen(true)}
      />

      <CreateProjectModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        lookups={lookups}
        onSuccess={() => {
          setCreateModalOpen(false);
        }}
        onRefreshLookups={fetchLookups}
      />
    </div>
  );
}
