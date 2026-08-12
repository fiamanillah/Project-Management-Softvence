import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Users, Plus, UserCheck } from 'lucide-react'

export default function TeamsPage() {
  const teams = [
    { id: '1', name: 'Frontend Engineering', slug: 'frontend-eng', department: 'ENGINEERING', members: 12, shift: 'Day' },
    { id: '2', name: 'Backend Services', slug: 'backend-services', department: 'ENGINEERING', members: 8, shift: 'Day' },
    { id: '3', name: 'UI/UX Product Design', slug: 'product-design', department: 'DESIGN', members: 5, shift: 'Day' },
    { id: '4', name: 'Quality Assurance', slug: 'qa-team', department: 'QA', members: 6, shift: 'Flexible' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Teams & Members</h1>
          <p className="text-muted-foreground text-sm">
            Manage engineering teams, departments, shifts, and member assignments from Prisma Team Schema.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 size-4" /> Create Team
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {teams.map((team) => (
          <Card key={team.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline">{team.department}</Badge>
                <Badge variant="secondary" className="text-xs">{team.shift} Shift</Badge>
              </div>
              <CardTitle className="text-base mt-2">{team.name}</CardTitle>
              <CardDescription className="text-xs font-mono">@{team.slug}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between border-t pt-3 text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                  <UserCheck className="size-4" /> {team.members} Members
                </span>
                <Button variant="ghost" size="sm" className="h-7 text-xs">Manage</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
