import { NextResponse } from "next/server";
import { getCurrentUser, getMembership } from "@/lib/auth/membership";
import { createSupabaseServiceClient } from "@/lib/db/supabase";
import { isMessagingReady } from "@/lib/messaging/readiness";
import { isTelnyxConfigured } from "@/lib/telnyx/client";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { code: "unauthorized", message: "Not authenticated" } }, { status: 401 });
  const body = await req.json().catch(() => null) as { business_id?: string } | null;
  if (!body?.business_id) return NextResponse.json({ error: { code: "validation", message: "business_id is required" } }, { status: 422 });
  const membership = await getMembership(body.business_id, user.id);
  if (!membership || !["owner", "manager"].includes(membership.role)) return NextResponse.json({ error: { code: "forbidden", message: "Insufficient role" } }, { status: 403 });
  const svc = createSupabaseServiceClient();
  const [{ data: integration }, { data: settings }, { data: phone }, { data: subscription }, { data: entitlement }] = await Promise.all([
    svc.from("phone_integrations").select("forwarding_status").eq("business_id", body.business_id).maybeSingle(),
    svc.from("business_settings").select("sms_consent_review_status").eq("business_id", body.business_id).maybeSingle(),
    svc.from("phone_numbers").select("sms_enabled,sms_registration_status").eq("business_id", body.business_id).eq("provider", "telnyx").maybeSingle(),
    svc.from("subscriptions").select("status").eq("business_id", body.business_id).maybeSingle(),
    svc.from("included_entitlements").select("active").eq("business_id", body.business_id).eq("active", true).maybeSingle(),
  ]);
  const ready = integration?.forwarding_status === "verified" && isMessagingReady({
    providerConfigured: isTelnyxConfigured(),
    subscriptionStatus: subscription?.status,
    entitlementActive: entitlement?.active,
    consentReviewStatus: settings?.sms_consent_review_status,
    smsEnabled: phone?.sms_enabled,
    registrationStatus: phone?.sms_registration_status,
  });
  if (!ready) return NextResponse.json({ error: { code: "activation_pending", message: "Billing, forwarding, Telnyx verification, and compliance must all be approved first" } }, { status: 409 });
  await svc.from("business_settings").update({ auto_reply_enabled: true, updated_at: new Date().toISOString() }).eq("business_id", body.business_id);
  await svc.from("audit_logs").insert({ actor_user_id: user.id, business_id: body.business_id, action: "phone.automation_activated", resource_type: "business_settings", resource_id: body.business_id });
  return NextResponse.json({ active: true });
}
