// UI convenience only (hides/shows elements) — access control is strictly enforced by the backend.

'use client'

import { useAuthContext } from './auth-context'

export function usePermission(code: string): boolean {
  const { permissions, user } = useAuthContext()

  if (!user) return false
  if (permissions.includes('*') || permissions.includes('admin.all')) return true

  return permissions.includes(code)
}
