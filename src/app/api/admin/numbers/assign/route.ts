import { NextResponse } from "next/server";
import { getCurrentUser, isPlatformAdmin } from "@/lib/auth/membership";
import { createSupabaseServiceClient } from "@/lib/db/supabase";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { code: "unauthorized", message: "Not authenticated", request_id: crypto.randomUUID() } }, { status: 401 });
  if (!(await isPlatformAdmin(user.id))) return NextResponse.json({ error: { code: "forbidden", message: "Admin only", request_id: crypto.randomUUID() } }, { status: 403 });
  const body = await req.json();
  const { business_id, e164, telnyx_phone_number_id } = body;
  if (!business_id || !e164 || !telnyx_phone_number_id) return NextResponse.json({ error: { code: "validation", message: "Missing fields", request_id: crypto.randomUUID() } }, { status: 422 });
  const svc = createSupabaseServiceClient();
  const { data, error } = await svc.from("phone_numbers").insert({
    business_id,
    e164,
    provider: "telnyx",
    telnyx_phone_number_id,
    telnyx_voice_application_id: process.env.TELNYX_VOICE_APPLICATION_ID,
    telnyx_messaging_profile_id: process.env.TELNYX_MESSAGING_PROFILE_ID,
    sms_registration_status: "unregistered",
  }).select().maybeSingle();
  if (error) return NextResponse.json({ error: { code: "assignment_failed", message: error.message, request_id: crypto.randomUUID() } }, { status: 409 });
  await svc.from("audit_logs").insert({ actor_user_id: user.id, business_id, action: "assign_phone", resource_type: "phone_number", resource_id: data?.id });
  return NextResponse.json({ phone: data }, { status: 201 });
}
