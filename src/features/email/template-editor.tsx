"use client";

import { useActionState, useState, useTransition } from "react";
import { AlertCircle, RotateCcw, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { renderText } from "@/lib/email/template";
import {
  resetTemplate,
  saveTemplate,
  sendTestEmail,
  type TemplateActionState,
} from "./template-actions";

const SAMPLE: Record<string, string> = {
  dealer_name: "Sample Dealer",
  week: "Jul 27 – Aug 2, 2026",
  reminder_number: "1",
  update_button: "[ Update Inventory ]",
};

/**
 * Template editor with a live plain-text preview. The preview substitutes
 * sample values so a super-admin sees the shape of the message before sending a
 * real test email through Resend.
 */
export function TemplateEditor({
  name,
  isOverridden,
  defaults,
}: {
  name: string;
  isOverridden: boolean;
  defaults: { subject: string; body: string; active: boolean; variables: string[] };
}) {
  const boundSave = saveTemplate.bind(null, name);
  const [state, formAction, pending] = useActionState<
    TemplateActionState | undefined,
    FormData
  >(async (prev, formData) => {
    const result = await boundSave(prev, formData);
    if (result.status === "success") toast.success(result.message ?? "Saved.");
    return result;
  }, undefined);

  const [subject, setSubject] = useState(defaults.subject);
  const [body, setBody] = useState(defaults.body);
  const [isTesting, startTest] = useTransition();
  const [isResetting, startReset] = useTransition();

  function handleTest() {
    startTest(async () => {
      const result = await sendTestEmail(name, subject, body);
      if (result.status === "success") toast.success(result.message ?? "Sent.");
      else toast.error(result.message ?? "Could not send.");
    });
  }

  function handleReset() {
    if (!confirm("Revert this template to the built-in default?")) return;
    startReset(async () => {
      const result = await resetTemplate(name);
      if (result.status === "success") {
        toast.success(result.message ?? "Reverted.");
        window.location.reload();
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-5">
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
            name="subject"
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            error={state?.fieldErrors?.subject}
          />

          <div className="space-y-1.5">
            <label htmlFor="body" className="block text-sm font-medium">
              Body
            </label>
            <textarea
              id="body"
              name="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 font-mono text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            />
            {state?.fieldErrors?.body && (
              <p role="alert" className="text-xs text-danger">
                {state.fieldErrors.body}
              </p>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="active"
              defaultChecked={defaults.active}
              className="size-4 rounded border-line"
            />
            Active (use this instead of the built-in default)
          </label>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button type="submit" loading={pending}>
              <Save className="size-4" aria-hidden />
              Save template
            </Button>
            <Button type="button" variant="secondary" onClick={handleTest} loading={isTesting}>
              <Send className="size-4" aria-hidden />
              Send test to me
            </Button>
            {isOverridden && (
              <Button type="button" variant="ghost" onClick={handleReset} loading={isResetting}>
                <RotateCcw className="size-4" aria-hidden />
                Revert to default
              </Button>
            )}
          </div>
        </form>
      </Card>

      <div className="space-y-4">
        <Card className="p-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            Live preview
          </p>
          <p className="mb-3 border-b border-line pb-3 font-semibold">
            {renderText(subject, SAMPLE) || "—"}
          </p>
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {renderText(body, SAMPLE) || "—"}
          </div>
        </Card>

        <Card className="p-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            Available variables
          </p>
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(SAMPLE).map((v) => (
              <Badge key={v} tone="neutral">{`{{${v}}}`}</Badge>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">
            Use <code className="rounded bg-surface-muted px-1">{"{{update_button}}"}</code> where
            the dealer&apos;s one-click inventory button should appear.
          </p>
        </Card>
      </div>
    </div>
  );
}
