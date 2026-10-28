import { NextResponse } from "next/server";
import { getCurrentUser, getMembership } from "@/lib/auth/membership";
import { createSupabaseServiceClient } from "@/lib/db/supabase";
import { settingsPatchSchema } from "@/lib/validation/schemas";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { code: "unauthorized", message: "Not authenticated", request_id: crypto.randomUUID() } }, { status: 401 });
  const url = new URL(req.url);
  const businessId = url.searchParams.get("business_id");
  if (!businessId) return NextResponse.json({ error: { code: "bad_request", message: "business_id required", request_id: crypto.randomUUID() } }, { status: 400 });
  const m = await getMembership(businessId, user.id);
  if (!m) return NextResponse.json({ error: { code: "forbidden", message: "No access", request_id: crypto.randomUUID() } }, { status: 403 });
  const svc = createSupabaseServiceClient();
  const { data } = await svc.from("business_settings").select("*").eq("business_id", businessId).maybeSingle();
  const { data: biz } = await svc.from("businesses").select("*").eq("id", businessId).maybeSingle();
  const { data: phone } = await svc.from("phone_numbers").select("*").eq("business_id", businessId).maybeSingle();
  const { data: notifications } = await svc.from("notification_preferences").select("*").eq("business_id", businessId).eq("user_id", user.id).maybeSingle();
  return NextResponse.json({ business: biz, settings: data, phone, notifications: notifications ?? { email_on_new_reply: true } });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { code: "unauthorized", message: "Not authenticated", request_id: crypto.randomUUID() } }, { status: 401 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { code: "validation", message: "Invalid JSON", request_id: crypto.randomUUID() } }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: { code: "validation", message: "Invalid payload", request_id: crypto.randomUUID() } }, { status: 422 });
  const businessId = (body as { business_id?: string }).business_id;
  if (!businessId) return NextResponse.json({ error: { code: "bad_request", message: "business_id required", request_id: crypto.randomUUID() } }, { status: 400 });
  const m = await getMembership(businessId, user.id);
  if (!m || !["owner", "manager"].includes(m.role)) return NextResponse.json({ error: { code: "forbidden", message: "Insufficient role", request_id: crypto.randomUUID() } }, { status: 403 });
  const parsed = settingsPatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "validation", message: "Invalid payload", request_id: crypto.randomUUID() } }, { status: 422 });
  const svc = createSupabaseServiceClient();
  const { business_name, industry, timezone, email_on_new_reply, ...settingValues } = parsed.data;
  let business = null;
  if (business_name !== undefined || industry !== undefined || timezone !== undefined) {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (business_name !== undefined) updates.name = business_name;
    if (industry !== undefined) updates.industry = industry;
    if (timezone !== undefined) updates.timezone = timezone;
    const result = await svc.from("businesses").update(updates).eq("id", businessId).select().single();
    if (result.error) return NextResponse.json({ error: { code: "server_error", message: "Business update failed", request_id: crypto.randomUUID() } }, { status: 500 });
    business = result.data;
  }
  let settings = null;
  if (Object.keys(settingValues).length) {
    const result = await svc.from("business_settings").update({ ...settingValues, updated_at: new Date().toISOString() }).eq("business_id", businessId).select().single();
    if (result.error) return NextResponse.json({ error: { code: "server_error", message: "Settings update failed", request_id: crypto.randomUUID() } }, { status: 500 });
    settings = result.data;
  }
  if (email_on_new_reply !== undefined) {
    const result = await svc.from("notification_preferences").upsert({ user_id: user.id, business_id: businessId, email_on_new_reply, updated_at: new Date().toISOString() }, { onConflict: "business_id,user_id" });
    if (result.error) return NextResponse.json({ error: { code: "server_error", message: "Notification preference update failed", request_id: crypto.randomUUID() } }, { status: 500 });
  }
  await svc.from("audit_logs").insert({ actor_user_id: user.id, business_id: businessId, action: "settings.updated", resource_type: "business_settings", resource_id: businessId, metadata: { fields: Object.keys(parsed.data) } });
  return NextResponse.json({ business, settings });
}
