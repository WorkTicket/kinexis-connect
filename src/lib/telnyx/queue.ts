import { createSupabaseServiceClient } from "@/lib/db/supabase";

export async function queueConsentText(call: {
  id: string;
  business_id: string;
  contact_id: string | null;
  telnyx_call_control_id: string;
}) {
  if (!call.contact_id) return false;
  const svc = createSupabaseServiceClient();
  const idempotencyKey = `telnyx-consent:${call.business_id}:${call.telnyx_call_control_id}`;
  const { data: existing } = await svc.from("outbound_jobs").select("id").eq("idempotency_key", idempotencyKey).maybeSingle();
  if (existing) return true;

  const { data: conversation } = await svc.from("conversations").upsert({
    business_id: call.business_id,
    contact_id: call.contact_id,
    last_message_at: new Date().toISOString(),
    status: "open",
  }, { onConflict: "business_id,contact_id" }).select("id").single();
  if (!conversation) return false;

  const { data: message } = await svc.from("messages").insert({
    business_id: call.business_id,
    conversation_id: conversation.id,
    contact_id: call.contact_id,
    call_id: call.id,
    direction: "outbound",
    kind: "auto_reply",
    body: "PENDING",
    status: "queued",
  }).select("id").single();
  if (!message) return false;

  const { error } = await svc.from("outbound_jobs").insert({
    business_id: call.business_id,
    message_id: message.id,
    idempotency_key: idempotencyKey,
    status: "queued",
    next_attempt_at: new Date().toISOString(),
  });
  if (error) {
    await svc.from("messages").delete().eq("id", message.id);
    return error.code === "23505";
  }
  await svc.from("calls").update({ sms_action: "queued", updated_at: new Date().toISOString() }).eq("id", call.id);
  return true;
}
