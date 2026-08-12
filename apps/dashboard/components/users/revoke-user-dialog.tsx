'use client'

import React, { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog'
import { apiClient, ApiError } from '@/lib/api-client'

interface UserItem {
  id: string
  firstName?: string
  lastName?: string
  first_name?: string
  last_name?: string
  email: string
}

interface RevokeUserDialogProps {
  user: UserItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function RevokeUserDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: RevokeUserDialogProps) {
  const [isRevoking, setIsRevoking] = useState(false)

  if (!user) return null

  const fullName =
    `${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}`.trim() ||
    user.email

  const handleRevoke = async () => {
    setIsRevoking(true)
    try {
      await apiClient.post(`/users/${user.id}/revoke-invite`)
      toast.success(`Invitation for ${user.email} has been revoked.`)
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message || 'Failed to revoke invitation.')
      } else {
        toast.error('An unexpected error occurred while revoking invitation.')
      }
    } finally {
      setIsRevoking(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke Invitation</AlertDialogTitle>
          <AlertDialogDescription>
            This will cancel the invitation for{' '}
            <strong className="text-foreground">{fullName}</strong> ({user.email}). The email will be free to invite again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleRevoke()
            }}
            disabled={isRevoking}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isRevoking ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Revoking...
              </>
            ) : (
              'Revoke Invite'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
