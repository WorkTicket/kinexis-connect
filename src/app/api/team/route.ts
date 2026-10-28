import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, getMembership } from "@/lib/auth/membership";
import { createSupabaseServiceClient } from "@/lib/db/supabase";
import { hasAvailableTeamSeat } from "@/lib/team/access";

const inviteSchema = z.object({ business_id: z.string().uuid(), email: z.string().email(), role: z.enum(["manager", "agent"]) });

async function authorize(businessId: string, roles: string[]) {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: { code: "unauthorized", message: "Not authenticated", request_id: crypto.randomUUID() } }, { status: 401 }) };
  const membership = await getMembership(businessId, user.id);
  if (!membership || !roles.includes(membership.role)) return { error: NextResponse.json({ error: { code: "forbidden", message: "Insufficient role", request_id: crypto.randomUUID() } }, { status: 403 }) };
  return { user, membership };
}

export async function GET(req: Request) {
  const businessId = new URL(req.url).searchParams.get("business_id");
  if (!businessId) return NextResponse.json({ error: { code: "validation", message: "business_id required", request_id: crypto.randomUUID() } }, { status: 422 });
  const auth = await authorize(businessId, ["owner", "manager"]);
  if (auth.error) return auth.error;
  const svc = createSupabaseServiceClient();
  const [{ data: memberships }, { data: invitations }] = await Promise.all([
    svc.from("memberships").select("id,user_id,role,created_at").eq("business_id", businessId).order("created_at"),
    svc.from("team_invitations").select("id,email,role,status,expires_at,created_at").eq("business_id", businessId).eq("status", "pending").order("created_at", { ascending: false }),
  ]);
  const ids = (memberships ?? []).map((item) => item.user_id);
  const { data: profiles } = ids.length ? await svc.from("profiles").select("user_id,full_name").in("user_id", ids) : { data: [] };
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.user_id, profile.full_name]));
  return NextResponse.json({ members: (memberships ?? []).map((item) => ({ ...item, full_name: profileMap.get(item.user_id) || "Team member" })), invitations: invitations ?? [], current_user_id: auth.user!.id, current_role: auth.membership.role });
}

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { code: "validation", message: "Invalid JSON", request_id: crypto.randomUUID() } }, { status: 400 }); }
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "validation", message: "Invalid invitation", request_id: crypto.randomUUID() } }, { status: 422 });
  const auth = await authorize(parsed.data.business_id, ["owner"]);
  if (auth.error) return auth.error;
  const svc = createSupabaseServiceClient();
  const [{ data: subscription }, { count: memberCount }, { count: inviteCount }] = await Promise.all([
    svc.from("subscriptions").select("plan,status").eq("business_id", parsed.data.business_id).maybeSingle(),
    svc.from("memberships").select("*", { count: "exact", head: true }).eq("business_id", parsed.data.business_id),
    svc.from("team_invitations").select("*", { count: "exact", head: true }).eq("business_id", parsed.data.business_id).eq("status", "pending"),
  ]);
  if (!subscription || !["active", "trialing"].includes(subscription.status)) return NextResponse.json({ error: { code: "subscription_required", message: "An active subscription is required", request_id: crypto.randomUUID() } }, { status: 403 });
  if (!hasAvailableTeamSeat(subscription.plan, memberCount ?? 0, inviteCount ?? 0)) return NextResponse.json({ error: { code: "seat_limit", message: "Your plan's team member limit has been reached", request_id: crypto.randomUUID() } }, { status: 409 });
  const { data: invitation, error: insertError } = await svc.from("team_invitations").insert({ business_id: parsed.data.business_id, email: parsed.data.email.toLowerCase(), role: parsed.data.role, invited_by_user_id: auth.user!.id }).select().single();
  if (insertError || !invitation) return NextResponse.json({ error: { code: "conflict", message: "That email already has a pending invitation", request_id: crypto.randomUUID() } }, { status: 409 });
  let existingUser: { id: string; email?: string } | undefined;
  for (let page = 1; !existingUser; page += 1) {
    const { data: usersPage, error: usersError } = await svc.auth.admin.listUsers({ page, perPage: 1000 });
    if (usersError) break;
    existingUser = usersPage.users.find((candidate) => candidate.email?.toLowerCase() === parsed.data.email.toLowerCase());
    if (usersPage.users.length < 1000) break;
  }
  if (existingUser) {
    const { error: membershipError } = await svc.from("memberships").insert({ business_id: parsed.data.business_id, user_id: existingUser.id, role: parsed.data.role });
    if (membershipError) {
      await svc.from("team_invitations").delete().eq("id", invitation.id);
      return NextResponse.json({ error: { code: "conflict", message: "That user is already a team member", request_id: crypto.randomUUID() } }, { status: 409 });
    }
    await svc.from("team_invitations").update({ status: "accepted", accepted_by_user_id: existingUser.id, updated_at: new Date().toISOString() }).eq("id", invitation.id);
    await svc.from("audit_logs").insert({ actor_user_id: auth.user!.id, business_id: parsed.data.business_id, action: "team.added", resource_type: "membership", resource_id: existingUser.id, metadata: { email: parsed.data.email, role: parsed.data.role } });
    return NextResponse.json({ invitation: { ...invitation, status: "accepted" }, existing_user: true }, { status: 201 });
  }
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/app`;
  const { error: inviteError } = await svc.auth.admin.inviteUserByEmail(parsed.data.email, { redirectTo, data: { team_invitation_id: invitation.id } });
  if (inviteError) {
    await svc.from("team_invitations").delete().eq("id", invitation.id);
    return NextResponse.json({ error: { code: "email_failed", message: "The invitation email could not be sent", request_id: crypto.randomUUID() } }, { status: 502 });
  }
  await svc.from("audit_logs").insert({ actor_user_id: auth.user!.id, business_id: parsed.data.business_id, action: "team.invited", resource_type: "team_invitation", resource_id: invitation.id, metadata: { email: parsed.data.email, role: parsed.data.role } });
  return NextResponse.json({ invitation }, { status: 201 });
}

export async function DELETE(req: Request) {
  let body: { business_id?: string; invitation_id?: string; membership_id?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: { code: "validation", message: "Invalid JSON", request_id: crypto.randomUUID() } }, { status: 400 }); }
  if (!body.business_id || (!body.invitation_id && !body.membership_id)) return NextResponse.json({ error: { code: "validation", message: "Invalid removal request", request_id: crypto.randomUUID() } }, { status: 422 });
  const auth = await authorize(body.business_id, ["owner"]);
  if (auth.error) return auth.error;
  const svc = createSupabaseServiceClient();
  if (body.invitation_id) await svc.from("team_invitations").update({ status: "revoked", updated_at: new Date().toISOString() }).eq("id", body.invitation_id).eq("business_id", body.business_id);
  if (body.membership_id) {
    const { data: target } = await svc.from("memberships").select("user_id,role").eq("id", body.membership_id).eq("business_id", body.business_id).maybeSingle();
    if (!target || target.role === "owner" || target.user_id === auth.user!.id) return NextResponse.json({ error: { code: "forbidden", message: "The owner cannot be removed", request_id: crypto.randomUUID() } }, { status: 403 });
    await svc.from("memberships").delete().eq("id", body.membership_id);
  }
  return NextResponse.json({ removed: true });
}
