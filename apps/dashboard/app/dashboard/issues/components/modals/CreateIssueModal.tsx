"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/components/dialog"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Bug,
  Flame,
  AlertTriangle,
  Layers,
  Sparkles,
  ShieldAlert,
  Zap,
} from "lucide-react"
import { useIssueStore } from "../../data/issue-store"

export function CreateIssueModal() {
  const { createModalOpen, setCreateModalOpen, createIssue } = useIssueStore()

  const [title, setTitle] = React.useState("")
  const [content, setContent] = React.useState("")
  const [projectId, setProjectId] = React.useState("proj-fintech")
  const [priorityLevel, setPriorityLevel] = React.useState("2")
  const [issueType, setIssueType] = React.useState("Bug / Defect")
  const [os, setOs] = React.useState("")
  const [browser, setBrowser] = React.useState("")
  const [version, setVersion] = React.useState("")

  const projectMap: Record<string, string> = {
    "proj-fintech": "Nexus NeoBank Mobile App",
    "proj-crm": "Zenith CRM SaaS Platform",
    "proj-ecommerce": "Aura Luxury E-Commerce Portal",
    "proj-infra": "Multi-Cloud Kubernetes Migration",
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const level = parseInt(priorityLevel, 10)
    const priorityNameMap: Record<number, any> = {
      0: "P0 - Blocker",
      1: "P1 - Critical",
      2: "P2 - Major",
      3: "P3 - Minor",
      4: "P4 - Low",
    }

    createIssue({
      title: title.trim(),
      content: content.trim(),
      projectId,
      projectName: projectMap[projectId] || "Enterprise Project",
      priorityLevel: level,
      priorityName: priorityNameMap[level] || "P2 - Major",
      issueTypeName: issueType as any,
      environment: {
        os: os.trim() || undefined,
        browser: browser.trim() || undefined,
        version: version.trim() || undefined,
      },
    })

    // Reset
    setTitle("")
    setContent("")
    setOs("")
    setBrowser("")
    setVersion("")
    setCreateModalOpen(false)
  }

  return (
    <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
      <DialogContent className="max-w-2xl border-border/80 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
            <Bug className="h-5 w-5 text-rose-500" /> Report Issue or Defect
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          {/* Project & Issue Type */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                Target Project <span className="text-rose-500">*</span>
              </label>
              <Select
                value={projectId}
                onValueChange={(val) => setProjectId(val || "proj-fintech")}
              >
                <SelectTrigger className="h-9 bg-background text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="proj-fintech">
                    Nexus NeoBank Mobile App
                  </SelectItem>
                  <SelectItem value="proj-crm">
                    Zenith CRM SaaS Platform
                  </SelectItem>
                  <SelectItem value="proj-ecommerce">
                    Aura Luxury E-Commerce Portal
                  </SelectItem>
                  <SelectItem value="proj-infra">
                    Multi-Cloud Kubernetes Migration
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                Issue Classification
              </label>
              <Select
                value={issueType}
                onValueChange={(val) => setIssueType(val || "Bug / Defect")}
              >
                <SelectTrigger className="h-9 bg-background text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bug / Defect">Bug / Defect</SelectItem>
                  <SelectItem value="Security Flaw">Security Flaw</SelectItem>
                  <SelectItem value="Performance">Performance Issue</SelectItem>
                  <SelectItem value="UI / UX Glitch">UI / UX Glitch</SelectItem>
                  <SelectItem value="Client Feedback">
                    Client Feedback
                  </SelectItem>
                  <SelectItem value="Infrastructure">
                    Infrastructure Defect
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Issue Summary / Headline <span className="text-rose-500">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 401 Unauthorized error during FaceID refresh on iOS 18"
              className="h-9 bg-background text-xs"
              required
            />
          </div>

          {/* Priority / Severity */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Severity Level
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => setPriorityLevel("0")}
                className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-semibold transition-all ${
                  priorityLevel === "0"
                    ? "border-rose-600 bg-rose-500 text-white shadow-sm"
                    : "border-border/60 text-rose-600 hover:bg-muted/40 dark:text-rose-400"
                }`}
              >
                <Flame className="h-3.5 w-3.5" /> P0 Blocker
              </button>
              <button
                type="button"
                onClick={() => setPriorityLevel("1")}
                className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-semibold transition-all ${
                  priorityLevel === "1"
                    ? "border-amber-600 bg-amber-500 text-white shadow-sm"
                    : "border-border/60 text-amber-600 hover:bg-muted/40 dark:text-amber-400"
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5" /> P1 Critical
              </button>
              <button
                type="button"
                onClick={() => setPriorityLevel("2")}
                className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-semibold transition-all ${
                  priorityLevel === "2"
                    ? "border-blue-700 bg-blue-600 text-white shadow-sm"
                    : "border-border/60 text-foreground hover:bg-muted/40"
                }`}
              >
                P2 Major
              </button>
              <button
                type="button"
                onClick={() => setPriorityLevel("3")}
                className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-semibold transition-all ${
                  priorityLevel === "3"
                    ? "border-slate-800 bg-slate-700 text-white shadow-sm"
                    : "border-border/60 text-muted-foreground hover:bg-muted/40"
                }`}
              >
                P3 Minor
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Detailed Description & Steps to Reproduce
            </label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe symptoms, expected vs actual behavior, stack trace..."
              className="min-h-[90px] bg-background text-xs"
            />
          </div>

          {/* Environment Specs */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">
                Operating System
              </label>
              <Input
                value={os}
                onChange={(e) => setOs(e.target.value)}
                placeholder="e.g. macOS 14.5, iOS 18"
                className="h-8 bg-background text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">
                Browser / Client
              </label>
              <Input
                value={browser}
                onChange={(e) => setBrowser(e.target.value)}
                placeholder="e.g. Chrome 128, Swift SDK"
                className="h-8 bg-background text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">
                App / Build Version
              </label>
              <Input
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g. v2.4.1-rc3"
                className="h-8 bg-background text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateModalOpen(false)}
              className="h-9 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-9 bg-rose-600 text-xs font-semibold text-white hover:bg-rose-700"
            >
              Submit Defect Report
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
