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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Mail, Check, KeyRound, Loader2 } from "lucide-react";
import { forgotPasswordBodySchema, type ForgotPasswordDTO } from "@workspace/shared";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface ForgotPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmail?: string;
}

export function ForgotPasswordModal({
  open,
  onOpenChange,
  defaultEmail = "",
}: ForgotPasswordModalProps) {
  const [resetEmailSent, setResetEmailSent] = React.useState(false);

  const form = useForm<ForgotPasswordDTO>({
    resolver: zodResolver(forgotPasswordBodySchema),
    defaultValues: {
      email: defaultEmail || "",
    },
    mode: "onTouched",
  });

  React.useEffect(() => {
    if (defaultEmail) {
      form.setValue("email", defaultEmail, { shouldValidate: true });
    }
  }, [defaultEmail, form]);

  const onSubmit = async (values: ForgotPasswordDTO) => {
    try {
      await api.post("/auth/forgot-password", { email: values.email });
      setResetEmailSent(true);
      toast.success("Password reset instructions sent.");
    } catch (err: any) {
      toast.error(err.message || "Failed to request password reset.");
    }
  };

  const handleClose = () => {
    setResetEmailSent(false);
    form.reset();
    onOpenChange(false);
  };

  const isLoading = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
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
              Check your inbox for password reset instructions.
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Work Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                        <Input
                          type="email"
                          placeholder="name@company.com"
                          className="pl-9 text-sm h-10"
                          {...field}
                          disabled={isLoading}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleClose()}
                  className="text-xs"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" className="text-xs gap-1.5" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Instructions"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
