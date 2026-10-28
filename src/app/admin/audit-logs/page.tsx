import { createSupabaseServiceClient } from "@/lib/db/supabase";
import { formatDateTime, titleCase } from "@/lib/format";

export default async function AdminAudit() {
  const { data } = await createSupabaseServiceClient().from("audit_logs").select("*, businesses(name)").order("created_at", { ascending: false }).limit(100);
  return <div className="dashboard-page"><header className="dashboard-heading"><div><p className="eyebrow">Security</p><h1>Audit logs</h1><p>Administrative and tenant configuration changes.</p></div></header><div className="table-card"><table><thead><tr><th>Action</th><th>Business</th><th>Resource</th><th>Time</th></tr></thead><tbody>{(data ?? []).map((log) => <tr key={log.id}><td>{titleCase(log.action)}</td><td>{Array.isArray(log.businesses) ? log.businesses[0]?.name : log.businesses?.name || "Platform"}</td><td>{titleCase(log.resource_type)}<small>{log.resource_id || "—"}</small></td><td>{formatDateTime(log.created_at)}</td></tr>)}</tbody></table></div></div>;
}
