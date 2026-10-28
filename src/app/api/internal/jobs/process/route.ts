import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/db/supabase";
import { hasServiceConsent, inQuietHours, renderTemplate } from "@/lib/messaging/eligibility";
import { isMessagingReady } from "@/lib/messaging/readiness";
import { isTelnyxConfigured, sendTelnyxMessage, TelnyxApiError } from "@/lib/telnyx/client";

const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const internalSecret = process.env.INTERNAL_JOB_SECRET;
  if (!internalSecret || auth !== `Bearer ${internalSecret}`) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  if (!isTelnyxConfigured()) {
    return NextResponse.json({ error: { code: "provider_not_configured", message: "Telnyx delivery is not configured" }, processed: 0 }, { status: 503 });
  }

  const svc = createSupabaseServiceClient();
  const now = new Date();
  const { data: jobs } = await svc.from("outbound_jobs").select("*").eq("status", "queued").lte("next_attempt_at", now.toISOString()).order("created_at").limit(50);
  let processed = 0;

  for (const candidate of jobs ?? []) {
    const { data: claimed } = await svc.from("outbound_jobs").update({
      status: "processing",
      updated_at: new Date().toISOString(),
    }).eq("id", candidate.id).eq("status", "queued").select("*").maybeSingle();
    if (!claimed) continue;

    const { data: message } = await svc.from("messages").select("*").eq("id", claimed.message_id).maybeSingle();
    if (!message) {
      await failJob(claimed.id, "message_not_found", true);
      continue;
    }
    const [{ data: contact }, { data: settings }, { data: business }, { data: subscription }, { data: entitlement }, { data: phone }] = await Promise.all([
      svc.from("contacts").select("*").eq("id", message.contact_id).maybeSingle(),
      svc.from("business_settings").select("*").eq("business_id", message.business_id).maybeSingle(),
      svc.from("businesses").select("name,timezone,status").eq("id", message.business_id).maybeSingle(),
      svc.from("subscriptions").select("status").eq("business_id", message.business_id).maybeSingle(),
      svc.from("included_entitlements").select("active").eq("business_id", message.business_id).eq("active", true).maybeSingle(),
      svc.from("phone_numbers").select("*").eq("business_id", message.business_id).eq("provider", "telnyx").maybeSingle(),
    ]);

    const ready = business?.status === "active" && isMessagingReady({
      providerConfigured: true,
      subscriptionStatus: subscription?.status,
      entitlementActive: entitlement?.active,
      consentReviewStatus: settings?.sms_consent_review_status,
      smsEnabled: phone?.sms_enabled,
      registrationStatus: phone?.sms_registration_status,
    });
    if (!ready || !contact || !settings || !phone) {
      await blockMessage(message.id, message.call_id, "activation_requirements_not_met");
      await failJob(claimed.id, "activation_requirements_not_met", true);
      continue;
    }
    if (contact.opt_out || !(await hasServiceConsent(message.business_id, contact.id))) {
      await blockMessage(message.id, message.call_id, contact.opt_out ? "recipient_opted_out" : "consent_not_found");
      await failJob(claimed.id, contact.opt_out ? "recipient_opted_out" : "consent_not_found", true);
      continue;
    }
    if (message.kind === "auto_reply" && !settings.auto_reply_enabled) {
      await blockMessage(message.id, message.call_id, "automation_disabled");
      await failJob(claimed.id, "automation_disabled", true);
      continue;
    }
    if (message.kind === "auto_reply" && settings.quiet_hours_enabled && inQuietHours(
      business.timezone,
      now,
      settings.quiet_start_local,
      settings.quiet_end_local,
    )) {
      if (settings.after_hours_mode === "hold") {
        await svc.from("outbound_jobs").update({
          status: "queued",
          next_attempt_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", claimed.id);
      } else {
        await blockMessage(message.id, message.call_id, "quiet_hours");
        await failJob(claimed.id, "quiet_hours", true);
      }
      continue;
    }
    if (message.kind === "auto_reply") {
      const cooldownStart = new Date(Date.now() - settings.auto_reply_cooldown_hours * 60 * 60 * 1000).toISOString();
      const { count } = await svc.from("messages").select("id", { count: "exact", head: true })
        .eq("business_id", message.business_id)
        .eq("contact_id", contact.id)
        .eq("kind", "auto_reply")
        .in("status", ["sending", "sent", "delivered"])
        .gte("created_at", cooldownStart)
        .neq("id", message.id);
      if ((count ?? 0) > 0) {
        await blockMessage(message.id, message.call_id, "cooldown_active");
        await failJob(claimed.id, "cooldown_active", true);
        continue;
      }
    }

    const text = message.body === "PENDING" ? renderTemplate(settings.auto_reply_template, business.name) : message.body;
    await svc.from("messages").update({ body: text, status: "sending", updated_at: new Date().toISOString() }).eq("id", message.id);
    try {
      const sent = await sendTelnyxMessage(phone.e164, contact.phone_e164, text);
      await svc.from("messages").update({
        telnyx_message_id: sent.id,
        status: sent.to?.[0]?.status === "queued" ? "sent" : "sent",
        parts: sent.parts ?? null,
        cost_microunits: sent.cost?.amount === undefined ? null : Math.round(Number(sent.cost.amount) * 1_000_000),
        cost_currency: sent.cost?.currency ?? null,
        updated_at: new Date().toISOString(),
      }).eq("id", message.id);
      await svc.from("outbound_jobs").update({ status: "complete", updated_at: new Date().toISOString() }).eq("id", claimed.id);
      await svc.from("contacts").update({ last_contacted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", contact.id);
      if (message.call_id) await svc.from("calls").update({ sms_action: "sent", updated_at: new Date().toISOString() }).eq("id", message.call_id);
      processed += 1;
    } catch (error) {
      const attempts = (claimed.attempts ?? 0) + 1;
      const telnyxError = error instanceof TelnyxApiError ? error : null;
      const retryable = Boolean(telnyxError && (telnyxError.status === 429 || telnyxError.status >= 500) && attempts < MAX_ATTEMPTS);
      // A network failure after request transmission has an uncertain outcome.
      // Do not resend it automatically; operations can reconcile by provider ID/logs.
      if (retryable) {
        const seconds = telnyxError?.retryAfterSeconds ?? Math.min(300, 2 ** attempts);
        await svc.from("outbound_jobs").update({
          status: "queued",
          attempts,
          last_error_code: telnyxError?.code ?? `http_${telnyxError?.status}`,
          next_attempt_at: new Date(Date.now() + seconds * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", claimed.id);
        await svc.from("messages").update({ status: "queued", updated_at: new Date().toISOString() }).eq("id", message.id);
      } else {
        const code = telnyxError?.code ?? (telnyxError ? `http_${telnyxError.status}` : "provider_outcome_uncertain");
        await svc.from("messages").update({ status: "failed", error_code: code, updated_at: new Date().toISOString() }).eq("id", message.id);
        if (message.call_id) await svc.from("calls").update({ sms_action: "failed", sms_skip_reason: code, updated_at: new Date().toISOString() }).eq("id", message.call_id);
        await svc.from("outbound_jobs").update({ status: "failed", attempts, last_error_code: code, updated_at: new Date().toISOString() }).eq("id", claimed.id);
      }
    }
  }
  return NextResponse.json({ processed });

  async function blockMessage(messageId: string, callId: string | null, reason: string) {
    await svc.from("messages").update({ status: "blocked", error_code: reason, updated_at: new Date().toISOString() }).eq("id", messageId);
    if (callId) await svc.from("calls").update({ sms_action: "skipped", sms_skip_reason: reason, updated_at: new Date().toISOString() }).eq("id", callId);
  }

  async function failJob(jobId: string, reason: string, canceled: boolean) {
    await svc.from("outbound_jobs").update({ status: canceled ? "canceled" : "failed", last_error_code: reason, updated_at: new Date().toISOString() }).eq("id", jobId);
  }
}
