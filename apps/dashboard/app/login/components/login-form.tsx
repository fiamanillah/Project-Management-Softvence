"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Card } from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

interface LoginFormProps {
  onForgotPasswordClick: () => void;
  onRequestAccessClick: () => void;
  onSuccess: () => void;
  email: string;
  setEmail: (email: string) => void;
}

export function LoginForm({
  onForgotPasswordClick,
  onRequestAccessClick,
  onSuccess,
  email,
  setEmail,
}: LoginFormProps) {
  const { login } = useAuth();
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [authSuccess, setAuthSuccess] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      setAuthSuccess(true);
      toast.success("Successfully logged in!");
      setTimeout(() => {
        onSuccess();
      }, 600);
    } catch (err: any) {
      toast.error(err.message || "Failed to log in. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  if (authSuccess) {
    return (
      <Card className="border border-emerald-500/30 bg-emerald-500/5 text-center p-8 space-y-4 shadow-sm rounded-xl">
        <div className="mx-auto size-12 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
          <Check className="size-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold">Authenticated</h2>
          <p className="text-xs text-muted-foreground">Redirecting to dashboard...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border border-border p-6 sm:p-8 shadow-sm bg-card rounded-2xl space-y-5">
      <div className="space-y-1.5 text-center sm:text-left">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Sign in</h1>
        <p className="text-xs text-muted-foreground">
          Enter your work email and password to sign in.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-medium">
            Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="name@company.com"
              className="pl-9 text-sm h-10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-medium">
              Password
            </Label>
            <button
              type="button"
              onClick={onForgotPasswordClick}
              className="text-xs text-primary hover:underline font-medium"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••"
              className="pl-9 pr-9 text-sm h-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2 pt-1">
          <Checkbox
            id="remember"
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(!!checked)}
          />
          <Label
            htmlFor="remember"
            className="text-xs text-muted-foreground cursor-pointer font-normal"
          >
            Remember me for 30 days
          </Label>
        </div>

        <Button type="submit" className="w-full h-10 font-semibold text-sm gap-2" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Signing in...
            </>
          ) : (
            <>
              Sign In <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>

      <div className="pt-2 text-center">
        <p className="text-xs text-muted-foreground">
          No account?{" "}
          <button
            type="button"
            onClick={onRequestAccessClick}
            className="font-medium text-primary hover:underline focus:outline-none"
          >
            Contact admin for access
          </button>
        </p>
      </div>
    </Card>
  );
}
