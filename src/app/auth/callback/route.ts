import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/auth/paths";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/db/supabase";
import type { EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const requestedType = url.searchParams.get("type");
  const isRecovery = requestedType === "recovery" || url.searchParams.get("next") === "/reset-password";
  const next = safeNextPath(url.searchParams.get("next"), isRecovery ? "/reset-password" : "/onboarding");

  // Implicit recovery grants place tokens in the URL fragment, which is never
  // sent to a server route. Return a tiny same-origin bridge so the browser can
  // carry that fragment to the client reset page for Supabase to consume.
  if (isRecovery && !code && !tokenHash) {
    return new NextResponse(`<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>Continue password recovery</title></head><body><p>Continuing password recovery…</p><script>window.location.replace('/reset-password' + window.location.hash);</script><noscript><a href="/forgot-password">Request a new recovery link</a></noscript></body></html>`, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }

  if (code || (tokenHash && requestedType)) {
    const supabase = await createSupabaseServerClient();
    const result = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: requestedType as EmailOtpType });
    const { data, error } = result;
    if (!error && data.user) {
      const invitationId = data.user.user_metadata?.team_invitation_id;
      if (invitationId) {
        const svc = createSupabaseServiceClient();
        const { data: invitation } = await svc.from("team_invitations").select("*").eq("id", invitationId).eq("status", "pending").gt("expires_at", new Date().toISOString()).maybeSingle();
        if (invitation && invitation.email.toLowerCase() === data.user.email?.toLowerCase()) {
          await svc.from("memberships").upsert({ business_id: invitation.business_id, user_id: data.user.id, role: invitation.role }, { onConflict: "business_id,user_id" });
          await svc.from("profiles").upsert({ user_id: data.user.id, full_name: data.user.user_metadata?.full_name || data.user.email || "Team member", global_role: "user" });
          await svc.from("team_invitations").update({ status: "accepted", accepted_by_user_id: data.user.id, updated_at: new Date().toISOString() }).eq("id", invitation.id);
          await svc.auth.admin.updateUserById(data.user.id, { user_metadata: { ...data.user.user_metadata, team_invitation_id: null } });
        }
      }
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  const errorUrl = new URL(isRecovery ? "/forgot-password" : "/login", url.origin);
  errorUrl.searchParams.set("error", isRecovery ? "That recovery link is invalid or has expired. Request a new one." : "That sign-in link is invalid or has expired. Please try again.");
  return NextResponse.redirect(errorUrl);
}
