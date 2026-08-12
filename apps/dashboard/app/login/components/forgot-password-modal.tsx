"use client"

import * as React from "react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Mail, Check, KeyRound, Loader2 } from "lucide-react"

interface ForgotPasswordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultEmail?: string
}

export function ForgotPasswordModal({
  open,
  onOpenChange,
  defaultEmail = "",
}: ForgotPasswordModalProps) {
  const [resetEmail, setResetEmail] = React.useState(defaultEmail)
  const [isLoading, setIsLoading] = React.useState(false)
  const [resetEmailSent, setResetEmailSent] = React.useState(false)

  React.useEffect(() => {
    if (defaultEmail) {
      setResetEmail(defaultEmail)
    }
  }, [defaultEmail])

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      setResetEmailSent(true)
    }, 1000)
  }

  const handleClose = () => {
    setResetEmailSent(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <KeyRound className="size-4 text-primary" />
            Reset Password
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Enter your work email to receive password recovery instructions.
          </DialogDescription>
        </DialogHeader>

        {resetEmailSent ? (
          <div className="py-4 text-center space-y-2">
            <div className="mx-auto size-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Check className="size-5" />
            </div>
            <h4 className="font-semibold text-sm">Reset link sent</h4>
            <p className="text-xs text-muted-foreground">
              Check your inbox for reset instructions.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2 text-xs"
              onClick={handleClose}
            >
              Back to Sign In
            </Button>
          </div>
        ) : (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="reset-email" className="text-xs font-medium">
                Work Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="name@company.com"
                  className="pl-9 text-sm h-10"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" className="text-xs" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin mr-1" />
                    Sending...
                  </>
                ) : (
                  "Send link"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
