'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, AlertCircle, RefreshCw, UserX, Copy, Trash2, UserCheck, Search } from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardHeader, CardTitle, CardDescription } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select'
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
import { RevokeUserDialog } from '@/components/users/revoke-user-dialog'
import { ReactivateUserDialog } from '@/components/users/reactivate-user-dialog'

export interface UserRecord {
  id: string
  firstName?: string
  lastName?: string
  first_name?: string
  last_name?: string
  email: string
  designation?: { name: string } | string
  isDeactivated?: boolean
  isActive?: boolean
  is_active?: boolean
  systemRole?: string
  system_role?: string
  status?: 'active' | 'pending' | 'expired' | 'deactivated'
}

export default function UsersPage() {
  const router = useRouter()
  const canManageUsers = usePermission('user.manage')

  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const [deactivatingUser, setDeactivatingUser] = useState<UserRecord | null>(null)
  const [revokingUser, setRevokingUser] = useState<UserRecord | null>(null)
  const [reactivatingUser, setReactivatingUser] = useState<UserRecord | null>(null)

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
      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== 'all') {
        params.set('status', statusFilter)
      }
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim())
      }
      const queryStr = params.toString() ? `?${params.toString()}` : ''

      const data = await apiClient.get<UserRecord[] | { users?: UserRecord[]; data?: UserRecord[] }>(`/users${queryStr}`)
      const list = Array.isArray(data)
        ? data
        : (data as { data?: UserRecord[]; users?: UserRecord[] }).data || (data as { users?: UserRecord[] }).users || []
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
  }, [statusFilter, searchQuery])

  useEffect(() => {
    if (canManageUsers) {
      fetchUsers()
    }
  }, [canManageUsers, fetchUsers])

  const handleCopyInviteLink = async (user: UserRecord) => {
    try {
      const res = await apiClient.post<any>(`/users/${user.id}/invite-link`)
      const inviteUrl = res?.data?.inviteUrl || res?.inviteUrl || ''
      if (inviteUrl) {
        await navigator.clipboard.writeText(inviteUrl)
        toast.success('Invite link copied')
      } else {
        toast.error('Failed to generate invite link.')
      }
      fetchUsers()
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message || 'Failed to generate invite link.')
      } else {
        toast.error('An unexpected error occurred while generating link.')
      }
    }
  }

  const getStatusBadgeConfig = (user: UserRecord) => {
    const rawStatus = user.status?.toLowerCase() || (user.isActive ?? user.is_active ? 'active' : 'deactivated')
    switch (rawStatus) {
      case 'active':
        return {
          label: 'Active',
          className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20',
        }
      case 'pending':
        return {
          label: 'Pending',
          className: 'bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20',
        }
      case 'expired':
        return {
          label: 'Invite Expired',
          className: 'bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-rose-500/20',
        }
      case 'deactivated':
      default:
        return {
          label: 'Deactivated',
          className: 'bg-slate-500/10 text-slate-600 border-slate-500/20 hover:bg-slate-500/20',
        }
    }
  }

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

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'all')}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="expired">Invite Expired</SelectItem>
            <SelectItem value="deactivated">Deactivated</SelectItem>
          </SelectContent>
        </Select>
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
              {searchQuery || statusFilter !== 'all'
                ? 'No users match the selected filters.'
                : 'Start by inviting your first team member using the button above.'}
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
                const firstName = u.firstName || u.first_name || ''
                const lastName = u.lastName || u.last_name || ''
                const fullName = `${firstName} ${lastName}`.trim() || u.email
                const role = u.systemRole || u.system_role
                const designationTitle = typeof u.designation === 'object' ? u.designation?.name : u.designation || 'Unassigned'
                const initials = fullName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2) || 'U'

                const badge = getStatusBadgeConfig(u)
                const computedStatus = u.status?.toLowerCase() || (u.isActive ?? u.is_active ? 'active' : 'deactivated')

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
                          {role && (
                            <span className="text-[11px] text-muted-foreground">{role}</span>
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
                      <Badge variant="outline" className={badge.className}>
                        {badge.label}
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
                          {(computedStatus === 'pending' || computedStatus === 'expired') && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleCopyInviteLink(u)}
                                className="cursor-pointer"
                              >
                                <Copy className="mr-2 size-4" /> Copy Invite Link
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setRevokingUser(u)}
                                className="text-destructive focus:text-destructive cursor-pointer"
                              >
                                <Trash2 className="mr-2 size-4" /> Revoke Invite
                              </DropdownMenuItem>
                            </>
                          )}
                          {computedStatus === 'active' && (
                            <DropdownMenuItem
                              onClick={() => setDeactivatingUser(u)}
                              className="text-destructive focus:text-destructive cursor-pointer"
                            >
                              <UserX className="mr-2 size-4" /> Deactivate
                            </DropdownMenuItem>
                          )}
                          {computedStatus === 'deactivated' && (
                            <DropdownMenuItem
                              onClick={() => setReactivatingUser(u)}
                              className="cursor-pointer"
                            >
                              <UserCheck className="mr-2 size-4" /> Reactivate
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

      <RevokeUserDialog
        user={revokingUser}
        open={Boolean(revokingUser)}
        onOpenChange={(open) => !open && setRevokingUser(null)}
        onSuccess={fetchUsers}
      />

      <ReactivateUserDialog
        user={reactivatingUser}
        open={Boolean(reactivatingUser)}
        onOpenChange={(open) => !open && setReactivatingUser(null)}
        onSuccess={fetchUsers}
      />
    </div>
  )
}
