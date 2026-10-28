import { NextResponse } from "next/server";
import { getCurrentUser, getUserBusinesses } from "@/lib/auth/membership";
import { createSupabaseServiceClient } from "@/lib/db/supabase";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  industry: z.string().optional(),
  timezone: z.string().default("America/New_York"),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { code: "unauthorized", message: "Not authenticated", request_id: crypto.randomUUID() } }, { status: 401 });
  const existing = await getUserBusinesses(user.id);
  if (existing.length) return NextResponse.json({ business: existing[0], existing: true });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { code: "validation", message: "Invalid JSON", request_id: crypto.randomUUID() } }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "validation", message: "Invalid payload", request_id: crypto.randomUUID() } }, { status: 422 });
  const svc = createSupabaseServiceClient();
  const { data: biz, error: businessError } = await svc.from("businesses").insert({ name: parsed.data.name, industry: parsed.data.industry || null, timezone: parsed.data.timezone, status: "pending" }).select().single();
  if (businessError || !biz) return NextResponse.json({ error: { code: "server_error", message: "Business setup failed", request_id: crypto.randomUUID() } }, { status: 500 });

  const setupResults = await Promise.all([
    svc.from("memberships").insert({ business_id: biz.id, user_id: user.id, role: "owner" }),
    svc.from("business_settings").insert({ business_id: biz.id }),
    svc.from("subscriptions").insert({ business_id: biz.id, plan: "starter", status: "incomplete" }),
    svc.from("profiles").upsert({ user_id: user.id, full_name: user.user_metadata?.full_name || user.email || "", global_role: "user" }),
  ]);
  if (setupResults.some((result) => result.error)) {
    await svc.from("businesses").delete().eq("id", biz.id);
    return NextResponse.json({ error: { code: "server_error", message: "Business setup could not be completed", request_id: crypto.randomUUID() } }, { status: 500 });
  }
  await svc.from("audit_logs").insert({ actor_user_id: user.id, business_id: biz.id, action: "business.created", resource_type: "business", resource_id: biz.id });
  return NextResponse.json({ business: biz }, { status: 201 });
}
