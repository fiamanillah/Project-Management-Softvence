"use client";

import * as React from "react";
import Link from "next/link";
import { useForm, zodResolver, z, Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@workspace/ui/components/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Separator } from "@workspace/ui/components/separator";
import { useAuth } from "@/lib/auth-context";
import { api, handleFormApiError } from "@/lib/api";
import { AvatarUpload } from "@/components/AvatarUpload";
import {
  User,
  Mail,
  IdCard,
  Building2,
  Briefcase,
  Shield,
  KeyRound,
  CheckCircle2,
  Clock,
  Loader2,
  Sparkles,
  ShieldCheck,
  Save,
} from "lucide-react";
import { toast } from "sonner";

const profileFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface FullUserProfile {
  id: string;
  email: string;
  employeeId?: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  systemRole: "SuperAdmin" | "Admin" | "Staff";
  status: "INVITED" | "ACTIVE" | "INACTIVE" | "SUSPENDED" | "LOCKED" | "ARCHIVED";
  isActive: boolean;
  mustChangePassword?: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  role?: {
    id: string;
    code: string;
    name: string;
    department?: {
      id: string;
      code: string;
      name: string;
    } | null;
  } | null;
  designation?: {
    id: string;
    code: string;
    name: string;
    department?: {
      id: string;
      code: string;
      name: string;
    } | null;
  } | null;
}

