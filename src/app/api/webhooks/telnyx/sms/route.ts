import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/db/supabase";
import type { TelnyxPhoneEndpoint } from "@/lib/telnyx/types";
import { acceptTelnyxWebhook, finishTelnyxEvent } from "@/lib/telnyx/webhook";

const OPT_OUT = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "END", "QUIT", "CANCEL", "REVOKE", "OPTOUT"]);
const OPT_IN = new Set(["START", "UNSTOP"]);

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
  const providerMessageId = typeof payload.id === "string" ? payload.id : "";
  const svc = createSupabaseServiceClient();
  let businessId: string | undefined;
  try {
    if (data.event_type === "message.received") {
      const from = (payload.from as TelnyxPhoneEndpoint | undefined)?.phone_number ?? "";
      const to = Array.isArray(payload.to) ? (payload.to[0] as TelnyxPhoneEndpoint | undefined)?.phone_number ?? "" : "";
      const body = typeof payload.text === "string" ? payload.text : "";
      if (!providerMessageId || !/^\+[1-9]\d{1,14}$/.test(from) || !/^\+[1-9]\d{1,14}$/.test(to)) {
        await finishTelnyxEvent(data.id, "ignored", { error_code: "invalid_message_address" });
        return NextResponse.json({ received: true });
      }
      const { data: phone } = await svc.from("phone_numbers").select("business_id").eq("e164", to).eq("provider", "telnyx").maybeSingle();
      if (!phone) {
        await finishTelnyxEvent(data.id, "ignored", { error_code: "unknown_number" });
        return NextResponse.json({ received: true });
      }
      businessId = phone.business_id;
      const now = data.occurred_at ?? new Date().toISOString();
      const { data: contact } = await svc.from("contacts").upsert({
        business_id: businessId,
        phone_e164: from,
        last_inbound_at: now,
      }, { onConflict: "business_id,phone_e164" }).select("id,opt_out").single();
      const keyword = body.trim().toUpperCase();
      if (OPT_OUT.has(keyword) || OPT_IN.has(keyword)) {
        const optedOut = OPT_OUT.has(keyword);
        await svc.from("contacts").update({ opt_out: optedOut, updated_at: now }).eq("id", contact!.id);
        const evidenceReference = `TelnyxMessage:${providerMessageId}`;
        const { data: existingConsent } = await svc.from("consent_events").select("id").eq("evidence_reference", evidenceReference).maybeSingle();
        if (!existingConsent) {
          await svc.from("consent_events").insert({
            business_id: businessId,
            contact_id: contact!.id,
            consent_type: "service_sms",
            status: optedOut ? "revoked" : "granted",
            source: "sms_keyword",
            evidence_reference: evidenceReference,
            captured_at: now,
          });
        }
      }
      const { data: conversation } = await svc.from("conversations").upsert({
        business_id: businessId,
        contact_id: contact!.id,
        last_message_at: now,
        status: "open",
      }, { onConflict: "business_id,contact_id" }).select("id").single();
      await svc.from("messages").upsert({
        business_id: businessId,
        conversation_id: conversation!.id,
        contact_id: contact!.id,
        direction: "inbound",
        kind: "customer",
        telnyx_message_id: providerMessageId,
        body,
        status: "received",
        parts: typeof payload.parts === "number" ? payload.parts : null,
      }, { onConflict: "telnyx_message_id", ignoreDuplicates: true });
      await svc.from("phone_usage").upsert({
        business_id: businessId,
        provider_resource_id: providerMessageId,
        usage_type: "sms_inbound",
        quantity: typeof payload.parts === "number" ? payload.parts : 1,
        occurred_at: now,
      }, { onConflict: "provider_resource_id,usage_type", ignoreDuplicates: true });
    } else if (data.event_type === "message.sent" || data.event_type === "message.finalized") {
      const recipients = Array.isArray(payload.to) ? payload.to as TelnyxPhoneEndpoint[] : [];
      const providerStatus = recipients[0]?.status ?? (data.event_type === "message.sent" ? "sent" : "delivery_unconfirmed");
      const status = providerStatus === "delivered" ? "delivered"
        : ["delivery_failed", "failed", "undelivered"].includes(providerStatus) ? "undelivered"
          : "sent";
      const errors = Array.isArray(payload.errors) ? payload.errors as Array<{ code?: string }> : [];
      const { data: currentMessage } = await svc.from("messages").select("business_id,status").eq("telnyx_message_id", providerMessageId).maybeSingle();
      if (!currentMessage) throw new Error("outbound_message_not_ready");
      const rank: Record<string, number> = { queued: 0, sending: 1, sent: 2, delivered: 3, undelivered: 3, failed: 3, blocked: 4 };
      const shouldUpdate = currentMessage && (rank[status] ?? 0) >= (rank[currentMessage.status] ?? 0);
      if (shouldUpdate) {
        await svc.from("messages").update({
          status,
          error_code: errors[0]?.code ?? null,
          parts: typeof payload.parts === "number" ? payload.parts : null,
          updated_at: new Date().toISOString(),
        }).eq("telnyx_message_id", providerMessageId);
      }
      const message = currentMessage;
      businessId = message?.business_id;
      const cost = payload.cost as { amount?: string | number; currency?: string } | undefined;
      if (businessId && cost?.amount !== undefined) {
        const microUnits = Math.round(Number(cost.amount) * 1_000_000);
        await svc.from("messages").update({ cost_microunits: microUnits, cost_currency: cost.currency ?? "USD" }).eq("telnyx_message_id", providerMessageId);
        await svc.from("phone_usage").upsert({
          business_id: businessId,
          provider_resource_id: providerMessageId,
          usage_type: "sms_outbound",
          quantity: typeof payload.parts === "number" ? payload.parts : 1,
          cost_microunits: microUnits,
          currency: cost.currency ?? "USD",
          occurred_at: data.occurred_at ?? new Date().toISOString(),
        }, { onConflict: "provider_resource_id,usage_type" });
      }
    } else {
      await finishTelnyxEvent(data.id, "ignored");
      return NextResponse.json({ received: true });
    }
    await finishTelnyxEvent(data.id, "processed", { business_id: businessId });
    return NextResponse.json({ received: true });
  } catch (error) {
    await finishTelnyxEvent(data.id, "failed", {
      business_id: businessId,
      error_code: error instanceof Error ? error.message.slice(0, 120) : "processing_failed",
    });
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}
