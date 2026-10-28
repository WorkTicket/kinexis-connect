import { createSupabaseServiceClient } from "@/lib/db/supabase";

export default async function AdminOverview() {
  const svc = createSupabaseServiceClient();
  const [{ count: businesses }, { count: activeSubscriptions }, { count: users }, { count: events }] = await Promise.all([
    svc.from("businesses").select("*", { count: "exact", head: true }),
    svc.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
    svc.from("profiles").select("*", { count: "exact", head: true }),
    svc.from("provider_events").select("*", { count: "exact", head: true }),
  ]);
  return <div className="dashboard-page"><header className="dashboard-heading"><div><p className="eyebrow">Platform</p><h1>Admin overview</h1><p>Operational status across KINEXIS Connect.</p></div></header><div className="metric-grid"><article className="metric-card"><span>Businesses</span><strong>{businesses ?? 0}</strong></article><article className="metric-card"><span>Active subscriptions</span><strong>{activeSubscriptions ?? 0}</strong></article><article className="metric-card"><span>User profiles</span><strong>{users ?? 0}</strong></article><article className="metric-card"><span>Provider events</span><strong>{events ?? 0}</strong></article></div></div>;
}
