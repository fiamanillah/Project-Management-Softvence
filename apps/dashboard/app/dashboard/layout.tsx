'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { SidebarInset, SidebarProvider } from '@workspace/ui/components/sidebar'
import { TooltipProvider } from '@workspace/ui/components/tooltip'
import { AppSidebar } from '@/components/app-sidebar'
import { DashboardHeader } from '@/components/dashboard-header'
import { useAuth } from '@/lib/auth-context'
import { Loader2 } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  React.useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login')
      } else if (user.mustChangePassword) {
        router.push('/change-password')
      }
    }
  }, [isLoading, user, router])

  if (isLoading || !user || user.mustChangePassword) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-medium">
            {user?.mustChangePassword ? "Setting up account security..." : "Verifying authentication..."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="relative z-0 flex flex-col min-h-screen min-w-0 max-w-full overflow-x-hidden">
          <DashboardHeader />
          <main className="flex-1 p-4 sm:p-6 overflow-y-auto overflow-x-hidden min-w-0 max-w-full">
            {children}
          </main>
        </SidebarInset>

      </SidebarProvider>
    </TooltipProvider>
  )
}