export default function ProfilePage() {
  const { user: authUser, updateUser } = useAuth();
  const [profile, setProfile] = React.useState<FullUserProfile | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
    },
  });

  const fetchProfile = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.get<FullUserProfile>("/users/me");
      if (data) {
        setProfile(data);
        form.reset({
          firstName: data.firstName || "",
          lastName: data.lastName || "",
        });
        updateUser({
          id: data.id,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          avatarUrl: data.avatarUrl,
          systemRole: data.systemRole,
          status: data.status,
          isActive: data.isActive,
        });
      }
    } catch (err: any) {
      toast.error("Failed to load profile", {
        description: err.message || "Please refresh the page to try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [form, updateUser]);

  React.useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const onSubmit = async (values: ProfileFormValues) => {
    setIsSaving(true);
    try {
      const updated = await api.patch<FullUserProfile>("/users/me", {
        firstName: values.firstName,
        lastName: values.lastName,
      });

      setProfile(updated);
      updateUser({
        firstName: updated.firstName,
        lastName: updated.lastName,
      });
      toast.success("Profile updated successfully");
    } catch (err: any) {
      const msg = handleFormApiError(err, form.setError);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = (newAvatarUrl: string | null) => {
    if (profile) {
      setProfile({
        ...profile,
        avatarUrl: newAvatarUrl,
      });
    }
    updateUser({
      avatarUrl: newAvatarUrl,
    });
  };

  const getSystemRoleBadge = (role?: string) => {
    switch (role) {
      case "SuperAdmin":
        return (
          <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 gap-1 font-semibold">
            <Sparkles className="size-3" /> SuperAdmin
          </Badge>
        );
      case "Admin":
        return (
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 gap-1 font-semibold">
            <ShieldCheck className="size-3" /> Admin
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground gap-1 font-normal">
            <User className="size-3" /> Staff
          </Badge>
        );
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1">
            <CheckCircle2 className="size-3" /> Active
          </Badge>
        );
      case "INVITED":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1">
            <Clock className="size-3" /> Invited
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status || "Active"}</Badge>;
    }
  };

  const fullName = profile
    ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || profile.email
    : authUser?.firstName || authUser?.email || "User Profile";

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-in fade-in-50 duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <User className="size-7 text-primary" /> My Profile & Account Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your personal details, profile picture, and security preferences.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {profile?.systemRole && getSystemRoleBadge(profile.systemRole)}
          {profile?.status && getStatusBadge(profile.status)}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm">Loading profile information...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column: Avatar & Summary */}
          <div className="lg:col-span-1 space-y-6">
            {/* Avatar Card */}
            <Card className="border-border/60 shadow-xs backdrop-blur-xs bg-card/90">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-lg">Profile Picture</CardTitle>
                <CardDescription className="text-xs">
                  Your avatar is visible to team members across projects.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center pt-2 pb-6">
                <AvatarUpload
                  currentAvatarUrl={profile?.avatarUrl}
                  fallbackName={fullName}
                  size="xl"
                  onAvatarChange={handleAvatarChange}
                  className="flex-col items-center"
                />
              </CardContent>
            </Card>

            {/* Organization Metadata Card */}
            <Card className="border-border/60 shadow-xs bg-card/90">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="size-4 text-primary" /> Organization Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3.5 text-xs">
                {profile?.employeeId && (
                  <div className="flex items-center justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <IdCard className="size-3.5" /> Employee ID
                    </span>
                    <span className="font-mono font-semibold text-foreground">
                      #{profile.employeeId}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Mail className="size-3.5" /> Email
                  </span>
                  <span className="font-mono text-foreground truncate max-w-[170px]" title={profile?.email}>
                    {profile?.email}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Shield className="size-3.5" /> Security Role
                  </span>
                  <span className="font-semibold text-foreground">
                    {profile?.role?.name || profile?.systemRole || "Staff"}
                  </span>
                </div>

                {profile?.designation && (
                  <div className="flex items-center justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Briefcase className="size-3.5" /> Designation
                    </span>
                    <span className="font-semibold text-foreground truncate max-w-[170px]">
                      {profile.designation.name}
                    </span>
                  </div>
                )}

                {profile?.designation?.department && (
                  <div className="flex items-center justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Building2 className="size-3.5" /> Department
                    </span>
                    <span className="font-semibold text-foreground truncate max-w-[170px]">
                      {profile.designation.department.name}
                    </span>
                  </div>
                )}

                {profile?.lastLoginAt && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Clock className="size-3.5" /> Last Login
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(profile.lastLoginAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Personal Information & Security */}
          <div className="lg:col-span-2 space-y-6">
            {/* Edit Personal Info Card */}
            <Card className="border-border/60 shadow-xs bg-card/90">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="size-5 text-primary" /> Personal Information
                </CardTitle>
                <CardDescription>
                  Update your basic personal details. Contact administrators for employee ID or security role changes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold">First Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter your first name"
                                className="h-9 text-sm"
                                disabled={isSaving}
                                {...field}
                              />
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
                            <FormLabel className="text-xs font-semibold">Last Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter your last name"
                                className="h-9 text-sm"
                                disabled={isSaving}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">
                          Email Address
                        </label>
                        <Input
                          value={profile?.email || ""}
                          disabled
                          className="h-9 text-sm bg-muted/50 cursor-not-allowed font-mono text-muted-foreground"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Managed by your organization.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">
                          Employee ID
                        </label>
                        <Input
                          value={profile?.employeeId || "N/A"}
                          disabled
                          className="h-9 text-sm bg-muted/50 cursor-not-allowed font-mono text-muted-foreground"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Unique corporate identifier.
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button
                        type="submit"
                        disabled={isSaving}
                        className="h-9 px-4 text-xs font-semibold gap-1.5 shadow-xs"
                      >
                        {isSaving ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Save className="size-4" />
                        )}
                        <span>Save Changes</span>
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Security Preferences Card */}
            <Card className="border-border/60 shadow-xs bg-card/90">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <KeyRound className="size-5 text-primary" /> Security & Credentials
                </CardTitle>
                <CardDescription>
                  Keep your account secure by updating your permanent password regularly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-lg border bg-muted/20">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-foreground">Password</p>
                    <p className="text-[11px] text-muted-foreground">
                      Secured with Argon2id cryptographic hashing.
                    </p>
                  </div>
                  <Link href="/change-password">
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                      <KeyRound className="size-3.5" /> Change Password
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
