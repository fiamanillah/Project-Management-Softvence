'use client'

import React from 'react'
import { usePermission } from '@/lib/use-permission'

interface RequirePermissionProps {
  code: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RequirePermission({
  code,
  children,
  fallback = null,
}: RequirePermissionProps) {
  const hasPermission = usePermission(code)

  if (!hasPermission) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
