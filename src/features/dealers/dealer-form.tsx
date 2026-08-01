"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import type { DealerActionState } from "./actions";

type Action = (
  prev: DealerActionState | undefined,
  formData: FormData,
) => Promise<DealerActionState>;

interface DealerDefaults {
  company: string;
  contactName: string;
  email: string;
  phone: string;
  active: boolean;
}

/**
 * Shared create/edit dealer form. Uses `useActionState`, so the server action
 * re-validates and returns field errors that render inline — the client checks
 * are convenience, the server is the authority.
 */
export function DealerForm({
  action,
  defaults,
  mode,
}: {
  action: Action;
  defaults?: Partial<DealerDefaults>;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.status === "success") {
      toast.success(state.message ?? "Saved.");
      router.push("/admin/dealers");
      router.refresh();
    }
  }, [state, router]);

  return (
    <Card className="max-w-xl p-6">
      <form action={formAction} className="space-y-4">
        {state?.status === "error" && state.message && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg bg-danger-muted px-3 py-2.5 text-sm text-danger"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{state.message}</span>
          </div>
        )}

        <Input
          name="company"
          label="Company"
          defaultValue={defaults?.company}
          error={state?.fieldErrors?.company}
          required
        />
        <Input
          name="contactName"
          label="Contact name"
          defaultValue={defaults?.contactName}
          error={state?.fieldErrors?.contactName}
          required
        />
        <Input
          name="email"
          type="email"
          label="Email"
          defaultValue={defaults?.email}
          error={state?.fieldErrors?.email}
          hint="Used for weekly reminders and as the dealer's login."
          required
        />
        <Input
          name="phone"
          label="Phone"
          defaultValue={defaults?.phone}
          error={state?.fieldErrors?.phone}
        />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={defaults?.active ?? true}
            className="size-4 rounded border-line"
          />
          Active
        </label>

        {mode === "create" && (
          <label className="flex items-start gap-2 rounded-lg bg-surface-muted px-3 py-2.5 text-sm">
            <input
              type="checkbox"
              name="createLogin"
              className="mt-0.5 size-4 rounded border-line"
            />
            <span>
              Send a login invite to this dealer now
              <span className="block text-xs text-muted">
                They&apos;ll get an email to set up access to their inventory.
              </span>
            </span>
          </label>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Button type="submit" loading={pending}>
            {mode === "create" ? "Create dealer" : "Save changes"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/admin/dealers")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
