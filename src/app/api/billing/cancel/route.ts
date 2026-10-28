import { NextResponse } from "next/server";
import { getCurrentUser, getUserBusinesses } from "@/lib/auth/membership";
import { createSupabaseServiceClient } from "@/lib/db/supabase";
import { paypalRequest } from "@/lib/billing/paypal";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { code: "unauthorized", message: "Not authenticated", request_id: crypto.randomUUID() } }, { status: 401 });
  let body: { business_id?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: { code: "validation", message: "Invalid JSON", request_id: crypto.randomUUID() } }, { status: 400 }); }
  if (!body.business_id) return NextResponse.json({ error: { code: "validation", message: "business_id required", request_id: crypto.randomUUID() } }, { status: 422 });
  const membership = (await getUserBusinesses(user.id)).find((item) => item.business_id === body.business_id);
  if (!membership || membership.role !== "owner") return NextResponse.json({ error: { code: "forbidden", message: "Owner only", request_id: crypto.randomUUID() } }, { status: 403 });

  const svc = createSupabaseServiceClient();
  const { data: subscription } = await svc.from("subscriptions").select("*").eq("business_id", body.business_id).maybeSingle();
  if (!subscription) return NextResponse.json({ error: { code: "not_found", message: "Subscription not found", request_id: crypto.randomUUID() } }, { status: 404 });
  if (["lead_system", "plus"].includes(subscription.plan)) {
    await svc.from("subscriptions").update({ status: "canceled", canceled_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", subscription.id);
    await svc.from("businesses").update({ status: "suspended", updated_at: new Date().toISOString() }).eq("id", body.business_id);
    return NextResponse.json({ canceled: true });
  }
  if (!subscription.paypal_subscription_id) return NextResponse.json({ error: { code: "conflict", message: "No PayPal subscription to cancel", request_id: crypto.randomUUID() } }, { status: 409 });
  try {
    await paypalRequest(`/v1/billing/subscriptions/${encodeURIComponent(subscription.paypal_subscription_id)}/cancel`, "POST", { reason: "Canceled by customer" });
    await svc.from("subscriptions").update({ status: "canceled", canceled_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", subscription.id);
    await svc.from("businesses").update({ status: "suspended", updated_at: new Date().toISOString() }).eq("id", body.business_id);
    await svc.from("audit_logs").insert({ actor_user_id: user.id, business_id: body.business_id, action: "subscription.canceled", resource_type: "subscription", resource_id: subscription.id });
    return NextResponse.json({ canceled: true });
  } catch {
    return NextResponse.json({ error: { code: "provider_error", message: "PayPal cancellation failed", request_id: crypto.randomUUID() } }, { status: 502 });
  }
}
