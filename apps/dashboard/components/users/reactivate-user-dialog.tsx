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

interface ReactivateUserDialogProps {
  user: UserItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function ReactivateUserDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: ReactivateUserDialogProps) {
  const [isReactivating, setIsReactivating] = useState(false)

  if (!user) return null

  const fullName =
    `${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}`.trim() ||
    user.email

  const handleReactivate = async () => {
    setIsReactivating(true)
    try {
      await apiClient.post(`/users/${user.id}/reactivate`)
      toast.success(`User account for ${fullName} has been reactivated.`)
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message || 'Failed to reactivate user account.')
      } else {
        toast.error('An unexpected error occurred while reactivating user.')
      }
    } finally {
      setIsReactivating(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reactivate User Account</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to reactivate access for{' '}
            <strong className="text-foreground">{fullName}</strong> ({user.email})? They will immediately regain login access to the system.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isReactivating}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleReactivate()
            }}
            disabled={isReactivating}
          >
            {isReactivating ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Reactivating...
              </>
            ) : (
              'Reactivate User'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
