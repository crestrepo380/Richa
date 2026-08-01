import { type NextRequest } from "next/server";
import { getServerEnv } from "@/lib/env";
import { runWeeklyReminders } from "@/features/email/reminders";

/**
 * Weekly reminder cron endpoint.
 *
 * Scheduled daily (see vercel.json); the job itself decides whether today is a
 * reminder day. Protected by a shared secret so only the scheduler — not the
 * public internet — can trigger a send. Vercel Cron sends the secret as a
 * Bearer token in the Authorization header; a `?secret=` query param is also
 * accepted for manual/other schedulers.
 *
 * Never cached — always runs live.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const env = getServerEnv();

  if (!env.CRON_SECRET) {
    return Response.json(
      { error: "CRON_SECRET is not configured." },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization");
  const querySecret = request.nextUrl.searchParams.get("secret");
  const provided = authHeader?.replace(/^Bearer\s+/i, "") ?? querySecret;

  if (provided !== env.CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const summary = await runWeeklyReminders();
    return Response.json({ ok: true, summary });
  } catch (error) {
    console.error("[cron] reminder run failed", error);
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "unknown" },
      { status: 500 },
    );
  }
}
