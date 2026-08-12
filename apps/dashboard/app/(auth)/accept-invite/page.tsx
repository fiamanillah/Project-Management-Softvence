'use client'

import React, { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, AlertCircle, ArrowLeft, FolderKanban } from 'lucide-react'
import { toast } from 'sonner'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
} from '@workspace/ui/components/form'
import { Input } from '@workspace/ui/components/input'
import { Button } from '@workspace/ui/components/button'
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { apiClient, ApiError } from '@/lib/api-client'

const acceptInviteSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data: { password: string; confirmPassword: string }) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type AcceptInviteValues = z.infer<typeof acceptInviteSchema>

function AcceptInviteForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [errorMessage, setErrorMessage] = useState<string | null>(
    !token ? 'This invitation link is missing a valid security token.' : null
  )
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  const form = useForm<AcceptInviteValues>({
    resolver: zodResolver(acceptInviteSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (values: AcceptInviteValues) => {
    if (!token) {
      setErrorMessage('This invitation link is invalid or missing a token.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      await apiClient.post('/auth/accept-invite', {
        token,
        password: values.password,
      })
      toast.success('Account setup complete! Please sign in with your new password.')
      router.push('/login')
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message || 'This invitation link is invalid or expired.')
      } else {
        setErrorMessage('Failed to accept invitation. The link may have expired.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="space-y-2 text-center">
        <div className="flex justify-center mb-2">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-md">
            <FolderKanban className="size-6" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">
          Accept Invitation
        </CardTitle>
        <CardDescription>
          Set up your password to activate your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Invitation Error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Set Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      disabled={isSubmitting || !token}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      disabled={isSubmitting || !token}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full font-medium"
              disabled={isSubmitting || !token}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Activating account...
                </>
              ) : (
                'Set Password & Activate'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center border-t pt-4">
        <Link
          href="/login"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-medium"
        >
          <ArrowLeft className="size-4" />
          Back to sign in
        </Link>
      </CardFooter>
    </Card>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <Card className="w-full shadow-lg p-6 space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-60" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </Card>
      }
    >
      <AcceptInviteForm />
    </Suspense>
  )
}
