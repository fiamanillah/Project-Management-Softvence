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
  firstName: string
  lastName: string
  email: string
}

interface DeactivateUserDialogProps {
  user: UserItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function DeactivateUserDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: DeactivateUserDialogProps) {
  const [isDeactivating, setIsDeactivating] = useState(false)

  if (!user) return null

  const handleDeactivate = async () => {
    setIsDeactivating(true)
    try {
      await apiClient.patch(`/users/${user.id}/deactivate`)
      toast.success(`User ${user.firstName} ${user.lastName} has been deactivated.`)
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message || 'Failed to deactivate user.')
      } else {
        toast.error('An unexpected error occurred while deactivating user.')
      }
    } finally {
      setIsDeactivating(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate User Account</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to deactivate{' '}
            <strong className="text-foreground">
              {user.firstName} {user.lastName} ({user.email})
            </strong>
            ? They will immediately lose access to the system.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeactivating}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleDeactivate()
            }}
            disabled={isDeactivating}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeactivating ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Deactivating...
              </>
            ) : (
              'Deactivate User'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
