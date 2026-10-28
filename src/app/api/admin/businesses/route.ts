import { NextResponse } from "next/server";
import { getCurrentUser, isPlatformAdmin } from "@/lib/auth/membership";
import { createSupabaseServiceClient } from "@/lib/db/supabase";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { code: "unauthorized", message: "Not authenticated", request_id: crypto.randomUUID() } }, { status: 401 });
  if (!(await isPlatformAdmin(user.id))) return NextResponse.json({ error: { code: "forbidden", message: "Admin only", request_id: crypto.randomUUID() } }, { status: 403 });
  const svc = createSupabaseServiceClient();
  const { data } = await svc.from("businesses").select("*").order("created_at", { ascending: false }).limit(100);
  return NextResponse.json({ businesses: data ?? [] });
}
