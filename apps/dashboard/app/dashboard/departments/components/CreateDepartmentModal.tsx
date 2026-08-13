"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Switch } from "@workspace/ui/components/switch";
import {
  FieldSet,
  FieldGroup,
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@workspace/ui/components/field";
import { Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { createDepartmentSchema } from "@workspace/shared";

interface CreateDepartmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateDepartmentModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateDepartmentModalProps) {
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleReset = () => {
    setCode("");
    setName("");
    setIsActive(true);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate using shared Zod schema from @workspace/shared
    const validationResult = createDepartmentSchema.safeParse({
      code: code.trim(),
      name: name.trim(),
      isActive,
    });

    if (!validationResult.success) {
      const formattedErrors: Record<string, string> = {};
      validationResult.error.issues.forEach((issue) => {
        const fieldName = issue.path[0]?.toString();
        if (fieldName) {
          formattedErrors[fieldName] = issue.message;
        }
      });
      setErrors(formattedErrors);
      return;
    }

    setIsLoading(true);
    try {
      await api.post("/organization/departments", validationResult.data);

      toast.success(`Department '${validationResult.data.name}' created successfully!`);
      handleReset();
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      if (err.data?.message) {
        toast.error(err.data.message);
      } else {
        toast.error(err.message || "Failed to create department");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) handleReset();
      onOpenChange(val);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="size-5 text-primary" /> Create New Department
          </DialogTitle>
          <DialogDescription>
            Add a new organizational unit. Code must be unique across the organization.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <FieldSet>
            <FieldGroup>
              {/* Department Code Field */}
              <Field data-invalid={Boolean(errors.code)}>
                <FieldLabel htmlFor="create-dept-code">Department Code *</FieldLabel>
                <Input
                  id="create-dept-code"
                  placeholder="ENG"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    if (errors.code) setErrors((prev) => ({ ...prev, code: "" }));
                  }}
                  className="font-mono uppercase"
                  autoComplete="off"
                />
                <FieldDescription>
                  Unique uppercase identifier code (e.g. ENG, HR, FIN, MKT).
                </FieldDescription>
                <FieldError errors={errors.code} />
              </Field>

              {/* Department Name Field */}
              <Field data-invalid={Boolean(errors.name)}>
                <FieldLabel htmlFor="create-dept-name">Department Name *</FieldLabel>
                <Input
                  id="create-dept-name"
                  placeholder="Engineering & Technology"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                  }}
                  autoComplete="off"
                />
                <FieldDescription>
                  Full name of the department as shown on reports and invoices.
                </FieldDescription>
                <FieldError errors={errors.name} />
              </Field>

              {/* Active Status Switch Field */}
              <Field orientation="horizontal" className="rounded-lg border p-3 bg-muted/20">
                <div className="space-y-0.5">
                  <FieldLabel htmlFor="create-dept-active" className="cursor-pointer">
                    Active Status
                  </FieldLabel>
                  <FieldDescription>
                    Active departments can have designations and teams assigned to them.
                  </FieldDescription>
                </div>
                <Switch
                  id="create-dept-active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </Field>
            </FieldGroup>
          </FieldSet>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                handleReset();
                onOpenChange(false);
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Create Department
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
