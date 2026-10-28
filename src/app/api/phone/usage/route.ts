import { NextResponse } from "next/server";
import { getCurrentUser, getMembership } from "@/lib/auth/membership";
import { createSupabaseServiceClient } from "@/lib/db/supabase";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { code: "unauthorized", message: "Not authenticated" } }, { status: 401 });
  const businessId = new URL(req.url).searchParams.get("business_id");
  if (!businessId || !(await getMembership(businessId, user.id))) return NextResponse.json({ error: { code: "forbidden", message: "No access" } }, { status: 403 });
  const { data } = await createSupabaseServiceClient().from("phone_usage").select("*").eq("business_id", businessId).order("occurred_at", { ascending: false }).limit(500);
  const costMicrounits = (data ?? []).reduce((sum, row) => sum + Number(row.cost_microunits ?? 0), 0);
  return NextResponse.json({ usage: data ?? [], totals: { cost_usd: costMicrounits / 1_000_000 } });
}
