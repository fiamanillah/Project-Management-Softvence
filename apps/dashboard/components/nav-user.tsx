'use client'

import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  LogOut,
  Settings,
  Shield,
  KeyRound,
  User as UserIcon,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@workspace/ui/components/avatar'
import { Badge } from '@workspace/ui/components/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@workspace/ui/components/sidebar'
import { useAuth } from '@/lib/auth-context'
import { PermissionGate } from '@/components/permission-gate/PermissionGate'
import { toast } from 'sonner'

export function NavUser({
  user: defaultUser,
}: {
  user?: {
    name: string
    email: string
    avatar: string
  }
}) {
  const { isMobile } = useSidebar()
  const { user, logout } = useAuth()
  const router = useRouter()

  const displayName = user
    ? user.firstName || user.lastName
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
      : user.email
    : defaultUser?.name || 'Super Admin'

  const displayEmail = user?.email || defaultUser?.email || 'admin@example.com'
  const displayRole = user?.systemRole || 'SuperAdmin'
  const avatarSource = user?.avatarUrl || defaultUser?.avatar

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const handleLogout = async () => {
    try {
      await logout()
      toast.success('Successfully logged out')
      router.push('/login')
    } catch (err: any) {
      toast.error('Failed to log out')
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground w-full"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  {avatarSource && <AvatarImage src={avatarSource} alt={displayName} />}
                  <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold flex items-center gap-1">
                    {displayName}
                    <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono">
                      {displayRole}
                    </Badge>
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{displayEmail}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            }
          />
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    {avatarSource && <AvatarImage src={avatarSource} alt={displayName} />}
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{displayName}</span>
                    <span className="truncate text-xs text-muted-foreground">{displayEmail}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <Link href="/dashboard/profile">
                <DropdownMenuItem className="cursor-pointer">
                  <UserIcon className="mr-2 size-4" />
                  My Profile
                </DropdownMenuItem>
              </Link>
              <PermissionGate code="auth.user.view">
                <Link href="/dashboard/users">
                  <DropdownMenuItem className="cursor-pointer">
                    <Shield className="mr-2 size-4" />
                    User & Role Admin
                  </DropdownMenuItem>
                </Link>
              </PermissionGate>
              <Link href="/change-password">
                <DropdownMenuItem className="cursor-pointer">
                  <KeyRound className="mr-2 size-4" />
                  Change Password
                </DropdownMenuItem>
              </Link>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
            >
              <LogOut className="mr-2 size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
