import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Plus, Briefcase, Layers } from 'lucide-react'

export default function ProjectsPage() {
  const projects = [
    {
      id: '1',
      name: 'E-Commerce Platform Redesign',
      orderId: 'ORD-9021',
      value: '$12,500',
      status: 'In Progress',
      componentsCount: 4,
      startDate: '2026-07-01',
      deliveryDate: '2026-09-15',
    },
    {
      id: '2',
      name: 'Mobile App API Migration',
      orderId: 'ORD-8832',
      value: '$8,400',
      status: 'Review',
      componentsCount: 2,
      startDate: '2026-06-10',
      deliveryDate: '2026-08-20',
    },
    {
      id: '3',
      name: 'Analytics Dashboard Integration',
      orderId: 'ORD-9104',
      value: '$15,000',
      status: 'NRA',
      componentsCount: 6,
      startDate: '2026-08-01',
      deliveryDate: '2026-10-30',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects Management</h1>
          <p className="text-muted-foreground text-sm">
            Manage projects, project components, and team assignments defined in Prisma Project Schema.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 size-4" /> New Project
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {projects.map((project) => (
          <Card key={project.id} className="flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-mono text-xs">{project.orderId}</Badge>
                <Badge variant={project.status === 'In Progress' ? 'default' : 'secondary'}>
                  {project.status}
                </Badge>
              </div>
              <CardTitle className="text-lg mt-2">{project.name}</CardTitle>
              <CardDescription className="flex items-center gap-1 text-xs">
                <Layers className="size-3" /> {project.componentsCount} Components
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="flex justify-between items-center text-sm border-t pt-3">
                <span className="text-muted-foreground">Value</span>
                <span className="font-semibold">{project.value}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>Delivery: {project.deliveryDate}</span>
                <Button variant="ghost" size="sm" className="h-7 text-xs">Details</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
