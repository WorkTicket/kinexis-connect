import { NextResponse } from "next/server";
import { verifyTwilioSignature } from "@/lib/security/twilio";
import { createSupabaseServiceClient } from "@/lib/db/supabase";

function xml(body: string) {
  return new NextResponse(body, { status: 200, headers: { "Content-Type": "text/xml" } });
}

export async function POST(req: Request) {
  const formData = await req.formData();
  const params: Record<string, string> = {};
  formData.forEach((v, k) => { params[k] = String(v); });

  const signature = req.headers.get("x-twilio-signature") ?? "";
  const authToken = process.env.TWILIO_AUTH_TOKEN ?? "";
  const publicUrl = process.env.NEXT_PUBLIC_APP_URL + "/api/webhooks/twilio/dial-result";
  if (!(await verifyTwilioSignature(authToken, signature, publicUrl, params))) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  if (params.AccountSid !== process.env.TWILIO_ACCOUNT_SID) return new NextResponse("Forbidden", { status: 403 });

  const callSid = params.CallSid;
  const dialStatus = params.DialCallStatus;
  const svc = createSupabaseServiceClient();

  const { data: call } = await svc.from("calls").select("*").eq("twilio_call_sid", callSid).maybeSingle();
  if (!call) return xml("<Response/>");

  let status = call.status;
  let smsAction = call.sms_action;
  let skipReason: string | null = null;

  if (dialStatus === "completed") {
    status = "answered";
  } else if (dialStatus === "no-answer") {
    status = "missed";
    smsAction = "queued";
  } else if (dialStatus === "busy") {
    status = "busy";
    smsAction = "queued";
  } else {
    status = dialStatus === "failed" ? "failed" : dialStatus === "canceled" ? "canceled" : "unknown";
    smsAction = "skipped";
    skipReason = "carrier_or_abandonment";
  }

  await svc.from("calls").update({
    status,
    dial_status: dialStatus,
    sms_action: smsAction,
    sms_skip_reason: skipReason,
    ended_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("twilio_call_sid", callSid);

  if (smsAction === "queued") {
    // create candidate job placeholder; worker evaluates eligibility
    const idempotencyKey = `missed:${call.business_id}:${callSid}`;
    // find or create message row minimal? We'll create a queued message + job
    const { data: conv } = await svc.from("conversations").select("id").eq("business_id", call.business_id).eq("contact_id", call.contact_id).maybeSingle();
    // conversation may not exist; create if contact present
    let conversationId = conv?.id;
    if (!conversationId && call.contact_id) {
      const { data: newConv } = await svc.from("conversations").upsert(
        { business_id: call.business_id, contact_id: call.contact_id, last_message_at: new Date().toISOString() },
        { onConflict: "business_id,contact_id" }
      ).select().maybeSingle();
      conversationId = newConv?.id;
    }
    if (conversationId) {
      const { data: msg } = await svc.from("messages").insert({
        business_id: call.business_id,
        conversation_id: conversationId,
        contact_id: call.contact_id,
        call_id: call.id,
        direction: "outbound",
        kind: "auto_reply",
        body: "PENDING",
        status: "queued",
      }).select().maybeSingle();
      if (msg) {
        await svc.from("outbound_jobs").upsert(
          { business_id: call.business_id, message_id: msg.id, idempotency_key: idempotencyKey, status: "queued", next_attempt_at: new Date().toISOString() },
          { onConflict: "idempotency_key" }
        );
      }
    }
  }

  return xml("<Response><Hangup/></Response>");
}
