import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/db/supabase";

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getMembership(businessId: string, userId: string) {
  const svc = createSupabaseServiceClient();
  const { data } = await svc.from("memberships").select("*").eq("business_id", businessId).eq("user_id", userId).maybeSingle();
  return data;
}

export type UserBusiness = {
  business_id: string;
  role: "owner" | "manager" | "agent";
  businesses?: {
    id: string;
    name: string;
    industry: string | null;
    timezone: string;
    status: string;
  } | null;
};

export async function getUserBusinesses(userId: string): Promise<UserBusiness[]> {
  const svc = createSupabaseServiceClient();
  const { data } = await svc.from("memberships").select("business_id, role, businesses(id,name,industry,timezone,status)").eq("user_id", userId).order("created_at", { ascending: true });
  return (data ?? []) as unknown as UserBusiness[];
}

export async function isPlatformAdmin(userId: string) {
  const svc = createSupabaseServiceClient();
  const { data } = await svc.from("profiles").select("global_role").eq("user_id", userId).maybeSingle();
  return data?.global_role === "platform_admin";
}
