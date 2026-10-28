import { NextResponse } from "next/server";
import { getCurrentUser, getUserBusinesses } from "@/lib/auth/membership";
import { createSupabaseServiceClient } from "@/lib/db/supabase";
import { isMessagingReady } from "@/lib/messaging/readiness";
import { sendMessageSchema } from "@/lib/validation/schemas";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { code: "unauthorized", message: "Not authenticated", request_id: crypto.randomUUID() } }, { status: 401 });
  const svc = createSupabaseServiceClient();
  const { data: conv } = await svc.from("conversations").select("*").eq("id", id).maybeSingle();
  if (!conv) return NextResponse.json({ error: { code: "not_found", message: "Not found", request_id: crypto.randomUUID() } }, { status: 404 });
  const businesses = await getUserBusinesses(user.id);
  if (!businesses.find((b: { business_id: string }) => b.business_id === conv.business_id)) return NextResponse.json({ error: { code: "forbidden", message: "No access", request_id: crypto.randomUUID() } }, { status: 403 });
  const { data } = await svc.from("messages").select("*").eq("conversation_id", id).order("created_at", { ascending: true }).limit(100);
  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { code: "unauthorized", message: "Not authenticated", request_id: crypto.randomUUID() } }, { status: 401 });
  const body = await req.json();
  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "validation", message: "Invalid body", request_id: crypto.randomUUID() } }, { status: 422 });
  const svc = createSupabaseServiceClient();
  const { data: conv } = await svc.from("conversations").select("*").eq("id", id).maybeSingle();
  if (!conv) return NextResponse.json({ error: { code: "not_found", message: "Not found", request_id: crypto.randomUUID() } }, { status: 404 });
  const businesses = await getUserBusinesses(user.id);
  const m = businesses.find((b: { business_id: string }) => b.business_id === conv.business_id);
  if (!m) return NextResponse.json({ error: { code: "forbidden", message: "No access", request_id: crypto.randomUUID() } }, { status: 403 });
  const [{ data: subscription }, { data: entitlement }, { data: settings }, { data: phone }] = await Promise.all([
    svc.from("subscriptions").select("status").eq("business_id", conv.business_id).maybeSingle(),
    svc.from("included_entitlements").select("active").eq("business_id", conv.business_id).eq("active", true).maybeSingle(),
    svc.from("business_settings").select("sms_consent_review_status").eq("business_id", conv.business_id).maybeSingle(),
    svc.from("phone_numbers").select("sms_enabled,sms_registration_status").eq("business_id", conv.business_id).maybeSingle(),
  ]);
  const providerConfigured = Boolean(process.env.TELNYX_API_KEY && process.env.TELNYX_PUBLIC_KEY && process.env.TELNYX_MESSAGING_PROFILE_ID);
  const messagingReady = isMessagingReady({ providerConfigured, subscriptionStatus: subscription?.status, entitlementActive: entitlement?.active, consentReviewStatus: settings?.sms_consent_review_status, smsEnabled: phone?.sms_enabled, registrationStatus: phone?.sms_registration_status });
  if (!messagingReady) return NextResponse.json({ error: { code: "messaging_unavailable", message: "Messaging is pending Telnyx and compliance activation", request_id: crypto.randomUUID() } }, { status: 503 });
  const { data: msg } = await svc.from("messages").insert({
    business_id: conv.business_id,
    conversation_id: conv.id,
    contact_id: conv.contact_id,
    direction: "outbound",
    kind: "manual",
    body: parsed.data.body,
    status: "queued",
    created_by_user_id: user.id,
  }).select().maybeSingle();
  if (!msg) return NextResponse.json({ error: { code: "server_error", message: "Message could not be queued", request_id: crypto.randomUUID() } }, { status: 500 });
  await svc.from("outbound_jobs").insert({ business_id: conv.business_id, message_id: msg.id, idempotency_key: `manual:${msg.id}`, status: "queued", next_attempt_at: new Date().toISOString() });
  return NextResponse.json({ message: msg }, { status: 201 });
}
