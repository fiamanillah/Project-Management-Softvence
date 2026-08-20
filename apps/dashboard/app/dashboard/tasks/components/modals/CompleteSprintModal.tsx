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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { useTaskStore } from "../../data/task-store";
import { CheckCircle2, AlertTriangle } from "lucide-react";

export function CompleteSprintModal() {
  const {
    completeSprintModalOpen,
    setCompleteSprintModalOpen,
    activeSprintForCompletion,
    sprints,
    tasks,
    completeSprint,
  } = useTaskStore();

  const sprintTasks = React.useMemo(() => {
    if (!activeSprintForCompletion) return [];
    return tasks.filter((t) => t.sprintId === activeSprintForCompletion.id);
  }, [tasks, activeSprintForCompletion]);

  const completedTasks = sprintTasks.filter((t) => t.status === "DONE");
  const openTasks = sprintTasks.filter((t) => t.status !== "DONE");

  const completedPoints = completedTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const openPoints = openTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  const plannedSprints = sprints.filter(
    (s) => s.status === "PLANNED" && s.id !== activeSprintForCompletion?.id
  );

  const [rolloverTarget, setRolloverTarget] = React.useState<string>(() => {
    const first = plannedSprints[0];
    return first ? first.id : "BACKLOG";
  });

  if (!activeSprintForCompletion) return null;

  const handleComplete = () => {
    completeSprint(
      activeSprintForCompletion.id,
      rolloverTarget === "BACKLOG" ? null : rolloverTarget
    );
    setCompleteSprintModalOpen(false);
  };

  return (
    <Dialog open={completeSprintModalOpen} onOpenChange={setCompleteSprintModalOpen}>
      <DialogContent className="sm:max-w-none min-w-[min(92vw,560px)] bg-background border border-border/80 rounded-2xl shadow-xl p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            Complete {activeSprintForCompletion.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Summary Box */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col items-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
              <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
                Completed
              </span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-300">
                {completedTasks.length} tasks
              </span>
              <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 font-medium">
                {completedPoints} story points
              </span>
            </div>

            <div className="flex flex-col items-center rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-center">
              <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400">
                Open / Incomplete
              </span>
              <span className="text-lg font-bold text-amber-600 dark:text-amber-300">
                {openTasks.length} tasks
              </span>
              <span className="text-[11px] text-amber-700/80 dark:text-amber-400/80 font-medium">
                {openPoints} story points
              </span>
            </div>
          </div>

          {/* Rollover destination selector */}
          {openTasks.length > 0 && (
            <div className="flex flex-col gap-2 rounded-xl bg-muted/40 p-3.5 border border-border/60">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span>Move {openTasks.length} open issues to:</span>
              </div>

              <Select
                value={rolloverTarget}
                onValueChange={(val) => {
                  if (val !== null) setRolloverTarget(val);
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BACKLOG">📦 Product Backlog</SelectItem>
                  {plannedSprints.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      ⚡ Next: {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            Completing this sprint will archive its metrics and update team velocity records.
          </p>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCompleteSprintModalOpen(false)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleComplete}
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Complete Sprint</span>
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
