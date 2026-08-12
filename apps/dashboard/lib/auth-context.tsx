'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { apiClient, ApiError } from './api-client'

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  designation?: string
  systemRole?: string
}

export interface AuthMeResponse {
  user?: User
  id?: string
  firstName?: string
  lastName?: string
  first_name?: string
  last_name?: string
  email?: string
  designation?: any
  systemRole?: string
  system_role?: string
  permissions?: string[]
}

export interface AuthContextType {
  user: User | null
  permissions: string[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [permissions, setPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAuthMe = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiClient.get<AuthMeResponse>('/auth/me')
      const rawUser: any = data?.user || data
      if (rawUser && (rawUser.id || rawUser.email)) {
        setUser({
          id: rawUser.id || '',
          email: rawUser.email || '',
          firstName: rawUser.firstName || rawUser.first_name || '',
          lastName: rawUser.lastName || rawUser.last_name || '',
          designation:
            typeof rawUser.designation === 'object'
              ? rawUser.designation?.title || rawUser.designation?.name || ''
              : rawUser.designation || '',
          systemRole: rawUser.systemRole || rawUser.system_role || '',
        })
        setPermissions(data?.permissions || rawUser.permissions || [])
        if (typeof document !== 'undefined') {
          document.cookie = 'dashboard_session=true; path=/; max-age=2592000; SameSite=Lax'
        }
      } else {
        setUser(null)
        setPermissions([])
      }
    } catch (err) {
      setUser(null)
      setPermissions([])
      if (typeof document !== 'undefined') {
        document.cookie = 'dashboard_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      }
      if (err instanceof ApiError && err.status !== 401) {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAuthMe()
  }, [fetchAuthMe])

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout')
    } catch {
      // Ignore logout API errors, clear local state regardless
    } finally {
      setUser(null)
      setPermissions([])
      if (typeof document !== 'undefined') {
        document.cookie = 'dashboard_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        loading,
        error,
        refetch: fetchAuthMe,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
