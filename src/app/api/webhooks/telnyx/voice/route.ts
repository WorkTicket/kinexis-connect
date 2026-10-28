import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/db/supabase";
import { callCommand } from "@/lib/telnyx/client";
import { queueConsentText } from "@/lib/telnyx/queue";
import { acceptTelnyxWebhook, finishTelnyxEvent } from "@/lib/telnyx/webhook";

export const runtime = "nodejs";

function value(payload: Record<string, unknown>, key: string) {
  return typeof payload[key] === "string" ? payload[key] as string : "";
}

export async function POST(req: Request) {
  let accepted: Awaited<ReturnType<typeof acceptTelnyxWebhook>>;
  try {
    accepted = await acceptTelnyxWebhook(req);
  } catch (error) {
    const code = error instanceof Error ? error.message : "invalid_webhook";
    return NextResponse.json({ error: code }, { status: code === "event_storage_failed" ? 503 : 400 });
  }
  if (accepted.duplicate) return NextResponse.json({ received: true, duplicate: true });

  const { data } = accepted.event;
  const payload = data.payload;
  const callControlId = value(payload, "call_control_id");
  const svc = createSupabaseServiceClient();
  let businessId: string | undefined;

  try {
    if (data.event_type === "call.initiated") {
      if (value(payload, "direction") !== "incoming") {
        await finishTelnyxEvent(data.id, "ignored");
        return NextResponse.json({ received: true });
      }
      const to = value(payload, "to");
      const from = value(payload, "from");
      if (!callControlId || !/^\+[1-9]\d{1,14}$/.test(to) || !/^\+[1-9]\d{1,14}$/.test(from)) {
        if (callControlId) await callCommand(callControlId, "reject", { cause: "CALL_REJECTED" });
        await finishTelnyxEvent(data.id, "ignored", { error_code: "invalid_caller_or_destination" });
        return NextResponse.json({ received: true });
      }
      const { data: phone } = await svc.from("phone_numbers").select("business_id,voice_enabled").eq("e164", to).eq("provider", "telnyx").maybeSingle();
      if (!phone?.voice_enabled) {
        await callCommand(callControlId, "reject", { cause: "CALL_REJECTED" });
        await finishTelnyxEvent(data.id, "ignored", { error_code: "number_not_active" });
        return NextResponse.json({ received: true });
      }
      businessId = phone.business_id;
      const { data: contact } = await svc.from("contacts").upsert({
        business_id: businessId,
        phone_e164: from,
      }, { onConflict: "business_id,phone_e164" }).select("id").single();
      await svc.from("calls").upsert({
        business_id: businessId,
        contact_id: contact?.id ?? null,
        telnyx_call_control_id: callControlId,
        telnyx_call_leg_id: value(payload, "call_leg_id") || null,
        telnyx_call_session_id: value(payload, "call_session_id") || null,
        caller_e164: from,
        called_e164: to,
        status: "ringing",
        started_at: data.occurred_at ?? new Date().toISOString(),
        provider_occurred_at: data.occurred_at ?? null,
      }, { onConflict: "telnyx_call_control_id" });
      await callCommand(callControlId, "answer", { command_id: data.id });
    } else {
      const { data: call } = await svc.from("calls").select("*").eq("telnyx_call_control_id", callControlId).maybeSingle();
      if (!call) {
        await finishTelnyxEvent(data.id, "ignored", { error_code: "unknown_call" });
        return NextResponse.json({ received: true });
      }
      businessId = call.business_id;
      if (data.event_type === "call.answered") {
        const { data: business } = await svc.from("businesses").select("name").eq("id", businessId).single();
        const businessName = (business?.name ?? "the business").replace(/[<>]/g, "");
        await callCommand(callControlId, "gather_using_speak", {
          payload: `You reached ${businessName}. We missed your call. Press 1 to request a text message from ${businessName}. Message and data rates may apply.`,
          voice: "female",
          service_level: "basic",
          language: "en-US",
          valid_digits: "1",
          minimum_digits: 1,
          maximum_digits: 1,
          maximum_tries: 1,
          timeout_millis: 10000,
          terminating_digit: "",
          command_id: data.id,
        });
      } else if (data.event_type === "call.gather.ended") {
        const digits = value(payload, "digits");
        if (digits === "1") {
          await svc.from("consent_events").insert({
            business_id: businessId,
            contact_id: call.contact_id,
            consent_type: "service_sms",
            status: "granted",
            source: "documented_verbal",
            evidence_reference: `TelnyxEvent:${data.id}`,
            captured_at: data.occurred_at ?? new Date().toISOString(),
          });
          await svc.from("calls").update({ consent_digit: "1", status: "missed", missed_reason: "forwarded_no_answer", updated_at: new Date().toISOString() }).eq("id", call.id);
          await queueConsentText(call);
          await callCommand(callControlId, "speak", {
            payload: "Thank you. We will text you shortly. Reply STOP at any time to opt out.",
            voice: "female",
            service_level: "basic",
            language: "en-US",
            command_id: data.id,
          });
        } else {
          await svc.from("calls").update({ status: "missed", sms_action: "skipped", sms_skip_reason: "consent_not_received", updated_at: new Date().toISOString() }).eq("id", call.id);
          await callCommand(callControlId, "hangup", { command_id: data.id });
        }
      } else if (data.event_type === "call.speak.ended" && call.consent_digit === "1") {
        await callCommand(callControlId, "hangup", { command_id: data.id });
      } else if (data.event_type === "call.hangup") {
        const update: Record<string, unknown> = {
          ended_at: data.occurred_at ?? new Date().toISOString(),
          provider_occurred_at: data.occurred_at ?? null,
          updated_at: new Date().toISOString(),
        };
        if (call.status === "ringing") {
          update.status = "failed";
          update.sms_action = "skipped";
          update.sms_skip_reason = "call_not_answered_by_connect";
        }
        await svc.from("calls").update(update).eq("id", call.id);
      }
    }
    await finishTelnyxEvent(data.id, "processed", { business_id: businessId });
    return NextResponse.json({ received: true });
  } catch (error) {
    const errorCode = error instanceof Error ? error.message.slice(0, 120) : "processing_failed";
    await finishTelnyxEvent(data.id, "failed", { business_id: businessId, error_code: errorCode });
    // A stored event can be safely retried by operations without asking Telnyx
    // to replay a command whose outcome may be uncertain.
    return NextResponse.json({ received: true, processing: "failed" });
  }
}
