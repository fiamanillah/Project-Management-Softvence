import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Shield, UserPlus, CheckCircle } from 'lucide-react'

export default function UsersPage() {
  const users = [
    { id: '1', name: 'John Doe', email: 'john@softvence.com', employeeId: 'EMP-001', role: 'SuperAdmin', designation: 'Engineering Manager', status: 'Active' },
    { id: '2', name: 'Sarah Jenkins', email: 'sarah@softvence.com', employeeId: 'EMP-014', role: 'Staff', designation: 'Senior Frontend Developer', status: 'Active' },
    { id: '3', name: 'Alex Rivera', email: 'alex@softvence.com', employeeId: 'EMP-022', role: 'Staff', designation: 'Lead System Architect', status: 'Active' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users & Roles</h1>
          <p className="text-muted-foreground text-sm">
            System user directory, designations, and system roles based on Prisma User & Identity Schema.
          </p>
        </div>
        <Button>
          <UserPlus className="mr-2 size-4" /> Add User
        </Button>
      </div>

      <div className="space-y-3">
        {users.map((u) => (
          <Card key={u.id}>
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                  {u.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{u.name}</p>
                    <Badge variant="outline" className="font-mono text-[10px]">{u.employeeId}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{u.email} • {u.designation}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant={u.role === 'SuperAdmin' ? 'default' : 'secondary'}>{u.role}</Badge>
                <Button variant="ghost" size="sm" className="h-8 text-xs">Edit Permissions</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
