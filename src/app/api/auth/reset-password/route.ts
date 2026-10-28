import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/db/supabase";
import { passwordResetSchema } from "@/lib/validation/schemas";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { code: "validation", message: "Invalid JSON", request_id: crypto.randomUUID() } }, { status: 400 }); }
  const parsed = passwordResetSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "validation", message: "Use a password between 8 and 128 characters", request_id: crypto.randomUUID() } }, { status: 422 });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: { code: "recovery_session_missing", message: "This recovery link is invalid or has expired. Request a new one.", request_id: crypto.randomUUID() } }, { status: 401 });

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return NextResponse.json({ error: { code: "password_update_failed", message: error.message, request_id: crypto.randomUUID() } }, { status: 400 });

  await supabase.auth.signOut();
  return NextResponse.json({ updated: true });
}
