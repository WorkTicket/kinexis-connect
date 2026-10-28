import { NextResponse } from "next/server";
import { getPayPalPlanPrice, mapPayPalWebhookStatus, parsePayPalMoney, paypalEventTime, paypalRequest, paypalSubscriptionIdForEvent } from "@/lib/billing/paypal";
import { createSupabaseServiceClient } from "@/lib/db/supabase";

type PayPalWebhookEvent = {
  id: string;
  event_type: string;
  create_time?: string;
  resource?: {
    id?: string;
    billing_agreement_id?: string;
    plan_id?: string;
    amount?: { value?: string; total?: string; currency_code?: string; currency?: string };
    create_time?: string;
  };
};

export async function POST(req: Request) {
  const raw = await req.text();
  const transmissionId = req.headers.get("paypal-transmission-id");
  const transmissionTime = req.headers.get("paypal-transmission-time");
  const certUrl = req.headers.get("paypal-cert-url");
  const authAlgo = req.headers.get("paypal-auth-algo");
  const transmissionSig = req.headers.get("paypal-transmission-sig");
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig || !webhookId) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  let event: PayPalWebhookEvent;
  try { event = JSON.parse(raw) as PayPalWebhookEvent; } catch { return new NextResponse("Bad Request", { status: 400 }); }
  if (!event.id || !event.event_type) return new NextResponse("Bad Request", { status: 400 });

  // verify via PayPal
  try {
    const verify = await paypalRequest("/v1/notifications/verify-webhook-signature", "POST", {
      transmission_id: transmissionId,
      transmission_time: transmissionTime,
      cert_url: certUrl,
      auth_algo: authAlgo,
      transmission_sig: transmissionSig,
      webhook_id: webhookId,
      webhook_event: event,
    }) as { verification_status: string };
    if (verify.verification_status !== "SUCCESS") {
      return new NextResponse("Forbidden", { status: 403 });
    }
  } catch {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const eventId = event.id;
  const svc = createSupabaseServiceClient();
  const resource = event.resource ?? {};
  const subId = paypalSubscriptionIdForEvent(event.event_type, resource);
  const { data: localSubscription } = subId
    ? await svc.from("subscriptions").select("id,business_id,paypal_plan_id,billing_amount,billing_currency").eq("paypal_subscription_id", subId).maybeSingle()
    : { data: null };
  const eventLink = {
    business_id: localSubscription?.business_id ?? null,
    subscription_id: localSubscription?.id ?? null,
    provider_subscription_id: subId ?? null,
  };
  const { data: existing } = await svc.from("provider_events").select("id").eq("event_key", eventId).maybeSingle();
  if (existing) {
    await svc.from("provider_events").update(eventLink).eq("id", existing.id);
  } else {
    const { error: eventError } = await svc.from("provider_events").insert({ provider: "paypal", event_key: eventId, event_type: event.event_type, status: "received", ...eventLink });
    if (eventError) return NextResponse.json({ error: "Event could not be recorded" }, { status: 500 });
  }

  if (subId) {
    let price = parsePayPalMoney(resource.amount);
    const planId = resource.plan_id ?? localSubscription?.paypal_plan_id;
    if (!price && planId && !localSubscription?.billing_amount) {
      try { price = await getPayPalPlanPrice(planId); } catch { /* Status processing can continue if plan lookup is unavailable. */ }
    }
    const newStatus = mapPayPalWebhookStatus(event.event_type);
    if (newStatus) {
      const { data: updated } = await svc.from("subscriptions").update({ status: newStatus, paypal_plan_id: planId ?? localSubscription?.paypal_plan_id, billing_amount: price?.amount ?? localSubscription?.billing_amount, billing_currency: price?.currency ?? localSubscription?.billing_currency, last_verified_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("paypal_subscription_id", subId).select("business_id").maybeSingle();
      if (updated?.business_id && newStatus === "active") await svc.from("businesses").update({ status: "active", updated_at: new Date().toISOString() }).eq("id", updated.business_id);
      if (updated?.business_id && ["canceled", "paused", "past_due"].includes(newStatus)) await svc.from("businesses").update({ status: "suspended", updated_at: new Date().toISOString() }).eq("id", updated.business_id);
    }
    if (event.event_type === "PAYMENT.SALE.COMPLETED") {
      await svc.from("subscriptions").update({ billing_amount: price?.amount ?? localSubscription?.billing_amount, billing_currency: price?.currency ?? localSubscription?.billing_currency, last_payment_at: paypalEventTime(resource.create_time, event.create_time), updated_at: new Date().toISOString() }).eq("paypal_subscription_id", subId);
    }
  }

  await svc.from("provider_events").update({ status: "processed", processed_at: new Date().toISOString(), ...eventLink }).eq("event_key", eventId);
  return NextResponse.json({ received: true });
}
