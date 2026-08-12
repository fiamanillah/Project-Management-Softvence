'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react'

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
import { apiClient } from '@/lib/api-client'

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
})

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = async (values: ForgotPasswordValues) => {
    setIsSubmitting(true)

    try {
      await apiClient.post('/auth/forgot-password', values)
    } catch {
      // Always treat as success to match backend non-enumeration security rule
    } finally {
      setIsSubmitting(false)
      setIsSubmitted(true)
    }
  }

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl font-bold tracking-tight">
          Forgot password?
        </CardTitle>
        <CardDescription>
          Enter your email address and we will send you instructions to reset your password.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isSubmitted ? (
          <Alert className="border-primary/20 bg-primary/5">
            <CheckCircle2 className="size-4 text-primary" />
            <AlertTitle>Instructions Sent</AlertTitle>
            <AlertDescription>
              If an account with that email address exists, a password reset link has been dispatched to your inbox.
            </AlertDescription>
          </Alert>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="name@organization.com"
                        autoComplete="email"
                        disabled={isSubmitting}
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
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Sending reset link...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </form>
          </Form>
        )}
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
