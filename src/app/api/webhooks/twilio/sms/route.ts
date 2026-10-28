import { NextResponse } from "next/server";
import { verifyTwilioSignature } from "@/lib/security/twilio";
import { createSupabaseServiceClient } from "@/lib/db/supabase";

function xml(body: string) {
  return new NextResponse(body, { status: 200, headers: { "Content-Type": "text/xml" } });
}

const OPT_OUT_KEYWORDS = ["STOP", "STOPALL", "UNSUBSCRIBE", "END", "QUIT", "CANCEL", "REVOKE", "OPTOUT"];

export async function POST(req: Request) {
  const formData = await req.formData();
  const params: Record<string, string> = {};
  formData.forEach((v, k) => { params[k] = String(v); });

  const signature = req.headers.get("x-twilio-signature") ?? "";
  const authToken = process.env.TWILIO_AUTH_TOKEN ?? "";
  const publicUrl = process.env.NEXT_PUBLIC_APP_URL + "/api/webhooks/twilio/sms";
  if (!(await verifyTwilioSignature(authToken, signature, publicUrl, params))) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  if (params.AccountSid !== process.env.TWILIO_ACCOUNT_SID) return new NextResponse("Forbidden", { status: 403 });

  const to = params.To;
  const from = params.From;
  const sid = params.MessageSid;
  const body = params.Body ?? "";
  if (!to || !from || !sid) return new NextResponse("Bad Request", { status: 400 });

  const svc = createSupabaseServiceClient();
  const { data: phone } = await svc.from("phone_numbers").select("*").eq("e164", to).maybeSingle();
  if (!phone) return xml("<Response/>");

  // dedup
  const { data: existing } = await svc.from("messages").select("id").eq("twilio_message_sid", sid).maybeSingle();
  if (existing) return xml("<Response/>");

  const { data: contact } = await svc.from("contacts").upsert(
    { business_id: phone.business_id, phone_e164: from, last_inbound_at: new Date().toISOString() },
    { onConflict: "business_id,phone_e164" }
  ).select().maybeSingle();

  const { data: conv } = await svc.from("conversations").upsert(
    { business_id: phone.business_id, contact_id: contact!.id, last_message_at: new Date().toISOString(), status: "open" },
    { onConflict: "business_id,contact_id" }
  ).select().maybeSingle();

  const upper = body.trim().toUpperCase();
  if (OPT_OUT_KEYWORDS.includes(upper)) {
    await svc.from("contacts").update({ opt_out: true }).eq("id", contact!.id);
    await svc.from("consent_events").insert({
      business_id: phone.business_id,
      contact_id: contact!.id,
      consent_type: "service_sms",
      status: "revoked",
      source: "sms_keyword",
      evidence_reference: `MessageSid:${sid}`,
    });
  }

  await svc.from("messages").insert({
    business_id: phone.business_id,
    conversation_id: conv!.id,
    contact_id: contact!.id,
    direction: "inbound",
    kind: "customer",
    twilio_message_sid: sid,
    body,
    status: "received",
  });

  return xml("<Response/>");
}
