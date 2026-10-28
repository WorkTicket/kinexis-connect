import { redirect } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { getCurrentUser, getUserBusinesses } from "@/lib/auth/membership";
import { createSupabaseServiceClient } from "@/lib/db/supabase";

export default async function Analytics() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/app/analytics");
  const membership = (await getUserBusinesses(user.id))[0];
  if (!membership) redirect("/onboarding");
  const svc = createSupabaseServiceClient();
  const id = membership.business_id;
  const [{ count: calls }, { count: missed }, { count: outbound }, { count: inbound }, { count: delivered }] = await Promise.all([
    svc.from("calls").select("*", { count: "exact", head: true }).eq("business_id", id),
    svc.from("calls").select("*", { count: "exact", head: true }).eq("business_id", id).in("status", ["missed", "busy"]),
    svc.from("messages").select("*", { count: "exact", head: true }).eq("business_id", id).eq("direction", "outbound"),
    svc.from("messages").select("*", { count: "exact", head: true }).eq("business_id", id).eq("direction", "inbound"),
    svc.from("messages").select("*", { count: "exact", head: true }).eq("business_id", id).eq("direction", "outbound").in("status", ["sent", "delivered"]),
  ]);
  if (!calls && !outbound && !inbound) return <div className="dashboard-page"><header className="dashboard-heading"><div><p className="eyebrow">Performance</p><h1>Analytics</h1><p>Understand how missed calls turn into conversations.</p></div></header><EmptyState illustration="analytics" title="Nothing to measure yet" description="Analytics will appear after Connect starts handling calls." action="View your setup" href="/app/settings" /></div>;
  const replyRate = outbound ? Math.round(((inbound ?? 0) / outbound) * 100) : 0;
  const deliveryRate = outbound ? Math.round(((delivered ?? 0) / outbound) * 100) : 0;
  const max = Math.max(calls ?? 0, missed ?? 0, outbound ?? 0, inbound ?? 0, 1);
  const bars = [{ label: "All calls", value: calls ?? 0 }, { label: "Missed calls", value: missed ?? 0 }, { label: "Texts sent", value: outbound ?? 0 }, { label: "Replies", value: inbound ?? 0 }];
  return <div className="dashboard-page"><header className="dashboard-heading"><div><p className="eyebrow">Performance</p><h1>Analytics</h1><p>Lifetime activity for your current business.</p></div></header><div className="metric-grid"><article className="metric-card"><span>Calls</span><strong>{calls ?? 0}</strong></article><article className="metric-card"><span>Missed</span><strong>{missed ?? 0}</strong></article><article className="metric-card"><span>Reply rate</span><strong>{replyRate}%</strong></article><article className="metric-card"><span>Delivery rate</span><strong>{deliveryRate}%</strong></article></div><section className="dashboard-panel analytics-panel"><div className="panel-heading"><div><h2>Conversion activity</h2><p>Calls and conversations recorded by Connect.</p></div></div><div className="bar-chart">{bars.map((bar) => <div key={bar.label}><div><span>{bar.label}</span><strong>{bar.value}</strong></div><div className="bar-track"><span style={{ width: `${Math.max((bar.value / max) * 100, bar.value ? 4 : 0)}%` }} /></div></div>)}</div></section></div>;
}
