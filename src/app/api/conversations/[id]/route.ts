import { NextResponse } from "next/server";
import { conversationPatchSchema } from "@/lib/validation/schemas";
import { getCurrentUser, getUserBusinesses } from "@/lib/auth/membership";
import { createSupabaseServiceClient } from "@/lib/db/supabase";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { code: "unauthorized", message: "Not authenticated", request_id: crypto.randomUUID() } }, { status: 401 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { code: "validation", message: "Invalid JSON", request_id: crypto.randomUUID() } }, { status: 400 }); }
  const parsed = conversationPatchSchema.safeParse(body);
  if (!parsed.success || !Object.keys(parsed.data).length) return NextResponse.json({ error: { code: "validation", message: "Invalid update", request_id: crypto.randomUUID() } }, { status: 422 });
  const svc = createSupabaseServiceClient();
  const { data: conversation } = await svc.from("conversations").select("*").eq("id", id).maybeSingle();
  if (!conversation) return NextResponse.json({ error: { code: "not_found", message: "Conversation not found", request_id: crypto.randomUUID() } }, { status: 404 });
  if (!(await getUserBusinesses(user.id)).some((item) => item.business_id === conversation.business_id)) return NextResponse.json({ error: { code: "forbidden", message: "No access", request_id: crypto.randomUUID() } }, { status: 403 });
  const { data, error } = await svc.from("conversations").update({ ...parsed.data, updated_at: new Date().toISOString() }).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: { code: "server_error", message: "Conversation update failed", request_id: crypto.randomUUID() } }, { status: 500 });
  return NextResponse.json({ conversation: data });
}
