import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/db/supabase";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${process.env.INTERNAL_JOB_SECRET}`) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_MESSAGING_SERVICE_SID) {
    return NextResponse.json({ error: { code: "provider_not_configured", message: "Twilio delivery is not configured" }, processed: 0 }, { status: 503 });
  }
  const svc = createSupabaseServiceClient();
  const now = new Date().toISOString();
  const { data: jobs } = await svc.from("outbound_jobs").select("*").eq("status", "queued").lte("next_attempt_at", now).limit(50);
  const processed = 0;
  for (const job of jobs ?? []) {
    await svc.from("outbound_jobs").update({ status: "processing", updated_at: now }).eq("id", job.id).eq("status", "queued");
    // The provider delivery adapter is intentionally isolated until Twilio is configured.
    await svc.from("outbound_jobs").update({ status: "queued", last_error_code: "provider_adapter_pending", attempts: (job.attempts ?? 0) + 1, next_attempt_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), updated_at: new Date().toISOString() }).eq("id", job.id);
  }
  return NextResponse.json({ processed });
}
