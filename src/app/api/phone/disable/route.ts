import { NextResponse } from "next/server";
import { getCurrentUser, getMembership } from "@/lib/auth/membership";
import { createSupabaseServiceClient } from "@/lib/db/supabase";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { code: "unauthorized", message: "Not authenticated" } }, { status: 401 });
  const body = await req.json().catch(() => null) as { business_id?: string } | null;
  if (!body?.business_id) return NextResponse.json({ error: { code: "validation", message: "business_id is required" } }, { status: 422 });
  const membership = await getMembership(body.business_id, user.id);
  if (!membership || !["owner", "manager"].includes(membership.role)) return NextResponse.json({ error: { code: "forbidden", message: "Insufficient role" } }, { status: 403 });
  const svc = createSupabaseServiceClient();
  await svc.from("business_settings").update({ auto_reply_enabled: false, updated_at: new Date().toISOString() }).eq("business_id", body.business_id);
  await svc.from("outbound_jobs").update({ status: "canceled", last_error_code: "automation_disabled", updated_at: new Date().toISOString() }).eq("business_id", body.business_id).eq("status", "queued");
  await svc.from("audit_logs").insert({ actor_user_id: user.id, business_id: body.business_id, action: "phone.automation_disabled", resource_type: "business_settings", resource_id: body.business_id });
  return NextResponse.json({ active: false });
}
