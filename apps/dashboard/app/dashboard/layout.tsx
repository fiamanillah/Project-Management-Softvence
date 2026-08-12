'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { SidebarInset, SidebarProvider } from '@workspace/ui/components/sidebar'
import { TooltipProvider } from '@workspace/ui/components/tooltip'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { AppSidebar } from '@/components/app-sidebar'
import { DashboardHeader } from '@/components/dashboard-header'
import { AuthProvider, useAuthContext } from '@/lib/auth-context'

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthContext()
  const router = useRouter()

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex h-screen w-full overflow-hidden bg-background">
        {/* Sidebar Skeleton */}
        <div className="hidden md:flex flex-col w-64 border-r p-4 gap-4 bg-sidebar">
          <div className="flex items-center gap-3 py-2">
            <Skeleton className="size-8 rounded-lg" />
            <div className="flex flex-col gap-1 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-4">
            <Skeleton className="h-9 w-full rounded-md" />
            <Skeleton className="h-9 w-full rounded-md" />
            <Skeleton className="h-9 w-full rounded-md" />
            <Skeleton className="h-9 w-full rounded-md" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
          <div className="mt-auto flex items-center gap-3 pt-4 border-t">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex flex-col gap-1 flex-1">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        </div>

        {/* Main Content Area Skeleton */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header Skeleton */}
          <div className="flex h-16 items-center justify-between border-b px-6">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-5 w-28" />
            </div>
            <Skeleton className="size-8 rounded-full" />
          </div>
          {/* Main Body Skeleton */}
          <main className="flex-1 p-6 space-y-6 overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-80" />
              </div>
              <Skeleton className="h-9 w-28 rounded-md" />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
            </div>
            <Skeleton className="h-64 w-full rounded-xl" />
          </main>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="relative z-0 flex flex-col min-h-screen">
          <DashboardHeader />
          <main className="flex-1 p-6 overflow-y-auto">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardShell>{children}</DashboardShell>
}
