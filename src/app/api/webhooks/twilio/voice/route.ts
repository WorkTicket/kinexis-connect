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
  const publicUrl = process.env.NEXT_PUBLIC_APP_URL + "/api/webhooks/twilio/voice";
  if (!(await verifyTwilioSignature(authToken, signature, publicUrl, params))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const accountSid = params.AccountSid;
  if (accountSid !== process.env.TWILIO_ACCOUNT_SID) return new NextResponse("Forbidden", { status: 403 });

  const to = params.To;
  const from = params.From;
  const callSid = params.CallSid;
  if (!to || !from || !callSid) return new NextResponse("Bad Request", { status: 400 });

  const svc = createSupabaseServiceClient();
  const phone = (await svc.from("phone_numbers").select("*, businesses(*)").eq("e164", to).maybeSingle()).data;
  if (!phone) return xml("<Response><Say>Number not configured.</Say><Hangup/></Response>");

  const { data: settings } = await svc.from("business_settings").select("*").eq("business_id", phone.business_id).maybeSingle();
  if (!settings?.forward_to_e164 || settings.forward_to_e164 === to) {
    return xml("<Response><Say>This line is not configured for forwarding.</Say><Hangup/></Response>");
  }

  // upsert contact
  const { data: contact } = await svc.from("contacts").upsert(
    { business_id: phone.business_id, phone_e164: from },
    { onConflict: "business_id,phone_e164" }
  ).select().maybeSingle();

  await svc.from("calls").upsert(
    {
      business_id: phone.business_id,
      contact_id: contact?.id ?? null,
      twilio_call_sid: callSid,
      caller_e164: from,
      called_e164: to,
      status: "ringing",
      started_at: new Date().toISOString(),
    },
    { onConflict: "twilio_call_sid" }
  );

  const timeout = settings.ring_timeout_seconds ?? 20;
  const action = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/dial-result`;
  const twiml = `<Response><Dial timeout="${timeout}" answerOnBridge="true" action="${action}" method="POST"><Number>${settings.forward_to_e164}</Number></Dial></Response>`;
  return xml(twiml);
}
