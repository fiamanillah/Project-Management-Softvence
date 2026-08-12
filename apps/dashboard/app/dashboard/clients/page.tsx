import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Building2, Plus, Globe } from 'lucide-react'

export default function ClientsPage() {
  const clients = [
    { id: '1', name: 'Acme Corporation', platform: 'UPWORK', projects: 5, notes: 'Enterprise client via Upwork' },
    { id: '2', name: 'GlobalTech Solutions', platform: 'FIVERR', projects: 3, notes: 'Long term partner' },
    { id: '3', name: 'Innovate Digital LLC', platform: 'DIRECT', projects: 8, notes: 'Direct referral client' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients & Profiles</h1>
          <p className="text-muted-foreground text-sm">
            Manage clients, platform profiles (Upwork, Fiverr, Direct), and seller associations.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 size-4" /> Add Client
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {clients.map((client) => (
          <Card key={client.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-mono">{client.platform}</Badge>
                <span className="text-xs text-muted-foreground">{client.projects} Projects</span>
              </div>
              <CardTitle className="text-base mt-2 flex items-center gap-2">
                <Building2 className="size-4 text-primary" /> {client.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">{client.notes}</p>
              <div className="flex justify-end border-t pt-2">
                <Button variant="ghost" size="sm" className="h-7 text-xs">View Profile</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
