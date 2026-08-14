"use client";

import * as React from "react";
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
import { Label } from "@workspace/ui/components/label";
import { Card } from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, Check, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { loginUserBodySchema, type LoginUserDTO } from "@workspace/shared";
import { handleFormApiError } from "@/lib/api";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";

interface LoginFormProps {
  onForgotPasswordClick: () => void;
  onRequestAccessClick: () => void;
  onSuccess: (targetUrl?: string) => void;
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
  const [showPassword, setShowPassword] = React.useState(false);
  const [authSuccess, setAuthSuccess] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(true);
  const [isFirstLogin, setIsFirstLogin] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);

  const form = useForm<LoginUserDTO>({
    resolver: zodResolver(loginUserBodySchema),
    defaultValues: {
      email: email || "",
      password: "",
    },
    mode: "onTouched",
  });

  // Sync external email prop if changed
  React.useEffect(() => {
    if (email && form.getValues("email") !== email) {
      form.setValue("email", email, { shouldValidate: true });
    }
  }, [email, form]);

  const onSubmit = async (values: LoginUserDTO) => {
    setApiError(null);
    try {
      const loggedUser = await login(values.email, values.password);
      setAuthSuccess(true);
      if (loggedUser.mustChangePassword) {
        setIsFirstLogin(true);
        toast.info("First login: Please set your permanent password.");
        setTimeout(() => {
          onSuccess("/change-password");
        }, 500);
      } else {
        toast.success("Successfully logged in!");
        setTimeout(() => {
          onSuccess("/dashboard");
        }, 500);
      }
    } catch (err: any) {
      const message = handleFormApiError(err, form.setError, "Failed to log in. Please check your credentials.");
      
      // Specifically format standard auth error messages
      if (
        message.toLowerCase().includes("invalid email or password") ||
        message.toLowerCase().includes("invalid credentials") ||
        err?.statusCode === 401
      ) {
        const authMsg = "Invalid email or password. Please verify your credentials and try again.";
        setApiError(authMsg);
        toast.error(authMsg);
        form.setError("password", { type: "server", message: "Invalid credentials" });
      } else if (
        message.toLowerCase().includes("inactive") ||
        message.toLowerCase().includes("disabled")
      ) {
        const disabledMsg = "This account is inactive or disabled. Please contact your organization administrator.";
        setApiError(disabledMsg);
        toast.error(disabledMsg);
      } else {
        setApiError(message);
        toast.error(message);
      }
    }
  };


  if (authSuccess) {
    return (
      <Card className="border border-emerald-500/30 bg-emerald-500/5 text-center p-8 space-y-4 shadow-sm rounded-xl">
        <div className="mx-auto size-12 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
          <Check className="size-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold">{isFirstLogin ? "Setting Up First Login" : "Authenticated"}</h2>
          <p className="text-xs text-muted-foreground">
            {isFirstLogin ? "Redirecting to password setup..." : "Redirecting to dashboard..."}
          </p>
        </div>
      </Card>
    );
  }

  const isLoading = form.formState.isSubmitting;

  return (
    <Card className="border border-border p-6 sm:p-8 shadow-sm bg-card rounded-2xl space-y-5">
      <div className="space-y-1.5 text-center sm:text-left">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Sign in</h1>
        <p className="text-xs text-muted-foreground">
          Enter your work email and password to sign in.
        </p>
      </div>

      {apiError && (
        <Alert variant="destructive" className="border-destructive/30 bg-destructive/10 text-destructive text-xs py-2.5 px-3">
          <AlertCircle className="size-4 shrink-0 text-destructive" />
          <AlertDescription className="text-xs font-medium text-destructive leading-relaxed">
            {apiError}
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="name@company.com"
                      className="pl-9 text-sm h-10"
                      {...field}
                      onChange={(e) => {
                        if (apiError) setApiError(null);
                        field.onChange(e);
                        setEmail(e.target.value);
                      }}
                      disabled={isLoading}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Password</FormLabel>
                  <button
                    type="button"
                    onClick={onForgotPasswordClick}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Forgot password?
                  </button>
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
                      disabled={isLoading}
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
                <FormMessage />
              </FormItem>
            )}
          />


          <div className="flex items-center space-x-2 pt-1">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(!!checked)}
              disabled={isLoading}
            />
            <Label
              htmlFor="remember"
              className="text-xs text-muted-foreground cursor-pointer font-normal"
            >
              Remember me for 30 days
            </Label>
          </div>

          <Button
            type="submit"
            className="w-full h-10 font-semibold text-sm gap-2"
            disabled={isLoading}
          >
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
      </Form>

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
