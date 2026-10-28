import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getUserBusinesses } from "@/lib/auth/membership";
import { createSupabaseServiceClient } from "@/lib/db/supabase";
import { formatDateTime, formatPhone, titleCase } from "@/lib/format";

export default async function AppOverview() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/app");
  const membership = (await getUserBusinesses(user.id))[0];
  if (!membership) redirect("/onboarding");
  const svc = createSupabaseServiceClient();
  const businessId = membership.business_id;
  const [{ count: missed }, { count: texts }, { count: replies }, { data: recentCalls }, { data: settings }, { data: phone }, { data: integration }, { data: subscription }] = await Promise.all([
    svc.from("calls").select("*", { count: "exact", head: true }).eq("business_id", businessId).in("status", ["missed", "busy"]),
    svc.from("messages").select("*", { count: "exact", head: true }).eq("business_id", businessId).eq("direction", "outbound"),
    svc.from("messages").select("*", { count: "exact", head: true }).eq("business_id", businessId).eq("direction", "inbound"),
    svc.from("calls").select("id,caller_e164,status,started_at,sms_action").eq("business_id", businessId).order("started_at", { ascending: false }).limit(5),
    svc.from("business_settings").select("*").eq("business_id", businessId).maybeSingle(),
    svc.from("phone_numbers").select("*").eq("business_id", businessId).maybeSingle(),
    svc.from("phone_integrations").select("existing_phone_e164,forwarding_status").eq("business_id", businessId).maybeSingle(),
    svc.from("subscriptions").select("*").eq("business_id", businessId).maybeSingle(),
  ]);
  const sent = texts ?? 0;
  const replyCount = replies ?? 0;
  const replyRate = sent ? Math.round((replyCount / sent) * 100) : 0;
  const setup = [
    { label: "Subscription active", done: ["active", "trialing"].includes(subscription?.status) },
    { label: "Connect number assigned", done: Boolean(phone) },
    { label: "Business phone added", done: Boolean(integration?.existing_phone_e164) },
    { label: "Forwarding tests passed", done: integration?.forwarding_status === "verified" },
    { label: "Messaging compliance approved", done: settings?.sms_consent_review_status === "approved" && phone?.sms_registration_status === "approved" },
  ];
  const setupComplete = setup.filter((item) => item.done).length;

  return (
    <div className="dashboard-page">
      <header className="dashboard-heading"><div><p className="eyebrow">{membership.businesses?.name ?? "Your business"}</p><h1>Overview</h1><p>Track missed calls and the conversations Connect helps recover.</p></div><Link className="outline-button" href="/app/settings">Manage setup</Link></header>
      <div className="metric-grid">
        {[{ label: "Missed calls", value: missed ?? 0 }, { label: "Outbound texts", value: sent }, { label: "Customer replies", value: replyCount }, { label: "Reply rate", value: `${replyRate}%` }].map((metric) => <article className="metric-card" key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong></article>)}
      </div>
      <div className="dashboard-grid">
        <section className="dashboard-panel"><div className="panel-heading"><div><h2>Recent calls</h2><p>Latest activity for your Connect number.</p></div><Link href="/app/calls">View all</Link></div>
          {recentCalls?.length ? <div className="data-list">{recentCalls.map((call) => <div className="data-row" key={call.id}><div><strong>{formatPhone(call.caller_e164)}</strong><span>{formatDateTime(call.started_at)}</span></div><span className={`status-pill status-pill--${call.status}`}>{titleCase(call.status)}</span></div>)}</div> : <p className="panel-empty">No calls have been recorded yet.</p>}
        </section>
        <section className="dashboard-panel"><div className="panel-heading"><div><h2>Activation checklist</h2><p>{setupComplete} of {setup.length} steps complete</p></div></div>
          <div className="setup-progress"><span style={{ width: `${(setupComplete / setup.length) * 100}%` }} /></div>
          <ul className="setup-list">{setup.map((item) => <li key={item.label} className={item.done ? "is-done" : ""}><span>{item.done ? "✓" : setup.indexOf(item) + 1}</span>{item.label}</li>)}</ul>
          {setupComplete < setup.length ? <Link href={subscription?.status === "active" ? "/app/settings" : "/pricing"} className="brand-button">Continue setup</Link> : null}
        </section>
      </div>
    </div>
  );
}
