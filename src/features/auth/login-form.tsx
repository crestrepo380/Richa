"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import { sendMagicLink, signInWithPassword } from "./actions";

type Mode = "password" | "magic";

/**
 * Login form. React Hook Form + Zod give instant field-level feedback, then the
 * submission goes through a Server Action that re-validates with the same
 * schema — the client checks are purely for UX.
 */
export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [mode, setMode] = useState<Mode>("password");
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverSuccess, setServerSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  function onPasswordSubmit(values: LoginInput) {
    setServerError(null);
    setServerSuccess(null);

    const formData = new FormData();
    formData.set("email", values.email);
    formData.set("password", values.password);
    if (redirectTo) formData.set("redirectTo", redirectTo);

    startTransition(async () => {
      // On success the action redirects, so control does not return here.
      const result = await signInWithPassword(undefined, formData);
      if (result?.error) setServerError(result.error);
    });
  }

  async function onMagicLinkSubmit() {
    setServerError(null);
    setServerSuccess(null);

    const emailValid = await trigger("email");
    if (!emailValid) return;

    const formData = new FormData();
    formData.set("email", getValues("email"));

    startTransition(async () => {
      const result = await sendMagicLink(undefined, formData);
      if (result?.error) setServerError(result.error);
      if (result?.success) setServerSuccess(result.success);
    });
  }

  return (
    <div className="space-y-5">
      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-danger-muted px-3 py-2.5 text-sm text-danger"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{serverError}</span>
        </div>
      )}

      {serverSuccess && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg bg-success-muted px-3 py-2.5 text-sm text-success"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{serverSuccess}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-4" noValidate>
        <Input
          {...register("email")}
          type="email"
          label="Email address"
          autoComplete="email"
          placeholder="you@dealership.com"
          error={errors.email?.message}
        />

        {mode === "password" && (
          <Input
            {...register("password")}
            type="password"
            label="Password"
            autoComplete="current-password"
            error={errors.password?.message}
          />
        )}

        {mode === "password" ? (
          <Button type="submit" size="lg" loading={isPending} className="w-full">
            Sign in
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            loading={isPending}
            onClick={onMagicLinkSubmit}
            className="w-full"
          >
            <Mail className="size-4" aria-hidden />
            Email me a sign-in link
          </Button>
        )}
      </form>

      <div className="text-center">
        <button
          type="button"
          onClick={() => {
            setMode(mode === "password" ? "magic" : "password");
            setServerError(null);
            setServerSuccess(null);
          }}
          className="text-sm text-brand underline-offset-4 hover:underline"
        >
          {mode === "password"
            ? "Sign in with an email link instead"
            : "Sign in with a password instead"}
        </button>
      </div>
    </div>
  );
}
