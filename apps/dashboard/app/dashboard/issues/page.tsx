import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { AlertCircle, Plus, MessageSquare } from 'lucide-react'

export default function IssuesPage() {
  const issues = [
    { id: '1', title: 'Payment Gateway Webhook Timeout', project: 'E-Commerce Platform', status: 'High Priority', comments: 4, type: 'BUG' },
    { id: '2', title: 'Auth Refresh Token Expiry handling', project: 'Mobile App API', status: 'Open', comments: 2, type: 'FEATURE' },
    { id: '3', title: 'DB Query latency optimization on reports', project: 'Analytics Dashboard', status: 'Resolved', comments: 7, type: 'PERFORMANCE' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Issues & Support</h1>
          <p className="text-muted-foreground text-sm">
            Track project issues, support tickets, and comment threads from Prisma Issue Schema.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 size-4" /> Report Issue
        </Button>
      </div>

      <div className="space-y-3">
        {issues.map((issue) => (
          <Card key={issue.id}>
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="size-5 text-amber-500 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{issue.title}</p>
                    <Badge variant="outline" className="text-[10px]">{issue.type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Project: {issue.project}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MessageSquare className="size-3.5" /> {issue.comments}
                </span>
                <Badge variant={issue.status === 'High Priority' ? 'destructive' : 'secondary'}>
                  {issue.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
