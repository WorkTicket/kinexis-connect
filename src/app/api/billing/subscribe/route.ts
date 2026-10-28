import { NextResponse } from "next/server";
import { getCurrentUser, getUserBusinesses } from "@/lib/auth/membership";
import { createSupabaseServiceClient } from "@/lib/db/supabase";
import { checkoutSchema } from "@/lib/validation/schemas";
import { getPayPalPlanPrice, isIncludedPlan, planIdForTier, paypalRequest } from "@/lib/billing/paypal";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { code: "unauthorized", message: "Not authenticated", request_id: crypto.randomUUID() } }, { status: 401 });
  const body = await req.json();
  const businessId = body.business_id;
  const parsed = checkoutSchema.safeParse({ plan: body.plan });
  if (!businessId || !parsed.success) return NextResponse.json({ error: { code: "validation", message: "Invalid payload", request_id: crypto.randomUUID() } }, { status: 422 });
  const businesses = await getUserBusinesses(user.id);
  const m = businesses.find((b) => b.business_id === businessId);
  if (!m || m.role !== "owner") return NextResponse.json({ error: { code: "forbidden", message: "Owner only", request_id: crypto.randomUUID() } }, { status: 403 });

  const svc = createSupabaseServiceClient();
  const planId = planIdForTier(parsed.data.plan);
  if (isIncludedPlan(parsed.data.plan)) {
    const { data: entitlement } = await svc.from("included_entitlements").select("*").eq("business_id", businessId).eq("plan", parsed.data.plan).eq("active", true).maybeSingle();
    if (!entitlement) return NextResponse.json({ error: { code: "entitlement_required", message: "This included plan must be verified by Kinexis support", request_id: crypto.randomUUID() } }, { status: 403 });
    await svc.from("subscriptions").upsert({
      business_id: businessId,
      plan: parsed.data.plan,
      status: "active",
      billing_currency: "USD",
      updated_at: new Date().toISOString(),
    }, { onConflict: "business_id" });
    await svc.from("businesses").update({ status: "active", updated_at: new Date().toISOString() }).eq("id", businessId);
    return NextResponse.json({ free: true, plan: parsed.data.plan });
  }
  if (!planId) return NextResponse.json({ error: { code: "blocked", message: "BLOCKED: PayPal plan not configured", request_id: crypto.randomUUID() } }, { status: 503 });

  const { data: existing } = await svc.from("subscriptions").select("*").eq("business_id", businessId).maybeSingle();
  if (existing && ["active", "trialing", "paused"].includes(existing.status)) {
    return NextResponse.json({ error: { code: "conflict", message: "Existing subscription", request_id: crypto.randomUUID() } }, { status: 409 });
  }

  if (existing?.status === "incomplete" && existing.paypal_subscription_id) {
    try {
      const pending = await paypalRequest(`/v1/billing/subscriptions/${encodeURIComponent(existing.paypal_subscription_id)}`) as { links?: { rel: string; href: string }[] };
      const approvalUrl = pending.links?.find((link) => link.rel === "approve")?.href;
      if (approvalUrl) return NextResponse.json({ approval_url: approvalUrl, subscription_id: existing.paypal_subscription_id, resumed: true });
    } catch {
      // A stale incomplete subscription is replaced below.
    }
  }

  try {
    let price: Awaited<ReturnType<typeof getPayPalPlanPrice>> = null;
    try { price = await getPayPalPlanPrice(planId); } catch { /* Checkout can continue; webhook/refresh reconciliation retries pricing. */ }
    const sub = await paypalRequest("/v1/billing/subscriptions", "POST", {
      plan_id: planId,
      subscriber: { email_address: user.email },
      application_context: {
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/success`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/cancel`,
      },
    }) as { id: string; links?: { rel: string; href: string }[] };
    const approvalUrl = sub.links?.find((l) => l.rel === "approve")?.href;
    const { data: savedSubscription } = await svc.from("subscriptions").upsert({
      business_id: businessId,
      paypal_subscription_id: sub.id,
      paypal_plan_id: planId,
      plan: parsed.data.plan,
      status: "incomplete",
      billing_currency: price?.currency ?? "USD",
      billing_amount: price?.amount ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "business_id" }).select("id,business_id").single();
    await svc.from("provider_events").upsert({
      provider: "paypal",
      event_key: `paypal_sub_${sub.id}`,
      event_type: "subscription.created",
      status: "processed",
      processed_at: new Date().toISOString(),
      business_id: savedSubscription?.business_id ?? businessId,
      subscription_id: savedSubscription?.id ?? null,
      provider_subscription_id: sub.id,
    }, { onConflict: "event_key" });
    return NextResponse.json({ approval_url: approvalUrl, subscription_id: sub.id });
  } catch {
    return NextResponse.json({ error: { code: "provider_error", message: "PayPal request failed", request_id: crypto.randomUUID() } }, { status: 502 });
  }
}
