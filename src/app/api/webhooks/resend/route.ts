import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { verifyResendSignature } from "@/lib/email/verify-webhook";

/**
 * Resend event webhook — updates notification open/click tracking.
 *
 * The signature is verified when RESEND_WEBHOOK_SECRET is set (recommended in
 * production). Events are matched to a notification by the Resend message id we
 * stored when sending. Unknown ids are acknowledged with 200 so Resend doesn't
 * retry events for emails this app didn't record.
 */
export const dynamic = "force-dynamic";

interface ResendEvent {
  type: string;
  data?: { email_id?: string };
}

export async function POST(request: NextRequest) {
  const env = getServerEnv();
  const rawBody = await request.text();

  if (env.RESEND_WEBHOOK_SECRET) {
    const valid = verifyResendSignature({
      secret: env.RESEND_WEBHOOK_SECRET,
      headers: {
        id: request.headers.get("svix-id"),
        timestamp: request.headers.get("svix-timestamp"),
        signature: request.headers.get("svix-signature"),
      },
      rawBody,
    });
    if (!valid) return new Response("Invalid signature", { status: 401 });
  }

  let event: ResendEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const messageId = event.data?.email_id;
  if (!messageId) return Response.json({ ok: true });

  const update =
    event.type === "email.opened"
      ? { opened: true }
      : event.type === "email.clicked"
        ? { opened: true, clicked: true }
        : null;

  if (update) {
    // updateMany (not update) so an unknown id is a no-op rather than a throw.
    await prisma.notification.updateMany({
      where: { providerMessageId: messageId },
      data: update,
    });
  }

  return Response.json({ ok: true });
}
