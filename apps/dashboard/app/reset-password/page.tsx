"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import Link from "next/link";
import {
  useForm,
  zodResolver,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Card } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Progress } from "@workspace/ui/components/progress";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import {
  Layers,
  Sun,
  Moon,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Loader2,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import {
  resetPasswordFormSchema,
  type ResetPasswordFormDTO,
} from "@workspace/shared";
import { api, handleFormApiError } from "@/lib/api";

function ResetPasswordFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";

  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);

  const form = useForm<ResetPasswordFormDTO>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: {
      token: tokenFromUrl,
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  React.useEffect(() => {
    if (tokenFromUrl && form.getValues("token") !== tokenFromUrl) {
      form.setValue("token", tokenFromUrl, { shouldValidate: true });
    }
  }, [tokenFromUrl, form]);

  const watchedPassword = form.watch("password") || "";
  const watchedConfirmPassword = form.watch("confirmPassword") || "";

  // Visual password criteria
  const hasMinLength = watchedPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(watchedPassword);
  const hasLowercase = /[a-z]/.test(watchedPassword);
  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(watchedPassword);
  const isMatch = watchedPassword.length > 0 && watchedPassword === watchedConfirmPassword;

  const strengthScore = React.useMemo(() => {
    let score = 0;
    if (hasMinLength) score += 25;
    if (hasUppercase) score += 25;
    if (hasLowercase) score += 25;
    if (hasNumberOrSymbol) score += 25;
    return score;
  }, [hasMinLength, hasUppercase, hasLowercase, hasNumberOrSymbol]);

  const getStrengthLabel = (score: number) => {
    if (score <= 25) return { label: "Weak", color: "text-rose-500" };
    if (score <= 50) return { label: "Fair", color: "text-amber-500" };
    if (score <= 75) return { label: "Good", color: "text-blue-500" };
    return { label: "Strong", color: "text-emerald-500" };
  };

  const onSubmit = async (values: ResetPasswordFormDTO) => {
    setApiError(null);
    try {
      await api.post("/auth/reset-password", {
        token: values.token,
        password: values.password,
      });
      setIsSuccess(true);
      toast.success("Password reset successfully! You can now log in.");
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err: any) {
      const message = handleFormApiError(
        err,
        form.setError,
        "Failed to reset password. The link may have expired."
      );
      if (
        message.toLowerCase().includes("expired") ||
        message.toLowerCase().includes("invalid")
      ) {
        form.setError("token", {
          type: "server",
          message: "This password reset token is invalid or has expired.",
        });
      }
      setApiError(message);
      toast.error(message);
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Card className="border border-border p-6 sm:p-8 shadow-sm bg-card rounded-2xl space-y-5">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="bg-primary/10 text-primary border-primary/20 text-[11px] gap-1 py-0.5"
          >
            <KeyRound className="size-3" /> Password Recovery
          </Badge>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          Create New Password
        </h1>
        <p className="text-xs text-muted-foreground">
          Enter your new password below to regain access to your account.
        </p>
      </div>

      {apiError && (
        <Alert
          variant="destructive"
          className="border-destructive/30 bg-destructive/10 text-destructive text-xs py-2.5 px-3"
        >
          <AlertCircle className="size-4 shrink-0 text-destructive" />
          <AlertDescription className="text-xs font-medium text-destructive leading-relaxed">
            {apiError}
          </AlertDescription>
        </Alert>
      )}

      {isSuccess ? (
        <div className="py-6 text-center space-y-4">
          <div className="mx-auto size-12 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="size-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold">Password Reset Successful</h3>
            <p className="text-xs text-muted-foreground">
              Your password has been updated. Redirecting to sign in...
            </p>
          </div>
          <Button
            type="button"
            className="w-full text-xs"
            onClick={() => router.push("/login")}
          >
            Go to Sign In
          </Button>

        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Reset Token field (hidden or editable if missing) */}
            {!tokenFromUrl && (
              <FormField
                control={form.control}
                name="token"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reset Token</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="Paste your reset token"
                          className="pl-9 text-sm h-10 font-mono"
                          {...field}
                          onChange={(e) => {
                            if (apiError) setApiError(null);
                            field.onChange(e);
                          }}
                          disabled={isSubmitting}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* New Password */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>New Password</FormLabel>
                    {watchedPassword.length > 0 && (
                      <span
                        className={`text-[11px] font-semibold ${getStrengthLabel(strengthScore).color}`}
                      >
                        {getStrengthLabel(strengthScore).label}
                      </span>
                    )}
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••••••"
                        className="pl-9 pr-9 text-sm h-10"
                        {...field}
                        onChange={(e) => {
                          if (apiError) setApiError(null);
                          field.onChange(e);
                        }}
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </FormControl>
                  {watchedPassword.length > 0 && (
                    <Progress value={strengthScore} className="h-1.5 mt-1" />
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Confirm Password */}
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••••••"
                        className="pl-9 pr-9 text-sm h-10"
                        {...field}
                        onChange={(e) => {
                          if (apiError) setApiError(null);
                          field.onChange(e);
                        }}
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={
                          showConfirmPassword ? "Hide password" : "Show password"
                        }
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Checklist */}
            <div className="p-3 rounded-xl bg-muted/40 border space-y-2 text-xs">
              <span className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider block">
                Password Requirements
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                <div className="flex items-center gap-2">
                  {hasMinLength ? (
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                  ) : (
                    <XCircle className="size-3.5 text-muted-foreground/50" />
                  )}
                  <span
                    className={
                      hasMinLength
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    }
                  >
                    At least 8 characters
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {hasUppercase && hasLowercase ? (
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                  ) : (
                    <XCircle className="size-3.5 text-muted-foreground/50" />
                  )}
                  <span
                    className={
                      hasUppercase && hasLowercase
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    }
                  >
                    Uppercase and lowercase letters
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {hasNumberOrSymbol ? (
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                  ) : (
                    <XCircle className="size-3.5 text-muted-foreground/50" />
                  )}
                  <span
                    className={
                      hasNumberOrSymbol
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    }
                  >
                    At least one number or special symbol
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {isMatch ? (
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                  ) : (
                    <XCircle className="size-3.5 text-muted-foreground/50" />
                  )}
                  <span
                    className={
                      isMatch
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    }
                  >
                    Passwords match
                  </span>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-10 font-semibold text-sm gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Updating Password...
                </>
              ) : (
                <>
                  Reset Password <ArrowRight className="size-4" />
                </>
              )}
            </Button>

            <div className="pt-1 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="size-3.5" /> Back to Sign In
              </Link>
            </div>
          </form>
        </Form>
      )}
    </Card>
  );
}

export default function ResetPasswordPage() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-background font-sans">
      {/* Theme Switcher */}
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

      <div className="w-full max-w-sm sm:max-w-md space-y-6">
        {/* Brand Title */}
        <div className="flex items-center justify-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Layers className="size-5" />
          </div>
          <span className="font-bold tracking-tight text-xl">Softvence</span>
        </div>

        <React.Suspense
          fallback={
            <div className="flex items-center justify-center p-12">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          }
        >
          <ResetPasswordFormContent />
        </React.Suspense>
      </div>
    </div>
  );
}
