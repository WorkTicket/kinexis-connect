import { redirect } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { getCurrentUser, getUserBusinesses } from "@/lib/auth/membership";
import { createSupabaseServiceClient } from "@/lib/db/supabase";
import { formatDateTime, formatPhone, titleCase } from "@/lib/format";

export default async function Calls() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/app/calls");
  const membership = (await getUserBusinesses(user.id))[0];
  if (!membership) redirect("/onboarding");
  const { data: calls } = await createSupabaseServiceClient().from("calls").select("*").eq("business_id", membership.business_id).order("started_at", { ascending: false }).limit(100);
  return <div className="dashboard-page"><header className="dashboard-heading"><div><p className="eyebrow">Activity</p><h1>Calls</h1><p>Review every call attempt and its follow-up status.</p></div></header>{!calls?.length ? <EmptyState illustration="calls" title="No calls recorded yet" description="Once your Connect number is active, incoming call attempts will be listed here." action="Finish phone setup" href="/app/settings" /> : <div className="table-card"><table><thead><tr><th>Caller</th><th>Time</th><th>Outcome</th><th>Text action</th></tr></thead><tbody>{calls.map((call) => <tr key={call.id}><td>{formatPhone(call.caller_e164)}</td><td>{formatDateTime(call.started_at)}</td><td><span className={`status-pill status-pill--${call.status}`}>{titleCase(call.status)}</span></td><td>{titleCase(call.sms_action)}{call.sms_skip_reason ? <small>{titleCase(call.sms_skip_reason)}</small> : null}</td></tr>)}</tbody></table></div>}</div>;
}
