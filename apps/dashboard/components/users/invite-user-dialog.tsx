'use client'

import React, { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus, Loader2, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@workspace/ui/components/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
} from '@workspace/ui/components/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Input } from '@workspace/ui/components/input'
import { Button } from '@workspace/ui/components/button'
import { apiClient, ApiError } from '@/lib/api-client'
import { useAuthContext } from '@/lib/auth-context'

export interface Designation {
  id: string
  name: string
  department?: string
}

const inviteUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  designationId: z.string().min(1, 'Please select a designation'),
  systemRole: z.enum(['Staff', 'Admin', 'SuperAdmin']).optional(),
})

type InviteUserValues = z.infer<typeof inviteUserSchema>

interface InviteUserDialogProps {
  onSuccess: () => void
}

export function InviteUserDialog({ onSuccess }: InviteUserDialogProps) {
  const { user: currentUser } = useAuthContext()
  const isSuperAdmin = currentUser?.systemRole === 'SuperAdmin'

  const [open, setOpen] = useState(false)
  const [designations, setDesignations] = useState<Designation[]>([])
  const [loadingDesignations, setLoadingDesignations] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const form = useForm<InviteUserValues>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      designationId: '',
      systemRole: 'Staff',
    },
  })

  useEffect(() => {
    if (open) {
      setCreatedInviteUrl(null)
      setCopied(false)
      const fetchDesignations = async () => {
        setLoadingDesignations(true)
        try {
          const data = await apiClient.get<Designation[] | { designations: Designation[] }>('/users/designations')
          const list = Array.isArray(data) ? data : (data as { designations: Designation[] }).designations || []
          setDesignations(list)
        } catch {
          toast.error('Failed to load designations list.')
        } finally {
          setLoadingDesignations(false)
        }
      }
      fetchDesignations()
    } else {
      form.reset()
      setCreatedInviteUrl(null)
      setCopied(false)
    }
  }, [open, form])

  const onSubmit = async (values: InviteUserValues) => {
    setIsSubmitting(true)
    try {
      const res = await apiClient.post<any>('/users/invite', values)
      const inviteUrl = res?.data?.inviteUrl || res?.inviteUrl || ''
      setCreatedInviteUrl(inviteUrl)
      toast.success(`Invitation created for ${values.email}`)
      onSuccess()
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message || 'Failed to send invitation.')
      } else {
        toast.error('An unexpected error occurred while sending invitation.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopy = async () => {
    if (!createdInviteUrl) return
    try {
      await navigator.clipboard.writeText(createdInviteUrl)
      setCopied(true)
      toast.success('Invite link copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy link')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="font-medium" />}>
        <UserPlus className="mr-2 size-4" /> Invite User
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        {createdInviteUrl ? (
          <div className="space-y-4 py-2">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Invitation Created!</DialogTitle>
              <DialogDescription>
                An invitation email has been sent. You can also copy the invitation link directly below:
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 mt-3">
              <Input value={createdInviteUrl} readOnly className="font-mono text-xs" />
              <Button type="button" onClick={handleCopy} variant="outline" size="icon" className="shrink-0">
                {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                <span className="sr-only">Copy invite link</span>
              </Button>
            </div>
            <DialogFooter className="pt-4">
              <Button
                type="button"
                onClick={() => {
                  setOpen(false)
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation email to create an account. The recipient will set their own password.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" disabled={isSubmitting} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" disabled={isSubmitting} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="user@organization.com"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="designationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Designation</FormLabel>
                      <Select
                        disabled={isSubmitting || loadingDesignations}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                loadingDesignations
                                  ? 'Loading designations...'
                                  : 'Select a designation'
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {designations.map((desig) => (
                            <SelectItem key={desig.id} value={desig.id}>
                              {desig.name} {desig.department ? `(${desig.department})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isSuperAdmin && (
                  <FormField
                    control={form.control}
                    name="systemRole"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>System Role</FormLabel>
                        <Select
                          disabled={isSubmitting}
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select system role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Staff">Staff</SelectItem>
                            <SelectItem value="Admin">Admin</SelectItem>
                            <SelectItem value="SuperAdmin">SuperAdmin</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <DialogFooter className="pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Sending Invite...
                      </>
                    ) : (
                      'Send Invitation'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
