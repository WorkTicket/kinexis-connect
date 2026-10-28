import { createSupabaseServiceClient } from "@/lib/db/supabase";
import { formatDateTime, titleCase } from "@/lib/format";

export default async function AdminActivity() {
  const { data } = await createSupabaseServiceClient().from("provider_events").select("*").order("created_at", { ascending: false }).limit(100);
  return <div className="dashboard-page"><header className="dashboard-heading"><div><p className="eyebrow">Integrations</p><h1>Provider activity</h1><p>Webhook and provider event processing.</p></div></header><div className="table-card"><table><thead><tr><th>Provider</th><th>Event</th><th>Status</th><th>Received</th></tr></thead><tbody>{(data ?? []).map((event) => <tr key={event.id}><td>{titleCase(event.provider)}</td><td><strong>{event.event_type || "Unknown event"}</strong><small>{event.event_key}</small></td><td><span className={`status-pill status-pill--${event.status}`}>{titleCase(event.status)}</span></td><td>{formatDateTime(event.created_at)}</td></tr>)}</tbody></table></div></div>;
}
