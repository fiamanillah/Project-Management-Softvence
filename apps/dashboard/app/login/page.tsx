"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"

import { Button } from "@workspace/ui/components/button"
import { Layers, Sun, Moon } from "lucide-react"

import { LoginForm } from "./components/login-form"
import { ForgotPasswordModal } from "./components/forgot-password-modal"
import { RequestAccessModal } from "./components/request-access-modal"

export default function LoginPage() {
  const router = useRouter()
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Modals & State
  const [forgotPasswordOpen, setForgotPasswordOpen] = React.useState(false)
  const [requestAccessOpen, setRequestAccessOpen] = React.useState(false)
  const [email, setEmail] = React.useState("")

  React.useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-background font-sans">
      {/* Top Corner Theme Switcher */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            aria-label="Toggle Theme"
          >
            {resolvedTheme === "dark" ? (
              <Sun className="size-4 text-amber-400" />
            ) : (
              <Moon className="size-4 text-slate-700" />
            )}
          </Button>
        )}
      </div>

      {/* Main Container */}
      <div className="w-full max-w-sm sm:max-w-md space-y-6">
        {/* Brand Title */}
        <div className="flex items-center justify-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Layers className="size-5" />
          </div>
          <span className="font-bold tracking-tight text-xl">Softvence</span>
        </div>

        {/* Login Form Component */}
        <LoginForm
          email={email}
          setEmail={setEmail}
          onForgotPasswordClick={() => setForgotPasswordOpen(true)}
          onRequestAccessClick={() => setRequestAccessOpen(true)}
          onSuccess={() => router.push("/dashboard")}
        />
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        open={forgotPasswordOpen}
        onOpenChange={setForgotPasswordOpen}
        defaultEmail={email}
      />

      {/* Request Access Modal */}
      <RequestAccessModal
        open={requestAccessOpen}
        onOpenChange={setRequestAccessOpen}
      />
    </div>
  )
}
