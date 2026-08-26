"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { useTaskStore } from "../../data/task-store";
import { GitFork } from "lucide-react";
import { WorkflowEditor } from "../shared/WorkflowEditor";

export function WorkflowManagerModal() {
  const { workflowManagerModalOpen, setWorkflowManagerModalOpen } = useTaskStore();

  return (
    <Dialog open={workflowManagerModalOpen} onOpenChange={setWorkflowManagerModalOpen}>
      <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-2xl max-h-[85vh] overflow-y-auto bg-background border border-border/80 rounded-2xl shadow-xl p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <GitFork className="h-5 w-5 text-primary" />
            Task Workflow & Status Lifecycle Manager
          </DialogTitle>
        </DialogHeader>

        <div className="py-2">
          <WorkflowEditor showSchemeSelector={false} />
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setWorkflowManagerModalOpen(false)}
            className="h-8 text-xs font-semibold"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
