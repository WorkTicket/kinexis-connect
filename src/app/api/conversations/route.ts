import { NextResponse } from "next/server";
import { getCurrentUser, getUserBusinesses } from "@/lib/auth/membership";
import { createSupabaseServiceClient } from "@/lib/db/supabase";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { code: "unauthorized", message: "Not authenticated", request_id: crypto.randomUUID() } }, { status: 401 });
  const url = new URL(req.url);
  const businessId = url.searchParams.get("business_id");
  if (!businessId) return NextResponse.json({ error: { code: "bad_request", message: "business_id required", request_id: crypto.randomUUID() } }, { status: 400 });
  const businesses = await getUserBusinesses(user.id);
  if (!businesses.find((b: { business_id: string }) => b.business_id === businessId)) return NextResponse.json({ error: { code: "forbidden", message: "No access", request_id: crypto.randomUUID() } }, { status: 403 });
  const svc = createSupabaseServiceClient();
  const { data } = await svc.from("conversations").select("*, contacts(phone_e164, display_name)").eq("business_id", businessId).order("last_message_at", { ascending: false }).limit(25);
  return NextResponse.json({ conversations: data ?? [] });
}
