import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { MessageSquare, Plus, Send } from 'lucide-react'

export default function MessagesPage() {
  const messages = [
    { id: '1', title: 'Sprint 14 Client Progress Update', project: 'E-Commerce Platform', author: 'Sarah Jenkins', time: '10 mins ago', status: 'Approved' },
    { id: '2', title: 'API v2 Breaking Changes Announcement', project: 'Mobile App API', author: 'Alex Rivera', time: '2 hours ago', status: 'Pending Review' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Messages & Client Updates</h1>
          <p className="text-muted-foreground text-sm">
            Review authored messages, client updates, revisions, and approval workflows from Prisma Message Schema.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 size-4" /> Compose Message
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {messages.map((msg) => (
          <Card key={msg.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge variant={msg.status === 'Approved' ? 'default' : 'secondary'}>{msg.status}</Badge>
                <span className="text-xs text-muted-foreground">{msg.time}</span>
              </div>
              <CardTitle className="text-base mt-2 flex items-center gap-2">
                <MessageSquare className="size-4 text-primary" /> {msg.title}
              </CardTitle>
              <CardDescription className="text-xs">Project: {msg.project}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                <span>By: {msg.author}</span>
                <Button variant="ghost" size="sm" className="h-7 text-xs">Read Thread</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
