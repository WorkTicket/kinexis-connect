import { createSupabaseServiceClient } from "@/lib/db/supabase";
import { verifyTelnyxSignature } from "@/lib/security/telnyx";
import type { TelnyxEvent } from "@/lib/telnyx/types";

type AcceptedWebhook = {
  event: TelnyxEvent;
  duplicate: boolean;
};

export async function acceptTelnyxWebhook(req: Request): Promise<AcceptedWebhook> {
  const rawBody = await req.text();
  const verified = await verifyTelnyxSignature({
    rawBody,
    signature: req.headers.get("telnyx-signature-ed25519") ?? "",
    timestamp: req.headers.get("telnyx-timestamp") ?? "",
    publicKey: process.env.TELNYX_PUBLIC_KEY ?? "",
  });
  if (!verified) throw new Error("invalid_signature");

  let event: TelnyxEvent;
  try {
    event = JSON.parse(rawBody) as TelnyxEvent;
  } catch {
    throw new Error("invalid_payload");
  }
  if (!event?.data?.id || !event.data.event_type || !event.data.payload) {
    throw new Error("invalid_payload");
  }

  const payload = event.data.payload;
  const svc = createSupabaseServiceClient();
  const { error } = await svc.from("telnyx_events").insert({
    event_id: event.data.id,
    event_type: event.data.event_type,
    occurred_at: event.data.occurred_at ?? null,
    call_control_id: typeof payload.call_control_id === "string" ? payload.call_control_id : null,
    message_id: typeof payload.id === "string" ? payload.id : null,
    payload,
    status: "received",
    attempts: event.meta?.attempt ?? 0,
  });
  if (!error) return { event, duplicate: false };
  if (error.code === "23505") return { event, duplicate: true };
  throw new Error("event_storage_failed");
}

export async function finishTelnyxEvent(
  eventId: string,
  status: "processed" | "failed" | "ignored",
  values: { business_id?: string; error_code?: string } = {},
) {
  await createSupabaseServiceClient().from("telnyx_events").update({
    status,
    business_id: values.business_id,
    error_code: values.error_code,
    processed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("event_id", eventId);
}
