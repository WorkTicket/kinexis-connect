import { NextResponse } from "next/server";
import { getCurrentUser, getUserBusinesses } from "@/lib/auth/membership";
import { createSupabaseServiceClient } from "@/lib/db/supabase";
import { getPayPalPlanPrice, mapPayPalSubscriptionStatus, paypalRequest } from "@/lib/billing/paypal";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { code: "unauthorized", message: "Not authenticated", request_id: crypto.randomUUID() } }, { status: 401 });
  const url = new URL(req.url);
  const businessId = url.searchParams.get("business_id");
  if (!businessId) return NextResponse.json({ error: { code: "bad_request", message: "business_id required", request_id: crypto.randomUUID() } }, { status: 400 });
  const businesses = await getUserBusinesses(user.id);
  const m = businesses.find((b: { business_id: string }) => b.business_id === businessId);
  if (!m) return NextResponse.json({ error: { code: "forbidden", message: "No access", request_id: crypto.randomUUID() } }, { status: 403 });
  if (m.role !== "owner") return NextResponse.json({ error: { code: "forbidden", message: "Owner only", request_id: crypto.randomUUID() } }, { status: 403 });
  const svc = createSupabaseServiceClient();
  const { data } = await svc.from("subscriptions").select("*").eq("business_id", businessId).maybeSingle();
  let subscription = data;
  if (data?.paypal_subscription_id && url.searchParams.get("refresh") === "true") {
    try {
      const remote = await paypalRequest(`/v1/billing/subscriptions/${encodeURIComponent(data.paypal_subscription_id)}`) as {
        status?: string;
        plan_id?: string;
        billing_info?: { next_billing_time?: string; last_payment?: { time?: string } };
      };
      const status = mapPayPalSubscriptionStatus(remote.status);
      const planId = remote.plan_id ?? data.paypal_plan_id;
      let price: Awaited<ReturnType<typeof getPayPalPlanPrice>> = null;
      if (planId) {
        try { price = await getPayPalPlanPrice(planId); } catch { /* Preserve existing amount when plan pricing is temporarily unavailable. */ }
      }
      const { data: updated } = await svc.from("subscriptions").update({
        status,
        paypal_plan_id: planId ?? data.paypal_plan_id,
        billing_amount: price?.amount ?? data.billing_amount,
        billing_currency: price?.currency ?? data.billing_currency,
        current_period_end: remote.billing_info?.next_billing_time ?? data.current_period_end,
        last_payment_at: remote.billing_info?.last_payment?.time ?? data.last_payment_at,
        last_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", data.id).select().single();
      subscription = updated ?? data;
      await svc.from("provider_events").update({ status: "processed", processed_at: new Date().toISOString() }).eq("event_key", `paypal_sub_${data.paypal_subscription_id}`);
    } catch {
      // Return the last webhook-confirmed state when PayPal is temporarily unavailable.
    }
  }
  return NextResponse.json({ subscription });
}
