"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  useForm,
  zodResolver,
  z,
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
  LogOut,
  Mail,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Current/temporary password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, "Password must contain at least one number or symbol"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data: { newPassword: string; currentPassword: string; confirmPassword: string }) => data.newPassword !== data.currentPassword, {
    message: "New password must be different from current temporary password",
    path: ["newPassword"],
  })
  .refine((data: { newPassword: string; currentPassword: string; confirmPassword: string }) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, isLoading, changePassword, logout } = useAuth();
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  const watchedNewPassword = form.watch("newPassword") || "";
  const watchedCurrentPassword = form.watch("currentPassword") || "";
  const watchedConfirmPassword = form.watch("confirmPassword") || "";

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
      } else if (!user.mustChangePassword) {
        router.push("/dashboard");
      }
    }
  }, [isLoading, user, router]);

  // Validation rules for visual checklist
  const hasMinLength = watchedNewPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(watchedNewPassword);
  const hasLowercase = /[a-z]/.test(watchedNewPassword);
  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(watchedNewPassword);
  const isDifferentFromCurrent =
    watchedCurrentPassword.length > 0 &&
    watchedNewPassword.length > 0 &&
    watchedNewPassword !== watchedCurrentPassword;
  const isMatch = watchedNewPassword.length > 0 && watchedNewPassword === watchedConfirmPassword;

  // Strength score
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

  const onSubmit = async (values: ChangePasswordFormValues) => {
    try {
      await changePassword(values.currentPassword, values.newPassword);
      setIsSuccess(true);
      toast.success("Password updated successfully! Welcome to Softvence.");
      setTimeout(() => {
        router.push("/dashboard");
      }, 700);
    } catch (err: any) {
      toast.error(err.message || "Failed to update password. Please verify your current password.");
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-background font-sans">
      {/* Top Corner Controls */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2">
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
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="h-8 text-xs gap-1.5"
        >
          <LogOut className="size-3.5" /> Sign Out
        </Button>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-md space-y-6">
        {/* Brand Title */}
        <div className="flex items-center justify-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Layers className="size-5" />
          </div>
          <span className="font-bold tracking-tight text-xl">Softvence</span>
        </div>

        {/* Card */}
        <Card className="border border-border p-6 sm:p-8 shadow-sm bg-card rounded-2xl space-y-5">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[11px] gap-1 py-0.5">
                <KeyRound className="size-3" /> First-Time Login
              </Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              Set Your Password
            </h1>
            <p className="text-xs text-muted-foreground">
              Please choose a secure permanent password to replace your temporary credentials before proceeding.
            </p>
          </div>

          {/* User Email Pill */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/60 text-xs text-muted-foreground border">
            <Mail className="size-3.5 text-foreground" />
            <span className="font-medium text-foreground">{user.email}</span>
            <span className="ml-auto text-[11px] font-semibold text-primary">{user.systemRole}</span>
          </div>

          {isSuccess ? (
            <div className="py-6 text-center space-y-3">
              <div className="mx-auto size-12 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="size-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold">Password Successfully Updated</h3>
                <p className="text-xs text-muted-foreground">Entering dashboard...</p>
              </div>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Current (Temporary) Password */}
                <FormField
                  control={form.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current / Temporary Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                          <Input
                            type={showCurrentPassword ? "text" : "password"}
                            placeholder="Enter temporary password"
                            className="pl-9 pr-9 text-sm h-10"
                            {...field}
                            disabled={isSubmitting}
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                            tabIndex={-1}
                          >
                            {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* New Password */}
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>New Permanent Password</FormLabel>
                        {watchedNewPassword.length > 0 && (
                          <span className={`text-[11px] font-semibold ${getStrengthLabel(strengthScore).color}`}>
                            {getStrengthLabel(strengthScore).label}
                          </span>
                        )}
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                          <Input
                            type={showNewPassword ? "text" : "password"}
                            placeholder="••••••••••••"
                            className="pl-9 pr-9 text-sm h-10"
                            {...field}
                            disabled={isSubmitting}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label={showNewPassword ? "Hide password" : "Show password"}
                            tabIndex={-1}
                          >
                            {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                      </FormControl>
                      {watchedNewPassword.length > 0 && (
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
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="••••••••••••"
                            className="pl-9 pr-9 text-sm h-10"
                            {...field}
                            disabled={isSubmitting}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
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

                {/* Requirement Checklist */}
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
                      <span className={hasMinLength ? "text-foreground font-medium" : "text-muted-foreground"}>
                        At least 8 characters
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {hasUppercase && hasLowercase ? (
                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                      ) : (
                        <XCircle className="size-3.5 text-muted-foreground/50" />
                      )}
                      <span className={hasUppercase && hasLowercase ? "text-foreground font-medium" : "text-muted-foreground"}>
                        Uppercase and lowercase letters
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {hasNumberOrSymbol ? (
                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                      ) : (
                        <XCircle className="size-3.5 text-muted-foreground/50" />
                      )}
                      <span className={hasNumberOrSymbol ? "text-foreground font-medium" : "text-muted-foreground"}>
                        At least one number or special symbol
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isDifferentFromCurrent ? (
                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                      ) : (
                        <XCircle className="size-3.5 text-muted-foreground/50" />
                      )}
                      <span className={isDifferentFromCurrent ? "text-foreground font-medium" : "text-muted-foreground"}>
                        Different from temporary password
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isMatch ? (
                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                      ) : (
                        <XCircle className="size-3.5 text-muted-foreground/50" />
                      )}
                      <span className={isMatch ? "text-foreground font-medium" : "text-muted-foreground"}>
                        Passwords match
                      </span>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full h-10 font-semibold text-sm gap-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Saving Password...
                    </>
                  ) : (
                    <>
                      Save Password & Continue <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </form>
            </Form>
          )}
        </Card>
      </div>
    </div>
  );
}
