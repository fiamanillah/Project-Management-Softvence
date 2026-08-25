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
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { useTaskStore } from "../../data/task-store";
import { Zap } from "lucide-react";

export function CreateSprintModal() {
  const {
    createSprintModalOpen,
    setCreateSprintModalOpen,
    createSprint,
    sprints,
  } = useTaskStore();

  const nextNum = sprints.length + 13;
  const [name, setName] = React.useState(`Sprint ${nextNum}: Core Features & Optimization`);
  const [duration, setDuration] = React.useState("2_WEEKS");
  const [startDate, setStartDate] = React.useState(new Date().toISOString().split("T")[0] ?? "2026-08-20");
  
  // Calculate end date based on duration
  const calculateEndDate = (start: string, dur: string) => {
    const d = new Date(start);
    const days = dur === "1_WEEK" ? 7 : dur === "3_WEEKS" ? 21 : dur === "4_WEEKS" ? 28 : 14;
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0] ?? "2026-09-03";
  };

  const [endDate, setEndDate] = React.useState(() => calculateEndDate(startDate, "2_WEEKS"));
  const [goal, setGoal] = React.useState("");

  React.useEffect(() => {
    if (createSprintModalOpen) {
      const today = new Date().toISOString().split("T")[0] ?? "2026-08-20";
      setName(`Sprint ${nextNum}: Features & Improvements`);
      setStartDate(today);
      setEndDate(calculateEndDate(today, duration));
      setGoal("");
    }
  }, [createSprintModalOpen, nextNum, duration]);

  const handleDurationChange = (val: string | null) => {
    if (val !== null) {
      setDuration(val);
      setEndDate(calculateEndDate(startDate, val));
    }
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    setEndDate(calculateEndDate(val, duration));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createSprint({
      name: name.trim(),
      goal: goal.trim() || undefined,
      startDate,
      endDate,
    });

    setCreateSprintModalOpen(false);
  };

  return (
    <Dialog open={createSprintModalOpen} onOpenChange={setCreateSprintModalOpen}>
      <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-[540px] bg-background border border-border/80 rounded-2xl shadow-xl p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Create Agile Sprint
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          {/* Sprint Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-foreground">
              Sprint Name <span className="text-destructive">*</span>
            </label>
            <Input
              required
              placeholder="e.g. Sprint 15: Checkout & Analytics"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-xs bg-background"
              autoFocus
            />
          </div>

          {/* Duration */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-foreground">
              Sprint Duration
            </label>
            <Select value={duration} onValueChange={handleDurationChange}>
              <SelectTrigger className="h-9 text-xs bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1_WEEK">1 Week</SelectItem>
                <SelectItem value="2_WEEKS">2 Weeks (Standard)</SelectItem>
                <SelectItem value="3_WEEKS">3 Weeks</SelectItem>
                <SelectItem value="4_WEEKS">4 Weeks (Monthly)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dates Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-foreground">
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="text-xs bg-background"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-foreground">
                End Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs bg-background"
              />
            </div>
          </div>

          {/* Sprint Goal */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-foreground">
              Sprint Goal
            </label>
            <Textarea
              placeholder="What is the team aiming to achieve this sprint?"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={3}
              className="text-xs bg-background resize-none leading-relaxed"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateSprintModalOpen(false)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4"
            >
              Create Sprint
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
