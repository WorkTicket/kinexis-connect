import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, isPlatformAdmin } from "@/lib/auth/membership";
import { createSupabaseServiceClient } from "@/lib/db/supabase";

const schema = z.object({
  business_id: z.string().uuid(),
  plan: z.enum(["lead_system", "plus"]),
  active: z.boolean().default(true),
  note: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { code: "unauthorized", message: "Not authenticated", request_id: crypto.randomUUID() } }, { status: 401 });
  if (!(await isPlatformAdmin(user.id))) return NextResponse.json({ error: { code: "forbidden", message: "Admin only", request_id: crypto.randomUUID() } }, { status: 403 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { code: "validation", message: "Invalid JSON", request_id: crypto.randomUUID() } }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "validation", message: "Invalid entitlement", request_id: crypto.randomUUID() } }, { status: 422 });
  const svc = createSupabaseServiceClient();
  const { data, error } = await svc.from("included_entitlements").upsert({
    business_id: parsed.data.business_id,
    plan: parsed.data.plan,
    active: parsed.data.active,
    note: parsed.data.note ?? null,
    granted_by_user_id: user.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: "business_id" }).select().single();
  if (error) return NextResponse.json({ error: { code: "server_error", message: "Entitlement update failed", request_id: crypto.randomUUID() } }, { status: 500 });
  await svc.from("audit_logs").insert({ actor_user_id: user.id, business_id: parsed.data.business_id, action: parsed.data.active ? "entitlement.granted" : "entitlement.revoked", resource_type: "included_entitlement", resource_id: parsed.data.business_id, metadata: { plan: parsed.data.plan } });
  return NextResponse.json({ entitlement: data });
}
