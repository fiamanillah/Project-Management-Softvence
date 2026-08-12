import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Briefcase, Users, Building2, AlertCircle, ArrowUpRight, CheckCircle2, Clock } from 'lucide-react'
import Link from 'next/link'

export default function DashboardOverviewPage() {
  const stats = [
    { title: 'Total Projects', value: '24', change: '+12% from last month', icon: Briefcase },
    { title: 'Active Teams', value: '8', change: '42 Active Members', icon: Users },
    { title: 'Clients & Profiles', value: '16', change: '3 Platforms Connected', icon: Building2 },
    { title: 'Open Issues', value: '5', change: '2 High Priority', icon: AlertCircle },
  ]

  const recentProjects = [
    { id: '1', name: 'E-Commerce Platform Redesign', client: 'Acme Corp', status: 'In Progress', progress: 68 },
    { id: '2', name: 'Mobile App API Migration', client: 'GlobalTech', status: 'Review', progress: 90 },
    { id: '3', name: 'Analytics Dashboard Integration', client: 'Innovate LLC', status: 'Planning', progress: 25 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Overview</h1>
          <p className="text-muted-foreground text-sm">
            Welcome back! Here is a summary of your workspace activities and project health.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/projects">
            <Button size="sm">
              <Briefcase className="mr-2 size-4" />
              View Projects
            </Button>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Projects and Activity Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Projects</CardTitle>
              <CardDescription>Active projects tracked via Prisma Project Architecture</CardDescription>
            </div>
            <Link href="/dashboard/projects">
              <Button variant="ghost" size="sm">
                View all <ArrowUpRight className="ml-1 size-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentProjects.map((project) => (
              <div key={project.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{project.name}</p>
                  <p className="text-xs text-muted-foreground">Client: {project.client}</p>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={project.status === 'In Progress' ? 'default' : 'secondary'}>
                    {project.status}
                  </Badge>
                  <span className="text-xs font-mono font-medium">{project.progress}%</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>System Status & Activity</CardTitle>
            <CardDescription>Prisma Schema Modules Status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="size-5 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium">Core Identity & Access</p>
                  <p className="text-xs text-muted-foreground">Users, Roles, Permissions</p>
                </div>
              </div>
              <Badge variant="outline" className="text-emerald-600 border-emerald-300">Active</Badge>
            </div>

            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="size-5 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium">Teams & Clients</p>
                  <p className="text-xs text-muted-foreground">Teams, Members, Profiles</p>
                </div>
              </div>
              <Badge variant="outline" className="text-emerald-600 border-emerald-300">Active</Badge>
            </div>

            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-3">
                <Clock className="size-5 text-amber-500" />
                <div>
                  <p className="text-sm font-medium">Issues & Tickets</p>
                  <p className="text-xs text-muted-foreground">Tracking & Notifications</p>
                </div>
              </div>
              <Badge variant="outline" className="text-amber-600 border-amber-300">Monitoring</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
