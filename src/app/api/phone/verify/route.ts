import { NextResponse } from "next/server";
import { getCurrentUser, getMembership } from "@/lib/auth/membership";
import { createSupabaseServiceClient } from "@/lib/db/supabase";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { code: "unauthorized", message: "Not authenticated" } }, { status: 401 });
  const body = await req.json().catch(() => null) as { business_id?: string; call_id?: string; answered_test_passed?: boolean; notes?: string } | null;
  if (!body?.business_id || !body.call_id || body.answered_test_passed !== true) {
    return NextResponse.json({ error: { code: "validation", message: "Both the answered test attestation and unanswered test call are required" } }, { status: 422 });
  }
  const membership = await getMembership(body.business_id, user.id);
  if (!membership || !["owner", "manager"].includes(membership.role)) {
    return NextResponse.json({ error: { code: "forbidden", message: "Owner or manager access required" } }, { status: 403 });
  }
  const svc = createSupabaseServiceClient();
  const { data: call } = await svc.from("calls").select("id,caller_e164,called_e164,status,started_at").eq("id", body.call_id).eq("business_id", body.business_id).maybeSingle();
  if (!call || !call.caller_e164 || call.status !== "missed") {
    return NextResponse.json({ error: { code: "test_call_not_found", message: "A valid unanswered forwarding test call was not found" } }, { status: 409 });
  }
  const now = new Date().toISOString();
  const { data: integration, error } = await svc.from("phone_integrations").upsert({
    business_id: body.business_id,
    forwarding_status: "verified",
    answered_test_at: now,
    unanswered_test_at: call.started_at ?? now,
    caller_id_preserved: true,
    verified_at: now,
    verification_notes: body.notes?.slice(0, 1000) ?? null,
    updated_at: now,
  }, { onConflict: "business_id" }).select().single();
  if (error) return NextResponse.json({ error: { code: "verification_failed", message: "Verification could not be saved" } }, { status: 500 });
  await svc.from("audit_logs").insert({ actor_user_id: user.id, business_id: body.business_id, action: "phone.forwarding_verified", resource_type: "phone_integration", resource_id: body.business_id, metadata: { call_id: call.id } });
  return NextResponse.json({ integration });
}
