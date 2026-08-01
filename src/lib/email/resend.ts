import "server-only";

import { Resend } from "resend";
import { getServerEnv } from "@/lib/env";

/**
 * Thin Resend wrapper.
 *
 * Degrades gracefully when RESEND_API_KEY is absent: instead of throwing, it
 * logs the email and reports `skipped`, so local development and the seeded
 * demo work without an email provider, and a missing key never crashes the
 * reminder job in a way that would wedge the weekly workflow.
 */

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export type SendResult =
  | { ok: true; id: string | null; skipped?: false }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped?: false; error: string };

let client: Resend | null = null;

function getClient(apiKey: string): Resend {
  if (!client) client = new Resend(apiKey);
  return client;
}

export async function sendEmail(input: SendEmailInput): Promise<SendResult> {
  const env = getServerEnv();

  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    console.info(
      `[email] RESEND not configured — would send to ${input.to}: "${input.subject}"`,
    );
    return { ok: false, skipped: true, reason: "email_not_configured" };
  }

  try {
    const { data, error } = await getClient(env.RESEND_API_KEY).emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
    });

    if (error) {
      console.error("[email] send failed", error);
      return { ok: false, error: error.message };
    }

    return { ok: true, id: data?.id ?? null };
  } catch (error) {
    console.error("[email] send threw", error);
    return { ok: false, error: error instanceof Error ? error.message : "unknown" };
  }
}
