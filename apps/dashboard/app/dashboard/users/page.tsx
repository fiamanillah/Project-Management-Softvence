'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, AlertCircle, RefreshCw, UserX, Shield } from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Alert, AlertTitle, AlertDescription } from '@workspace/ui/components/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { Avatar, AvatarFallback } from '@workspace/ui/components/avatar'
import { apiClient, ApiError } from '@/lib/api-client'
import { usePermission } from '@/lib/use-permission'
import { UsersTableSkeleton } from '@/components/users/users-table-skeleton'
import { InviteUserDialog } from '@/components/users/invite-user-dialog'
import { DeactivateUserDialog } from '@/components/users/deactivate-user-dialog'

export interface UserRecord {
  id: string
  firstName: string
  lastName: string
  email: string
  designation?: { name: string } | string
  isDeactivated?: boolean
  isActive?: boolean
  systemRole?: string
}

export default function UsersPage() {
  const router = useRouter()
  const canManageUsers = usePermission('user.manage')

  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [deactivatingUser, setDeactivatingUser] = useState<UserRecord | null>(null)

  // Redirect unauthorized users
  useEffect(() => {
    if (!canManageUsers && !loading) {
      toast.error("You don't have access to this page")
      router.push('/dashboard')
    }
  }, [canManageUsers, loading, router])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const data = await apiClient.get<UserRecord[] | { users: UserRecord[] }>('/users')
      const list = Array.isArray(data) ? data : (data as { users: UserRecord[] }).users || []
      setUsers(list)
    } catch (err) {
      if (err instanceof ApiError) {
        setFetchError(err.message || 'Failed to fetch team members.')
      } else {
        setFetchError('An unexpected error occurred while loading users.')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (canManageUsers) {
      fetchUsers()
    }
  }, [canManageUsers, fetchUsers])

  if (!canManageUsers) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Members & Users</h1>
          <p className="text-muted-foreground text-sm">
            Manage system users, designations, and account access controls.
          </p>
        </div>
        <div>
          <InviteUserDialog onSuccess={fetchUsers} />
        </div>
      </div>

      {fetchError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Error Loading Users</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4 mt-2">
            <span>{fetchError}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchUsers}
              className="border-destructive/30 hover:bg-destructive/10"
            >
              <RefreshCw className="mr-2 size-3.5" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : loading ? (
        <UsersTableSkeleton />
      ) : users.length === 0 ? (
        <Card className="p-8 text-center">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">No Team Members Found</CardTitle>
            <CardDescription>
              Start by inviting your first team member using the button above.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="rounded-md border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[280px]">User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const isUserActive = u.isActive ?? !u.isDeactivated
                const designationTitle = typeof u.designation === 'object' ? u.designation?.name : u.designation || 'Unassigned'
                const fullName = `${u.firstName} ${u.lastName}`.trim() || u.email
                const initials = fullName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2) || 'U'

                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 rounded-full">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm leading-none">{fullName}</p>
                          {u.systemRole && (
                            <span className="text-[11px] text-muted-foreground">{u.systemRole}</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-muted-foreground">
                      {u.email}
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      {designationTitle}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={isUserActive ? 'default' : 'secondary'}
                        className={
                          isUserActive
                            ? 'bg-status-active/10 text-status-active border-status-active/20 hover:bg-status-active/20'
                            : 'bg-status-inactive/10 text-status-inactive border-status-inactive/20'
                        }
                      >
                        {isUserActive ? 'Active' : 'Deactivated'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Open menu</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {isUserActive && (
                            <DropdownMenuItem
                              onClick={() => setDeactivatingUser(u)}
                              className="text-destructive focus:text-destructive cursor-pointer"
                            >
                              <UserX className="mr-2 size-4" /> Deactivate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <DeactivateUserDialog
        user={deactivatingUser}
        open={Boolean(deactivatingUser)}
        onOpenChange={(open) => !open && setDeactivatingUser(null)}
        onSuccess={fetchUsers}
      />
    </div>
  )
}
