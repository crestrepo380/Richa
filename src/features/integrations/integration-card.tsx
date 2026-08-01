"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, ChevronDown, Plug, PlugZap, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CAPABILITY_LABELS } from "./types";
import type { IntegrationView } from "./queries";
import {
  disconnectIntegration,
  saveIntegration,
  testIntegration,
} from "./actions";
import { formatDateTime } from "@/lib/utils";

/**
 * One provider card: status, capabilities, and an expandable config form.
 * Secret fields show a "leave blank to keep" hint when already set, so a
 * stored credential is never surfaced or accidentally cleared.
 */
export function IntegrationCard({ integration }: { integration: IntegrationView }) {
  const { descriptor, status, config, secretsSet, connected, lastSyncAt } = integration;
  const [open, setOpen] = useState(false);
  const [saving, startSave] = useTransition();
  const [testing, startTest] = useTransition();
  const [disconnecting, startDisconnect] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleSave(formData: FormData) {
    setFieldErrors({});
    startSave(async () => {
      const result = await saveIntegration(descriptor.provider, undefined, formData);
      if (result.status === "success") toast.success(result.message ?? "Saved.");
      else {
        toast.error(result.message ?? "Could not save.");
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      }
    });
  }

  function handleTest() {
    startTest(async () => {
      const result = await testIntegration(descriptor.provider);
      if (result.status === "success") toast.success(result.message ?? "Connection OK.");
      else toast.message(result.message ?? "Test complete.");
    });
  }

  function handleDisconnect() {
    if (!confirm(`Disconnect ${descriptor.name}? Stored credentials will be removed.`)) return;
    startDisconnect(async () => {
      const result = await disconnectIntegration(descriptor.provider);
      if (result.status === "success") {
        toast.success(result.message ?? "Disconnected.");
        setOpen(false);
      }
    });
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{descriptor.name}</h3>
            <StatusBadge status={status} connected={connected} />
          </div>
          <p className="mt-0.5 text-xs uppercase tracking-wide text-muted">
            {descriptor.category}
          </p>
          <p className="mt-2 text-sm text-muted">{descriptor.description}</p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {descriptor.capabilities.map((cap) => (
              <Badge key={cap} tone="neutral">
                {CAPABILITY_LABELS[cap]}
              </Badge>
            ))}
          </div>

          {lastSyncAt && (
            <p className="mt-2 text-xs text-muted">
              Last sync {formatDateTime(lastSyncAt)}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-sm transition-colors hover:bg-surface-muted"
        >
          {connected ? "Manage" : "Connect"}
          <ChevronDown
            className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
      </div>

      {open && (
        <div className="border-t border-line bg-surface-muted/40 p-4">
          <form action={handleSave} className="space-y-3">
            {descriptor.configFields.map((field) => (
              <Input
                key={field.key}
                name={field.key}
                type={field.type === "password" ? "password" : field.type === "url" ? "url" : "text"}
                label={field.label}
                placeholder={field.placeholder}
                defaultValue={field.secret ? "" : config[field.key] ?? ""}
                error={fieldErrors[field.key]}
                hint={
                  field.secret && secretsSet[field.key]
                    ? "A value is saved. Leave blank to keep it."
                    : field.help
                }
                required={field.required && !(field.secret && secretsSet[field.key])}
              />
            ))}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button type="submit" size="sm" loading={saving}>
                <PlugZap className="size-4" aria-hidden />
                Save & connect
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={handleTest} loading={testing}>
                Test connection
              </Button>
              {connected && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleDisconnect}
                  loading={disconnecting}
                >
                  <Plug className="size-4" aria-hidden />
                  Disconnect
                </Button>
              )}
              {descriptor.docsUrl && (
                <a
                  href={descriptor.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto text-xs text-brand underline-offset-4 hover:underline"
                >
                  API docs ↗
                </a>
              )}
            </div>

            <p className="pt-1 text-xs text-muted">
              Scaffolded for a future release — credentials are stored securely,
              but live syncing isn&apos;t enabled yet.
            </p>
          </form>
        </div>
      )}
    </Card>
  );
}

function StatusBadge({
  status,
  connected,
}: {
  status: string;
  connected: boolean;
}) {
  if (status === "ERROR") {
    return (
      <Badge tone="danger">
        <XCircle className="mr-1 size-3" aria-hidden />
        Error
      </Badge>
    );
  }
  if (connected) {
    return (
      <Badge tone="success">
        <CheckCircle2 className="mr-1 size-3" aria-hidden />
        Connected
      </Badge>
    );
  }
  return <Badge tone="neutral">Not connected</Badge>;
}
